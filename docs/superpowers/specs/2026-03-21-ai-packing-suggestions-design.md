# AI Packing Suggestions — Design Spec

## Goal

Add AI-powered packing suggestions to the existing packing list feature. When a user opens their packing list, the system analyzes their trip itinerary (destination, dates, activities) and generates contextual packing recommendations via AWS Bedrock (Claude). Suggestions appear as inline chips that users can accept or dismiss.

## Core Decisions

- **AI backend:** AWS Bedrock with Claude 3 Haiku (`anthropic.claude-3-haiku-20240307-v1:0`). Already available in the infra — same `InvokeModel` pattern used for Titan embeddings, just a different model. Fast and cheap for structured list generation.
- **Trigger:** Auto-generate on first visit when the packing list is empty AND no suggestions exist. Plus a manual "Suggest items" button for subsequent requests.
- **Presentation:** Inline suggestion chips within each category section, visually distinct from committed packing items (dashed border, muted styling, reason label).
- **Persistence:** Supabase `packing_suggestions` table. Suggestions are persisted so collaborators see the same recommendations, accepted/dismissed state is tracked, and Bedrock isn't called redundantly.
- **Context sent to LLM:** Destination, trip dates/duration, number of travelers, activity categories + names, and already-packed items (to avoid duplicates).

## Database Schema

### `packing_suggestions`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| trip_id | uuid | NO | FK -> trips.id ON DELETE CASCADE |
| user_id | uuid | NO | who triggered the generation |
| name | text | NO | — |
| category | text | NO | 'essentials' |
| reason | text | NO | short explanation (e.g., "Hiking on Day 2") |
| status | text | NO | 'pending' |
| created_at | timestamptz | NO | now() |

**Valid `status` values:** `pending`, `accepted`, `dismissed`

**Indexes:**
- `packing_suggestions_trip_id_idx` on `(trip_id)`
- `packing_suggestions_trip_status_idx` on `(trip_id, status)`

**RLS policies:** Trip owner and collaborators can read/write. Since the table has `user_id`, the SELECT policy checks `auth.uid() = user_id OR` the user is the trip owner (`EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_id AND trips.user_id = auth.uid())`) or a collaborator (`EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_collaborators.trip_id = packing_suggestions.trip_id AND trip_collaborators.user_id = auth.uid())`). Same pattern as `packing_items`.

**No Realtime needed.** Suggestions are generated once per request. When a user accepts a suggestion, the resulting packing item appears to collaborators via the existing `packing_items` Realtime subscription. The suggestion status change (`pending` -> `accepted`) is a local concern — other users don't need to see suggestion chips update in real-time.

## Lambda Endpoint

### `POST /packing-suggest`

POST is used because this endpoint has side effects (inserts rows into `packing_suggestions`).

**Request body (JSON):**
- `tripId` (required) — the trip to generate suggestions for
- `refresh` (optional, boolean) — if `true`, generate new suggestions even if pending ones exist

**Auth:** JWT validation via `validateAuth()` (same pattern as all other endpoints).

**Rate limiting:** Before calling Bedrock, check the `created_at` of the most recent suggestion for this trip. If a suggestion was created less than 2 minutes ago and `refresh` is true, return the existing pending suggestions without calling Bedrock. This prevents spamming the "Suggest more" button.

**Flow:**

1. Validate JWT, extract `userId`
2. Create Supabase client with service key
3. If `refresh` is not `true`:
   - Query `packing_suggestions` for `trip_id` where `status = 'pending'`
   - If rows exist, return them immediately (no Bedrock call)
4. Rate limit check: if most recent suggestion `created_at` is < 2 minutes ago, return existing pending suggestions
5. Fetch trip context from Supabase:
   - `trips` table: destination, start_date, end_date, travelers
   - `activity` table (note: raw table name, not the `activities` view): `activity_name`, `activity_type`, `notes` for all activities in the trip
   - `packing_items` table: names of already-packed items
   - `packing_suggestions` table: names of already-suggested items (to avoid duplicates on refresh)
