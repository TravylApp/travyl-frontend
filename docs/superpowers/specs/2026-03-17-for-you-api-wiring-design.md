# For You Panel — Amazon Location + Foursquare API Wiring

**Date:** 2026-03-17
**Branch:** feature/tra-204
**Status:** Approved

## Goal

Replace mock data in the For You panel with real suggestions from the deployed SST backend. Amazon Location Services discovers POIs for a trip's destination; Foursquare enriches each result with photos, ratings, prices, and descriptions. Interaction tracking captures user behavior for future personalization.

## Architecture

```
Frontend (Next.js)                          Backend (SST Lambda)
──────────────────                          ────────────────────
CalendarDashboard
  └─ ForYouPanel(destination)
       ├─ useSuggestions({ destination })
       │   React Query fetch               GET /suggest?destination=Paris
       │   + client-side search/filter        1. Validate Supabase JWT
       │                                      2. Check DynamoDB cache (per-user, 30min TTL)
       │                                      3. Cache miss:
       │                                         a. Amazon Location → SuggestionCard[]
       │                                         b. Foursquare → enrich each card
       │                                            (photos, rating, price, desc)
       │                                         c. Cache enriched results
       │                                      4. Return SuggestionCard[]
       │
       ├─ SuggestionCards (no changes)
       │
       └─ useInteractionTracking
            POST /interact                 Validate JWT → EventBridge
            fire-and-forget                (data capture, no subscribers yet)
```

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Enrichment source | Foursquare Places API | Good global coverage, photos/ratings/prices, reasonable cost |
| Enrichment location | Lambda-side with DynamoDB cache | Keeps frontend simple; first request ~2-3s, repeat requests instant |
| Cache strategy | Per-user, 30min TTL (existing scheme) | Matches current `cache.ts` — key is `${userId}:${destination}`, sk `suggestions` |
| Search behavior | Destination-aware only, client-side filtering | Panel loads suggestions for trip destination; search box filters client-side |
| Auth | JWT required on `/suggest` | Sets up pattern for future personalization |
| Interaction tracking | Yes, fire-and-forget to `/interact` | Captures data from day one; no UI impact |

## Backend Changes (3 files + 1 infra file)

### `services/lib/foursquare.ts` (new)

Foursquare Places API client for enrichment.

- **`enrichSuggestions(suggestions: SuggestionCard[]): Promise<SuggestionCard[]>`**
  - Takes the `SuggestionCard[]` already returned by `searchPlaces()` in `location.ts` (which has name, coords, category but empty `imageUrl`, null `rating`, null `price`)
  - For each card: call Foursquare Place Match endpoint using `name` + `ll` (lat/lng already on the card)
  - On match: update `imageUrl` (first photo URL), `rating` (normalize 10→5 scale), `price` (tier 1-4 → number estimate), `description` (first tip text)
  - On no match: leave fields as-is (empty imageUrl, null rating/price, empty description) — card still renders
  - Foursquare API key read from `Resource.FoursquareApiKey.value`

### `services/suggest.ts` (modified)

Add JWT auth and Foursquare enrichment to existing flow.

Current flow: `destination param → cache check → Amazon Location → cache write → return`

New flow:
1. **Validate Supabase JWT** — import existing `validateAuth()` from `auth.ts`, extract `userId`
2. **Check DynamoDB cache** — `getCachedSuggestions(userId, destination)` (existing, unchanged)
3. **On cache miss:**
   - `searchPlaces(destination)` → `SuggestionCard[]` with empty images/null ratings (existing)
   - `enrichSuggestions(suggestions)` → same array with Foursquare data filled in (new)
   - `setCachedSuggestions(userId, destination, enriched)` (existing, default 30min TTL)
4. Return `{ suggestions, source: 'cache' | 'fresh' }`

### `infra/secrets.ts` (modified)

Add Foursquare API key secret, following existing pattern:

```ts
export const foursquareApiKey = new sst.Secret('FoursquareApiKey')
```

