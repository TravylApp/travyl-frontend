# Spotlight Search Overhaul

Date: 2026-03-27

## Problem

The spotlight search (Ctrl+K) has three critical issues:

1. **Empty results**: Context-search Lambda returns empty — likely a Bedrock embedding invocation failure
2. **Stale/same results**: Every query returns the same results regardless of input — intent parsing is too aggressive at matching "discover"
3. **Slow and janky**: 5 independent API calls fire from the browser (parse-intent, context-search, entity-search, discover, fsq-search), racing against each other with inconsistent timing

## Architecture: Two-Phase Streaming Pipeline

Replace the current 5 independent browser API calls with a two-phase pipeline that returns results progressively.

### Phase 1 — Quick Search (`GET /search/quick`)

Fast internal-only search. Warm Lambda target: <500ms. Cold start: ~1-2s (first invocation).

| Source | Type | Method |
|--------|------|--------|
| My trips | Trip results | Text ILIKE on `trip_embeddings.text_content` (primary) + vector search via `search_trips` RPC (secondary, runs in parallel) |
| My activities | Activity/Restaurant results | `search_entities` RPC on Supabase |
| Calendar commands | Commands | Client-side fuzzy match (no API) |
| Nav items | Navigation | Client-side fuzzy match (no API) |

No external API calls. All data from Supabase + client-side.

The text ILIKE fallback is the primary path because it doesn't require the Bedrock embedding call, keeping latency low. The vector search runs in parallel and merges in when ready. If the embedding call fails or is slow, text results still return.

**End-to-end latency budget**: Warm Lambda — Phase 1 ~300ms + Phase 2 ~1.2s = ~1.5s total for all results. Cold start — up to 3s. Phase 1 results appear first, Phase 2 merges in progressively.

**Intent parsing ownership**: `search-quick` Lambda runs its own copy of the regex rules (same logic as current `parseQueryIntentSync`). This avoids client/server contract complexity — the Lambda owns intent parsing, and the frontend simply passes the Lambda's parsed intent to Phase 2.

### Phase 2 — Deep Search (`GET /search/deep`)

External data enrichment. Target: <1500ms. Takes pre-parsed intent from Phase 1 via query parameters.