6. Build prompt with trip context (see Prompt Design below)
7. Call Bedrock `InvokeModel` with Claude 3 Haiku
8. Parse JSON response into `{ name, category, reason }[]`
9. Insert new suggestions into `packing_suggestions` table (with `user_id` from the JWT)
10. Return the newly created suggestions

**Response shape:**
```json
{
  "suggestions": [
    { "id": "uuid", "name": "Hiking boots", "category": "clothing", "reason": "Trail hike on Day 3", "status": "pending", "created_at": "..." },
    ...
  ]
}
```

**Error handling:**
- 400 if `tripId` missing
- 401 if token invalid
- 429 if rate limited (< 2 minutes since last generation)
- 500 on Bedrock or Supabase errors (log error, return generic message)
- If Bedrock returns unparseable output, return empty suggestions array (graceful degradation)

### Infra Changes

**`infra/api.ts`** — Add route:
```
api.route('POST /packing-suggest', {
  handler: 'services/packing-suggest.handler',
  link: [supabaseSecretKey, supabaseUrl],
  permissions: [{
    actions: ['bedrock:InvokeModel'],
    resources: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'],
  }],
})
```

No new secrets needed — Bedrock uses IAM, and Supabase keys are already linked.

## Prompt Design

The Lambda builds a system + user message for Claude via the Bedrock Messages API.

**Bedrock request body:**
```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "system": "<system message below>",
  "messages": [
    { "role": "user", "content": "<user message below>" }
  ],
  "max_tokens": 1024,
  "temperature": 0.3
}
```

**System message:**
```
You are a travel packing assistant. Given a trip itinerary, suggest practical items to pack. Return ONLY a JSON array of objects with keys: name (string), category (one of: clothing, toiletries, electronics, documents, accessories, essentials), reason (short phrase explaining why, referencing specific activities or conditions). Suggest 10-15 items. Be specific and practical — prefer "Rain jacket" over "Outerwear". Do not suggest items the user already has.
```

**User message (constructed from trip context):**
```
Trip to {destination}
Dates: {start_date} to {end_date} ({duration} days)
Travelers: {travelers}

Activities:
- {activity_name} ({activity_type}), {activity_name} ({activity_type})
- {activity_name} ({activity_type})
...

Already packed: {comma-separated list of existing item names}
Already suggested: {comma-separated list of previously suggested item names}
```

Note: Activities are fetched from the `activity` table using columns `activity_name` and `activity_type` (the raw table schema used by Lambda services with the service key).

**Bedrock invocation:**
- Model: `anthropic.claude-3-haiku-20240307-v1:0`
- Uses `BedrockRuntimeClient` + `InvokeModelCommand` from `@aws-sdk/client-bedrock-runtime` (same pattern as `services/lib/embeddings.ts`)
- `contentType: 'application/json'`, `accept: 'application/json'`
- Response body decoded with `TextDecoder`, parsed as JSON, then extract `content[0].text` from the Messages API response

**Parsing:** The Lambda extracts the JSON array from Claude's `content[0].text` response. If the response contains markdown code fences (```json ... ```), strip them. Validate each item has `name`, `category`, and `reason`. Filter out any items whose `category` is not in `PACKING_CATEGORIES`. Cap at 15 suggestions per request.

## Types

```ts
interface PackingSuggestion {
  id: string
  trip_id: string
  user_id: string
  name: string
  category: PackingCategory
  reason: string
  status: 'pending' | 'accepted' | 'dismissed'
  created_at: string
}
```

Added to `packages/shared/src/types/index.ts` and re-exported from the barrel.

## Service Layer

### `packages/shared/src/services/packingService.ts`

Add three new functions:

- `fetchPackingSuggestions(tripId: string): Promise<PackingSuggestion[]>` — fetches suggestions where `status = 'pending'`, ordered by category then created_at
- `updateSuggestionStatus(suggestionId: string, status: 'accepted' | 'dismissed'): Promise<void>` — updates a single suggestion's status
- `dismissAllSuggestions(tripId: string): Promise<void>` — bulk dismiss all pending suggestions for a trip (used by `acceptAll` after all individual accepts, and available for a future "Dismiss all" button)

Re-export all new functions from `packages/shared/src/services/index.ts` using explicit named exports.

## Client Hook

### `packages/shared/src/hooks/usePackingSuggestions.ts`

**`usePackingSuggestions(tripId, items, addItem)`**

Parameters:
- `tripId: string | undefined`
- `items: DbPackingItem[]` — current packing items (from `usePackingList`)
- `addItem: (name: string, category: PackingCategory) => void` — from `usePackingList`

The hook takes `addItem` as a parameter to keep `usePackingSuggestions` decoupled from `usePackingList` internals — it receives a callback rather than importing the service directly. If `usePackingList`'s `addItem` signature changes, the call site in `PackingPanel`/`PackingPage` updates accordingly.

Returns:
- `suggestions: PackingSuggestion[]` — pending suggestions
- `suggestionsByCategory: Record<string, PackingSuggestion[]>` — grouped by category
- `isLoading: boolean` — fetching existing suggestions
- `isGenerating: boolean` — actively calling the suggest endpoint
- `generateSuggestions(): void` — trigger suggestion generation (manual "Suggest items")
- `acceptSuggestion(id: string): void` — mark as accepted + call `addItem`
- `dismissSuggestion(id: string): void` — mark as dismissed with optimistic update
- `acceptAll(): void` — accept all pending suggestions sequentially; if one fails, continue accepting the rest (best-effort, no rollback of already-accepted items)

**React Query key:** `['packingSuggestions', tripId]`

**Data flow:** The suggestions query uses `fetchPackingSuggestions` (direct Supabase query) as its `queryFn`. The `generateSuggestions` mutation calls the Lambda endpoint, then invalidates the `['packingSuggestions', tripId]` query key — the Lambda response is not used directly; instead, the invalidation triggers a refetch via the Supabase query. This keeps the data source consistent.

**Auto-generate logic:** Uses a `useEffect` that fires when:
1. `tripId` is set
2. Items query has loaded (not loading)
3. `items.length === 0` (empty packing list)
4. `suggestions.length === 0` (no existing suggestions, including dismissed — checked via the query which only returns `status = 'pending'`)
5. Has not already attempted generation in this mount (ref guard — uses `useRef(false)`, set to `true` before calling generate, persists across React 18+ Strict Mode double-mount)

When all conditions are true, calls `generateSuggestions()` automatically.

**Generate flow:**
1. Set `isGenerating = true` (via mutation state)
2. Call `POST /packing-suggest` with `{ tripId }` (first time) or `{ tripId, refresh: true }` (manual "Suggest more")
3. On success, invalidate the `['packingSuggestions', tripId]` query key
4. `isGenerating` resets to `false` when mutation settles

The API base URL is `NEXT_PUBLIC_RECOMMENDATION_API_URL` (same env var used by `useSuggestions` and other API hooks). Auth token is obtained from the Supabase session.

**Accept flow:**
1. Optimistically remove suggestion from local cache (`queryClient.setQueryData`)
2. Call `updateSuggestionStatus(id, 'accepted')` via Supabase
3. Call `addItem(suggestion.name, suggestion.category)` to create the real packing item
4. On error, roll back optimistic update

**Dismiss flow:**
1. Optimistically remove suggestion from local cache
2. Call `updateSuggestionStatus(id, 'dismissed')` via Supabase
3. On error, roll back

**Race condition prevention:** The "Suggest items" button is disabled when `isGenerating` is `true`. The auto-generate effect's ref guard prevents double-firing in Strict Mode. The Lambda's rate limit (2-minute cooldown) provides server-side protection.