### `infra/api.ts` (modified)

Add `foursquareApiKey` to the `link` array of the `GET /suggest` route so the Lambda can read it via `Resource.FoursquareApiKey.value`.

## Frontend Changes (3 files)

### `apps/web/components/calendar/hooks/useSuggestions.ts` (rewrite)

Replace mock data import with React Query fetch. Preserve existing interface.

- **Signature stays the same:** `useSuggestions({ destination, scheduledActivityIds }): UseSuggestionsReturn`
- Replace `MOCK_SUGGESTIONS` import with `useQuery` fetching `GET {NEXT_PUBLIC_RECOMMENDATION_API_URL}/suggest?destination={destination}`
- Auth: get Supabase session, pass JWT in `Authorization: Bearer` header
- React Query handles loading/error/caching (stale time 5min, matches existing QueryClient defaults)
- **All client-side logic stays:** `searchQuery` text filtering, `activeFilter` category filtering, `removedIds` / `restoreSuggestion`, `scheduledActivityIds` exclusion
- **Return shape unchanged** — full interface:
  ```ts
  {
    suggestions: SuggestionCard[]
    isLoading: boolean
    error: string | null
    searchQuery: string
    setSearchQuery: (query: string) => void
    activeFilter: FilterCategory
    setActiveFilter: (filter: FilterCategory) => void
    filterCategories: readonly FilterCategory[]  // same FILTER_CATEGORIES const
    removeSuggestion: (id: string) => void
    restoreSuggestion: (id: string) => void
  }
  ```
- Expose React Query's `refetch` as an internal, wire it to the retry button in ForYouPanel (see below)

### `apps/web/components/calendar/hooks/useInteractionTracking.ts` (new)

Fire-and-forget interaction events.

- **`trackEvent(suggestionId: string, action: 'impression' | 'click' | 'drag' | 'dismiss', tripId: string)`**
- Gets JWT from Supabase session
- POSTs to `{NEXT_PUBLIC_RECOMMENDATION_API_URL}/interact`
- No await, no error handling, no loading state — silent failure is fine
- Called from:
  - ForYouPanel: impression events when cards mount/enter viewport
  - SuggestionCard: click events on card interaction
  - CalendarDashboard `onAddFromSuggestion`: drag events

### `apps/web/components/calendar/ForYouPanel.tsx` (modified)

Minimal changes — the component already accepts `destination: string` and passes it to `useSuggestions`.

- Wire `useInteractionTracking` for impression events on card visibility
- Wire the existing "Tap to retry" button's `onClick` to `refetch` from `useSuggestions` (currently has no handler)

## What's NOT Changing

- **SuggestionCard.tsx** — renders whatever data it receives, already handles missing fields
- **useCalendarDnd.ts** — drag-to-calendar logic, type branching, all untouched
- **suggestionMapper.ts** — SuggestionCard → CalendarActivity conversion stays the same
- **CalendarDashboard.tsx** — already passes `destination` to ForYouPanel, no changes needed
- **DragOverlay** — no changes
- **Types** — `SuggestionCard` interface already matches what the API returns
- **cache.ts** — existing per-user cache with 30min TTL used as-is

## Error Handling

No new error UI needed — existing ForYouPanel states cover all cases:

| Scenario | Behavior |
|----------|----------|
| API unreachable / 5xx | React Query error → ForYouPanel error state (existing) |
| No results from Amazon Location | Empty array → ForYouPanel empty state (existing) |
| Foursquare fails for some POIs | Graceful degradation — card renders with placeholder image, null rating/price |
| JWT expired | React Query retry fails → error state. Supabase auto-refreshes tokens so this is rare |
| Retry button | Wired to React Query `refetch` — re-fetches suggestions on click |

## Dependencies

- **Foursquare API key** — need to create a Foursquare developer account and get an API key
- **SST secret** — `npx sst secret set FoursquareApiKey <key>` after deployment
- **Existing infra** — API Gateway, DynamoDB table, Amazon Location PlaceIndex all already deployed