| Source | Type | Method |
|--------|------|--------|
| Intent parse | Metadata | Claude Haiku via Bedrock (only when Phase 1 regex didn't classify intent) |
| Foursquare | Restaurant/Activity | Places API — same `inferType` logic as current `fsq-search/route.ts`, using `near` param from intent location |
| SerpAPI Discover | Destination/Activity | Same 3-parallel-category pattern as current `discover.ts` (dining, sightseeing, outdoor), results cached in DynamoDB with 1hr TTL using existing `RecommendationCache` table |
| Collaborators | User | Supabase `trip_collaborators` join with `profiles` (by display_name or email match) |

Collaborator search is limited to users who share trips with the current user (via `trip_collaborators`), not a global user search.

### Intent Passthrough Contract

Phase 1 returns intent in the response body. Phase 2 accepts it as query parameters:

```
GET /search/deep?q=bakersfield+restaurants&intent=entity-search&location=Bakersfield&entityType=restaurant
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | yes | Raw search query |
| `intent` | `discover` \| `entity-search` \| `create-trip` \| `route` \| `unknown` | yes | Parsed intent from Phase 1 |
| `location` | string | no | Extracted location (Title Case) |
| `entityType` | `restaurant` \| `hotel` \| `activity` \| `flight` | no | Extracted entity type |

When `intent=unknown`, Phase 2 runs Claude Haiku to re-parse. Otherwise it uses the pre-parsed intent directly.

### Frontend Flow

```
User types query
  ↓ debounce 200ms
  ├─ Phase 1 fires → results appear (warm <500ms)
  └─ Phase 2 fires (query ≥ 3 chars) → results merge in (<1500ms)
```

- Phase 1 fires at `query.length >= 2` — even short queries get trip/command results
- Phase 2 fires at `query.length >= 3` — external API calls are expensive, so only fire for longer queries
- Phase 2 cancelled if user types again before it returns
- Phase 1 cached 30s, Phase 2 cached 60s (React Query staleTime)
- Loading states show what's pending
- **Eliminates current double-debounce bug**: Current hook has 300ms debounce + `useContextSearch` adds another 300ms internally. New hook has single 200ms debounce.

### Partial Failure

Both Lambdas use the same partial failure pattern:
- Each fan-out branch wraps in try/catch, logs the error, and returns `[]` on failure
- The Lambda always returns 200 with whatever results succeeded
- Failed branches are logged with structured error details for debugging
- The response includes a `debug` field (only in non-production) listing which sources failed

## Lambda Implementation

### `services/search-quick.ts` (new)

```
1. Validate JWT
2. Regex intent parse (synchronous, no LLM) → produces ParsedIntent
3. Parallel fan-out (all wrapped in individual try/catch):
   a. Text search: trip_embeddings ILIKE on text_content + title match on trips table
   b. Vector search: generateEmbedding(query) → search_trips RPC (secondary)
   c. Entity search: search_entities RPC
4. Merge results (text + vector deduplicated by trip_id, entities separate)
5. Return { intent: ParsedIntent, results: { trip: [...], activity: [...], restaurant: [...] } }
```

Links: `[supabaseSecretKey, supabaseUrl]`
Permissions: Bedrock `InvokeModel` for `amazon.titan-embed-text-v2:0`

### `services/search-deep.ts` (new)

```
1. Validate JWT
2. Read intent from query params (q, intent, location, entityType)
3. If intent=unknown, run Claude Haiku to re-parse
4. Parallel fan-out (all wrapped in individual try/catch):
   a. Foursquare search (if entity-search or discover intent)
     - Uses foursquareApiKey SST secret
     - Same inferType logic from current fsq-search route
     - `near` param = intent.location
   b. SerpAPI discover (if discover or route intent)
     - Same 3-category parallel call pattern as current discover.ts
     - DynamoDB cache with 1hr TTL using existing cache table
   c. Collaborator search (Supabase trip_collaborators join)
5. Merge, deduplicate, rank
6. Return { results: { restaurant: [...], activity: [...], destination: [...], user: [...] } }
```

Links: `[supabaseSecretKey, supabaseUrl, serpApiKey, foursquareApiKey, cacheTable]`
Permissions: Bedrock `InvokeModel` for `anthropic.claude-3-haiku-20240307-v1:0`

### `infra/api.ts` changes

Add two new routes:
```typescript
api.route('GET /search/quick', {
  handler: 'services/search-quick.handler',
  link: [supabaseSecretKey, supabaseUrl],
  permissions: [{
    actions: ['bedrock:InvokeModel'],
    resources: ['arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0'],
  }],
})

api.route('GET /search/deep', {
  handler: 'services/search-deep.handler',
  link: [supabaseSecretKey, supabaseUrl, serpApiKey, foursquareApiKey, cacheTable],
  permissions: [{
    actions: ['bedrock:InvokeModel'],
    resources: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'],
  }],
})
```

Keep existing Lambdas for backward compat — they become internal-only or can be removed later.

### Cold Start Expectations

- `search-quick`: Imports Bedrock SDK + Supabase client. Cold start ~500ms-1s. Warm invocations <200ms for text search, <400ms with embedding.
- `search-deep`: Imports Bedrock SDK + Supabase + Foursquare + SerpAPI. Cold start ~800ms-1.5s. Warm invocations <300ms for internal + <1s for external APIs.
- No provisioned concurrency for now. Monitor cold start frequency after deploy; add if >10% of requests are cold starts.

## Search Quality Fixes

### Fix: Empty context-search results
- Add structured error logging to `generateEmbedding()` — catch and log specific Bedrock errors (not just `console.error`)
- Verify Bedrock permissions are attached to the new Lambda
- Lower vector similarity threshold from 0.15 to 0.10 for better recall
- Text ILIKE fallback ensures results even when Bedrock is down

### Fix: "Same results every time"
- Make regex intent parsing less aggressive for single words:
  - Current: bare word → `discover` intent
  - New: bare word → `entity-search` with `location=<word>` (searches user's saved activities for that location)
  - Only falls through to `discover` if entity-search returns no results
- React Query `staleTime` and `sessionStorage` cache handle repeated identical queries — no new session tracking infrastructure needed

### Improved ranking
- Source priority: My data (3x) > External places (2x) > App controls (1x)
- Recency boost: recently-accessed trips get 1.5x
- Context boost: when inside a trip, results from that trip get 2x
- Exact match: title exact match gets 3x over fuzzy
- Deduplication: same place from multiple sources → keep highest score, merge metadata

## Frontend Changes

### `useSpotlightSearch` hook (rewritten)

Replace 5 `useQuery` calls with 2 server queries + 2 client-side memos:

```typescript
// Client-side: commands + nav (no API)
const commandResults = useMemo(...)
const navResults = useMemo(...)

// Phase 1: Quick search — internal data only
const { data: quickResults, isLoading: quickLoading } = useQuery({
  queryKey: ['search-quick', debouncedQuery],
  queryFn: () => fetchSearchQuick(debouncedQuery, token!),
  enabled: debouncedQuery.length >= 2 && !!token,
  staleTime: 30_000,
})

// Phase 2: Deep search — external data + intent-driven
const { data: deepResults } = useQuery({
  queryKey: ['search-deep', debouncedQuery, quickResults?.intent],
  queryFn: () => fetchSearchDeep(debouncedQuery, quickResults!.intent, token!),
  enabled: !!quickResults?.intent && debouncedQuery.length >= 3,
  staleTime: 60_000,
})

// Merge all sources
const results = useMemo(() => mergeSearchResults([
  quickResults?.results ?? {},
  deepResults?.results ?? {},
  commandResults,
  navResults,
]), [quickResults, deepResults, commandResults, navResults])
```

Features preserved: scope management, pinned results, recent searches, auto-scope from intent, trip context pill, action results.

### New proxy routes

Replace 5 existing routes with 2:
- `apps/web/app/api/search/quick/route.ts`
- `apps/web/app/api/search/deep/route.ts`

Remove:
- `apps/web/app/api/context-search/route.ts`
- `apps/web/app/api/entity-search/route.ts`
- `apps/web/app/api/discover/route.ts`
- `apps/web/app/api/parse-intent/route.ts`
- `apps/web/app/api/fsq-search/route.ts` (Foursquare moves to Lambda)

### UI improvements

- **Progressive reveal**: Phase 1 results render first, Phase 2 results animate in below
- **Source tags**: Subtle label on each result group ("From your trips", "Foursquare", etc.)
- **Smart loading**: Shows "Searching external places..." during Phase 2
- **Better empty state**: Differentiates between "nothing in your trips" and "nothing anywhere"

## Data Quality

### `trip_embeddings.text_content` enrichment
Activity names are already included by `index-trip.ts`. The remaining enrichment is:
- Collaborator display names (from `trip_collaborators` join with `profiles`)
- Destination description (from trip metadata or SerpAPI)

- These additions improve both vector similarity and text ILIKE fallback match

### `index-trip` Lambda update
When a trip is indexed (via `POST /index`), append collaborator names and destination description to the existing `text_content` builder in `index-trip.ts`. The activity names are already included.

### Supabase changes needed
- **Collaborator search**: Add a `search_collaborators` RPC or extend `search_entities` to cover collaborator profiles. Query: join `trip_collaborators` with `profiles` where user shares a trip, match on `display_name` or `email` ILIKE.
Run a one-time script (or manual `POST /index` for each trip) to re-index the 8 existing trips with enriched text_content. This can be done by calling `POST /index` for each trip ID, since the index endpoint regenerates the full embedding from current trip data.

## Scope

### In scope
- Fix broken context-search (empty results)
- Two new Lambdas: search-quick, search-deep
- Frontend hook rewrite (2-phase fetch)
- Proxy route consolidation (5 → 2)
- Search quality fixes (ranking, dedup, intent)
- UI polish (progressive results, loading states, source tags)

### Out of scope
- New entity detail pages (already designed in separate spec)
- OpenSearch migration (future)
- Amazon Personalize integration (future)
- Mobile-specific search UX
- Autocomplete/type-ahead (future feature)
- Collaborator search beyond shared-trip context