Re-export from `packages/shared/src/hooks/index.ts` and `packages/shared/src/index.ts`.

## Component Architecture

### New Component: `SuggestionChip`

**File:** `apps/web/components/packing/SuggestionChip.tsx`

A single suggestion item, visually distinct from `PackingItem`:
- Dashed border with muted background (`border-dashed border-[var(--cal-border)] bg-[var(--cal-surface)]/50`)
- Item name in normal weight (vs semibold for committed items)
- Small "reason" label below the name in muted text (`text-[11px] text-[var(--cal-text-muted)]`)
- `Plus` icon button on the left to accept (from `iconoir-react`)
- `Xmark` icon button on the right to dismiss (from `iconoir-react`)
- Hover state highlights the chip slightly

**Props:**
```ts
interface SuggestionChipProps {
  suggestion: PackingSuggestion
  onAccept: (id: string) => void
  onDismiss: (id: string) => void
}
```

### Modified: `PackingCategoryList`

Updated to accept optional `suggestionsByCategory` and suggestion action handlers. Within each category section, after the real items, render suggestion chips for that category. Categories that have only suggestions (no real items) also appear in the list.

**New props added:**
```ts
interface PackingCategoryListProps {
  itemsByCategory: Record<string, DbPackingItem[]>
  suggestionsByCategory?: Record<string, PackingSuggestion[]>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onAcceptSuggestion?: (id: string) => void
  onDismissSuggestion?: (id: string) => void
}
```

The category list now computes visible categories as the union of categories with items and categories with suggestions. The empty state changes when `isGenerating` is true: show a shimmer skeleton instead of "No items yet".

### Modified: `PackingCategory`

Updated to accept optional `suggestions` array and render `SuggestionChip` components after the real items within the accordion.

### Modified: `PackingPanel` and `PackingPage`

Both wrappers:
1. Call `usePackingSuggestions(tripId, items, addItem)` alongside `usePackingList`
2. Pass `suggestionsByCategory`, `onAcceptSuggestion`, `onDismissSuggestion` to `PackingCategoryList`
3. Render a "Suggest items" button below the category list that calls `generateSuggestions()`
4. Show a generating state (spinner + "Generating suggestions...") when `isGenerating` is true

**"Suggest items" button:**
- Positioned below the category list
- Subtle styling: text button with `Sparks` icon from `iconoir-react`
- Disabled while `isGenerating`
- Label changes to "Suggest more" when suggestions have been previously generated (check: has the generate mutation been called, or do dismissed suggestions exist)

### File Locations

```
services/
└── packing-suggest.ts               <- new Lambda handler

infra/
└── api.ts                            <- add POST /packing-suggest route

packages/shared/src/
├── types/index.ts                    <- add PackingSuggestion interface
├── services/packingService.ts        <- add suggestion fetch/update functions
├── services/index.ts                 <- re-export new functions (explicit named exports)
├── hooks/usePackingSuggestions.ts     <- new hook
├── hooks/index.ts                    <- re-export new hook
└── index.ts                          <- re-export new hook

apps/web/components/packing/
├── SuggestionChip.tsx                <- new component
├── PackingCategoryList.tsx           <- modified (render suggestions per category)
├── PackingCategory.tsx               <- modified (accept suggestions prop)
├── PackingPanel.tsx                  <- modified (wire up suggestions hook + button)
└── PackingPage.tsx                   <- modified (wire up suggestions hook + button)
```

## Out of Scope

- Weather API integration (could enhance suggestions with forecast data — future enhancement)
- Per-user suggestion preferences or profiles
- Suggestion voting/ranking by collaborators
- Bedrock model selection UI (hardcoded to Haiku)
- Suggestion editing (user can dismiss and manually add a modified version)
- Mobile app implementation (web first)
- Caching suggestions in DynamoDB (Supabase persistence is sufficient)
- "Dismiss all" button in v1 (service function exists for future use)
