# Personalized For You Recommendations — Phase 1 Design

**Issue:** TRA-245
**Branch:** `feature/tra-245`
**Date:** 2026-03-22

## Goal

Add personalized re-ranking to the For You panel so suggestions reflect each user's actual interests. Phase 1 uses a lightweight affinity system built on existing EventBridge interaction events. No ML infrastructure required.

## Architecture Overview

```
useInteractionTracking (+ category field)
    |
    v
POST /interact (Lambda) → EventBridge
    |
    v
processInteraction subscriber (NEW)
    |
    ├── Write raw event to UserInteractions table
    └── Atomic update AFFINITY aggregate row

useSuggestions → GET /recommend (NEW Lambda)
    |
    ├── searchPlaces() via SerpAPI (+ DynamoDB cache)
    ├── Load AFFINITY row from UserInteractions
    ├── Re-score: serpRelevance * 0.6 + categoryAffinity * 0.4
    └── Return sorted SuggestionCard[] with reason field
```

## Data Model

### UserInteractions DynamoDB Table

Single-table design with two row types:

| Row Type | `pk` | `sk` | Fields |
|----------|------|------|--------|
| Raw event | `USER#{userId}` | `INT#{timestamp}#{ulid}` | `suggestionId`, `action`, `category`, `tripId`, `expiresAt` (90-day TTL) |
| Affinity aggregate | `USER#{userId}` | `AFFINITY` | `categoryScores: { dining: 2.4, sightseeing: 1.1, ... }`, `lastUpdated` |

**Table config:**
- Partition key: `pk` (string)
- Sort key: `sk` (string)
- TTL attribute: `expiresAt` (only set on raw event rows)

### Affinity Scoring Weights

| Action | Weight |
|--------|--------|
| `impression` | +0.1 |
| `click` | +0.3 |
| `drag` | +1.0 |
| `dismiss` | -0.5 |

Category scores are floored at 0 (no negative affinities in Phase 1).

## Components

### 1. EventBridge Subscriber — `services/processInteraction.ts`

**Trigger:** `InteractionBus` subscription via `bus.subscribe()`. SST v4 Bus delivers all events to the subscriber — the handler receives the full EventBridge envelope and can filter by `detail-type` if needed, but since `InteractionBus` only carries `suggestion.interaction` events, no filtering is required.

**Input event detail:**
```typescript
{
  userId: string
  suggestionId: string
  action: 'impression' | 'click' | 'drag' | 'dismiss'
  category: string  // NEW — added to event payload (e.g. 'dining', 'sightseeing')
  tripId: string
  timestamp: string
}
```

**Handler flow:**
1. Parse event detail
2. Compute weight from action type using weight map
3. Write raw event row with 90-day TTL
4. Atomic `UpdateItem` on AFFINITY row using a single conditional expression:
   - Use `ADD` to increment the category score
   - Use a `ConditionExpression` with `if_not_exists` + arithmetic to prevent scores going below 0
   - If the condition fails (score would go negative), use `SET` to explicitly set the score to 0
   - This avoids the race condition of a two-step read-then-write

**Error handling:** Log and swallow — interaction processing is best-effort. DLQ on the EventBridge subscription for retry of persistent failures.

### 2. Recommend Endpoint — `services/recommend.ts`

**Route:** `GET /recommend?destination=X&category=Y&start=Z`

**Auth:** JWT validation via `validateAuth()` (from `services/lib/auth.ts`).

**Handler flow:**
1. Validate JWT, extract `userId`
2. Parse query params: `destination`, `category`, `start`
3. Fetch suggestions via `searchPlaces()` from `services/lib/serpapi.ts` and cache via `getCachedSuggestions()`/`setCachedSuggestions()` from `services/lib/cache.ts` — same shared modules used by `services/suggest.ts`, imported directly (no code duplication)
4. Load user's AFFINITY row from `UserInteractions` table
5. If no affinity data: return suggestions as-is (cold-start fallback, identical to current behavior)
6. If affinity data exists:
   a. Normalize category scores: divide each by the max score across all categories (0–1 range)
   b. For each suggestion: look up its `category` in the normalized affinity map. If the category has no affinity entry, treat affinity as 0 (neutral — no boost or penalty)
   c. SerpAPI `relevanceScore` is already 0–1 (computed as `1 - index * 0.05` in `serpapi.ts:toSuggestionCard`). Compute: `finalScore = relevanceScore * 0.6 + normalizedCategoryAffinity * 0.4`
   d. Sort by `finalScore` descending
   e. Populate `reason` on results where `normalizedCategoryAffinity > 0.5`: `"Matches your interest in {category}"`
7. Return paginated results: apply `start` offset and return 20 items from the re-ranked list. Re-ranking happens on the full result set before pagination to ensure consistent ordering across pages.
8. Response shape: `{ suggestions: SuggestionCard[] }` — identical to `/suggest`

**Linked resources:** `RecommendationCache`, `UserInteractions`, `SupabaseSecretKey`, `SupabaseUrl`, `SerpApiKey`

### 3. Interaction Payload Change

**`services/lib/types.ts`:**
- Add `category?: string` to `InteractRequest` (optional for backwards compatibility with any in-flight requests)

**`services/interact.ts`:**
- Destructure `category` from the request body
- Pass `category` through to the EventBridge event detail

**`apps/web/components/calendar/hooks/useInteractionTracking.ts`:**
- Update `trackEvent` signature from `(suggestionId: string, action: InteractionAction)` to `(suggestionId: string, action: InteractionAction, category: string)` — third positional parameter
- Include `category` in the POST body

**Call sites:**
- `ForYouPanel.tsx` / `SuggestionCard.tsx`:
  - `onVisible` (impression): pass `card.category`
  - `onClick` (click): pass `card.category`
  - `onDismiss` (dismiss): pass `card.category`
- `CalendarDashboard.tsx` line 115:
  - `trackEvent(suggestionId, 'drag')` → `trackEvent(suggestionId, 'drag', activity.category)` — the category is available from the `CalendarActivity` being created from the suggestion

### 4. Frontend Fetch Change — `apps/web/components/calendar/hooks/useSuggestions.ts`

- Change `fetchSuggestions()` to call `${process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL}/recommend` instead of `/api/suggest`
- Add JWT auth header: call `supabase.auth.getSession()` inside `fetchSuggestions()` to get the access token, same pattern already used in `useInteractionTracking.ts` (which imports `supabase` from `@travyl/shared`)
- Add `Authorization: Bearer ${token}` header to the fetch call
- If no session/token available, fall back to calling `/api/suggest` (unauthenticated, unranked) so logged-out browsing still works
- Response shape is identical (`{ suggestions: SuggestionCard[] }`), so all downstream rendering, filtering, and drag-and-drop continue to work unchanged
- The `SuggestionCard` type is imported from `../types` (calendar-local types file) which re-exports the same interface as `@travyl/shared` — no type mismatch risk

### 5. Reason Badge — `apps/web/components/calendar/SuggestionCard.tsx`

- If `reason` is present on the card, render a small muted text line below the category tag in the card footer
- Styling: small font, muted color, single line — not a major UI element

## SST Infrastructure Changes

### `infra/storage.ts`
```typescript
export const userInteractions = new sst.aws.Dynamo('UserInteractions', {
  fields: { pk: 'string', sk: 'string' },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
})
```

### `infra/events.ts`
```typescript
bus.subscribe('services/processInteraction.handler', {
  link: [userInteractions],
})
```

### `infra/api.ts`
```
New: GET /recommend route
  - Handler: services/recommend.handler
  - Linked: RecommendationCache, UserInteractions, SupabaseSecretKey, SupabaseUrl, SerpApiKey
```

## What's NOT Changing

- `ForYouPanel.tsx` layout, search, category filters, infinite scroll, drag-and-drop
- `CalendarDashboard.tsx` integration
- `SuggestionCard` type definition (already has `reason?: string`)
- `/suggest` endpoint (stays as-is for future mobile use)
- `/api/suggest` Next.js route (kept as fallback for unauthenticated users, can be deprecated later)
- Client-side search/filter logic in `useSuggestions`

## Cold Start Behavior

New users with no interaction history get the current experience: SerpAPI results in default rank order. No special handling, no synthetic data. Personalization kicks in organically as the user interacts with suggestions.

## Testing Strategy

- Unit test affinity weight calculation and score normalization
- Unit test re-ranking logic (verify order changes with affinity data, verify unmatched categories get affinity 0)
- Unit test floor-at-zero behavior for dismiss actions
- Integration test: EventBridge event → DynamoDB writes (raw + aggregate)
- Manual E2E: interact with suggestions, verify subsequent page loads reflect changed ranking
