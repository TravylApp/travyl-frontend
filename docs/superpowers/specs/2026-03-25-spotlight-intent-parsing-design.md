# Spotlight Intent Parsing — Design Spec

**Date:** 2026-03-25
**Feature:** Query intent parsing for Spotlight Search
**Status:** Approved

---

## Problem

When users type natural language queries like "bakersfield restaurants" or "restaurants in bakersfield" into the Spotlight search, the system passes the entire raw string as the destination to the discover Lambda. This means:

- The destination card shows "bakersfield restaurants" as a place name
- SerpAPI receives `destination = "bakersfield restaurants"` + `category = "dining"` — doubling the intent
- The DynamoDB cache key becomes `discover:bakersfield restaurants` instead of `discover:bakersfield`
- No entity type scoping happens automatically — the user has to manually set a scope pill

The root cause is the absence of a query understanding layer. The system routes the raw string everywhere instead of first determining what the user means.

---

## Goal

Parse the user's natural language search query into a structured `ParsedIntent` object **before** any API calls fire, so that:

1. The discover Lambda receives a clean location string (`"bakersfield"`) not the full query
2. The entity type is extracted and used to auto-set the scope filter where a scope exists
3. Novel / ambiguous queries fall back to a Claude Haiku LLM call for structured extraction
4. LLM responses are session-cached so repeated phrases don't re-hit the API

---

## Architecture

```
User types query
      ↓
parseQueryIntent(query, token)   [apps/web/lib/parseQueryIntent.ts]
  ├─ Phase 1: Regex + synonym table  →  fast match, zero latency
  └─ Phase 2: no match → /api/parse-intent → Claude Haiku (Anthropic direct API)
      ↓
ParsedIntent { location?, entityType?, intent, rawQuery }
      ↓
useSpotlightSearch.ts
  ├─ passes location (not rawQuery) to /api/discover
  ├─ auto-sets scope from entityType (only for scopes that exist in SearchScope)
  └─ still passes rawQuery to entity-search and context-search unchanged
```

The `parseQueryIntent` function is the single source of truth for intent. Everything downstream consumes its output.

---

## `ParsedIntent` Type

```ts
// apps/web/lib/parseQueryIntent.ts

export type SearchIntent =
  | 'discover'       // user wants to explore a destination
  | 'entity-search'  // user wants a specific entity type in a location
  | 'create-trip'    // user wants to start a trip
  | 'route'          // user wants A-to-B routing
  | 'unknown'        // no structured intent detected

export interface ParsedIntent {
  intent: SearchIntent
  location?: string        // title-cased place name, e.g. "Bakersfield" — normalized at parse time
  entityType?: 'restaurant' | 'hotel' | 'activity' | 'flight'
  rawQuery: string         // always the original unmodified query
}

export async function parseQueryIntent(query: string, token: string): Promise<ParsedIntent>
```

---

## `entityType` → `SearchScope` Mapping

The existing `SearchScope` type is `'trips' | 'restaurants' | 'activities' | 'commands' | null`. Only two entity types map to existing scope values:

| entityType | SearchScope auto-set |
|---|---|
| `'restaurant'` | `'restaurants'` |
| `'activity'` | `'activities'` |
| `'hotel'` | no auto-scope (hotel scope does not exist) |
| `'flight'` | no auto-scope (flight scope does not exist) |

For `hotel` and `flight` intents, the location is still extracted and passed to discover — the scope pill is just not set. Do **not** extend `SearchScope` in this feature.

---

## Phase 1: Regex + Synonym Table

Lives in `apps/web/lib/parseQueryIntent.ts`. Runs synchronously, no I/O.

### Synonym Map

```ts
const ENTITY_SYNONYMS: Record<string, ParsedIntent['entityType']> = {
  // restaurant
  restaurant: 'restaurant', restaurants: 'restaurant',
  food: 'restaurant', dining: 'restaurant', eat: 'restaurant',
  eats: 'restaurant', cafe: 'restaurant', cafes: 'restaurant',
  bar: 'restaurant', bars: 'restaurant', brunch: 'restaurant',
  lunch: 'restaurant', dinner: 'restaurant',

  // hotel
  hotel: 'hotel', hotels: 'hotel', stay: 'hotel',
  lodging: 'hotel', accommodation: 'hotel', accommodations: 'hotel',
  hostel: 'hotel', hostels: 'hotel', motel: 'hotel', motels: 'hotel',
  airbnb: 'hotel', resort: 'hotel', resorts: 'hotel',

  // activity
  activity: 'activity', activities: 'activity',
  attraction: 'activity', attractions: 'activity',
  sights: 'activity', sightseeing: 'activity',
  tour: 'activity', tours: 'activity',
  museum: 'activity', museums: 'activity', park: 'activity', parks: 'activity',

  // flight
  flight: 'flight', flights: 'flight', fly: 'flight',
  airline: 'flight', airlines: 'flight',
}
```

Note: `'things to do'` is handled as a dedicated pattern (see Priority 4 below) because it is a multi-word phrase that would otherwise conflict with the `X to Y` route pattern.

**Location normalization:** `parseQueryIntent` is responsible for title-casing the extracted location before returning it (e.g. `"bakersfield"` → `"Bakersfield"`, `"new york"` → `"New York"`). This ensures consistent casing regardless of whether Phase 1 or Phase 2 produced the result. The LLM prompt instructs Haiku to return location in title case. Phase 1 applies `toTitleCase(location)` to the regex capture before returning.

### Patterns (evaluated in strict priority order)

| Priority | Pattern | Example Input | Output |
|---|---|---|---|
| 1 | `trip to X` | "trip to paris" | `{ intent: 'create-trip', location: 'paris' }` |
| 2 | `new trip` / `create trip` | "create trip" | `{ intent: 'create-trip' }` |
| 3 | `[entity] in [city]` | "restaurants in bakersfield" | `{ intent: 'entity-search', entityType: 'restaurant', location: 'bakersfield' }` |
| 4 | `things to do in [city]` | "things to do in nyc" | `{ intent: 'entity-search', entityType: 'activity', location: 'nyc' }` |
| 5 | `[city] [entity]` | "bakersfield restaurants" | `{ intent: 'entity-search', entityType: 'restaurant', location: 'bakersfield' }` |
| 6 | `X to Y` (generic route) | "la to sf" | `{ intent: 'route', location: 'sf' }` |
| 7 | bare location word(s), no entity keyword | "bakersfield" | `{ intent: 'discover', location: 'bakersfield' }` |
| — | no match | "good vibes only" | `{ intent: 'unknown', rawQuery }` → Phase 2 |

**Important:** Patterns 3 and 4 must be evaluated **before** Pattern 6 to prevent "things to do in nyc" from being misclassified as a route (origin: "things", destination: "do in nyc").

If any pattern matches, return immediately without calling any API.

---

## Phase 2: LLM Fallback

Only fires when Phase 1 returns `intent: 'unknown'`.

### Session Cache (checked before firing)

Before making the API call, check `sessionStorage` for a cached result:

```ts
const CACHE_KEY = (q: string) => `parse-intent:${q.toLowerCase().trim()}`
```

If found, return cached `ParsedIntent` immediately. Store the API response to cache on success.

### API Route

**`apps/web/app/api/parse-intent/route.ts`**

- Accepts `GET /api/parse-intent?q=<query>`
- Requires `Authorization: Bearer <token>` header (validated against Supabase session)
- Calls Claude Haiku (`claude-haiku-4-5-20251001`) via Anthropic SDK (`@anthropic-ai/sdk`)
- Returns `ParsedIntent` JSON on success
- Returns `{ intent: 'unknown', rawQuery: q }` on any error (never throws to client)

**Auth failure:** If the `Authorization` header is missing or invalid, return the same graceful fallback shape with status 200 (not 401) — this ensures the client always gets a usable `ParsedIntent` and never surfaces an auth error in the search UI.

**Error response (all failure modes):** `{ intent: 'unknown', location: null, entityType: null, rawQuery: "<q>" }` with status 200. The client always gets a usable `ParsedIntent` — errors degrade gracefully to raw query pass-through.

### LLM Prompt

```
You are a travel search intent parser. Extract structured intent from a search query.

Return ONLY valid JSON — no explanation, no markdown, no code fences.

Schema:
{
  "intent": "discover" | "entity-search" | "create-trip" | "route" | "unknown",
  "location": string | null,
  "entityType": "restaurant" | "hotel" | "activity" | "flight" | null
}

Rules:
- "discover": user wants to explore a destination with no specific entity type
- "entity-search": user wants a specific category of place in a location
- "create-trip": user wants to plan or start a trip
- "route": user mentions two places (origin to destination)
- "unknown": none of the above

Query: "<user_query>"
```

### Dependency

`@anthropic-ai/sdk` must be added to `apps/web/package.json` (not shared — this is web-only).

### Environment Variable

`ANTHROPIC_API_KEY` — server-side only, never exposed to the client. Must be set in `.env.local` for development and in the production deployment environment.

---

## Changes to `useSpotlightSearch.ts`

### 1. Intent parsing query (replaces manual regex memos)

Use `useQuery` for the async intent parse so React Query handles deduplication and caching:

```ts
const { data: parsedIntent, isLoading: intentLoading } = useQuery({
  queryKey: ['parse-intent', debouncedQuery],
  queryFn: () => parseQueryIntent(debouncedQuery, token!),
  enabled: debouncedQuery.length >= 3 && !!token,
  staleTime: Infinity, // intent for a given query never changes
})
```

**Replaces `createTripIntent` and `routeIntent` memos.** These two `useMemo` blocks and the `actionResults` memo that feeds them must be replaced by a single `actionResults` driven by `parsedIntent`:

```ts
const actionResults = useMemo((): Record<string, SpotlightResult[]> => {
  if (!parsedIntent) return {}
  const actions: SpotlightResult[] = []

  if (parsedIntent.intent === 'create-trip') {
    actions.push({
      id: 'create-trip',
      type: 'action',
      title: parsedIntent.location
        ? `Create trip to ${parsedIntent.location}`
        : 'Create New Trip',
      subtitle: 'Start planning a new adventure',
      href: '',
      score: 100,
      metadata: { prefillDestination: parsedIntent.location ?? '' },
    })
  }

  if (parsedIntent.intent === 'route' && discoverData?.route) {
    const { origin, destination } = discoverData.route
    actions.push({
      id: 'create-trip-route',
      type: 'action',
      title: `Plan trip: ${origin} to ${destination}`,
      subtitle: 'Start planning with destinations pre-filled',
      href: '',
      score: 100,
      metadata: { prefillDestination: destination, origin },
    })
  }

  return actions.length ? { action: actions } : {}
}, [parsedIntent, discoverData?.route])
```

Note: the route action still depends on `discoverData?.route` because the Lambda's route parsing (`X to Y` extraction) is what populates the origin/destination pair in the response. The client's `parsedIntent.intent === 'route'` is the gate; the Lambda still provides the actual place names.

### 2. Discover query — use parsed location

```ts
const discoverLocation = parsedIntent?.location ?? debouncedQuery

const { data: discoverData } = useQuery({
  queryKey: ['discover', discoverLocation],   // keyed on location, not raw query
  queryFn: () => fetchDiscover(discoverLocation, token!),
  enabled: shouldSearch && !scope && parsedIntent !== undefined,
  staleTime: 60_000,
})
```

This ensures "bakersfield restaurants" and "restaurants in bakersfield" both resolve to the same `['discover', 'bakersfield']` cached entry.

### 3. Auto-scope from entityType

```ts
const ENTITY_TYPE_TO_SCOPE: Partial<Record<string, SearchScope>> = {
  restaurant: 'restaurants',
  activity: 'activities',
}

useEffect(() => {
  if (parsedIntent?.entityType && scope === null) {
    const autoScope = ENTITY_TYPE_TO_SCOPE[parsedIntent.entityType]
    if (autoScope) setScope(autoScope)
  }
}, [parsedIntent?.entityType, scope, setScope])
```

The user can still manually override the auto-set scope via the scope pill UI — this effect only fires when `scope` is `null`.

### 5. isLoading includes intentLoading

The `isLoading` value returned from `useSpotlightSearch` must include the intent query's loading state:

```ts
isLoading: tripSearchLoading || entityLoading || discoverLoading || intentLoading
```

This covers the window where `parsedIntent` is being resolved (Phase 2 LLM call) but the discover query hasn't fired yet. Without it, the UI shows no loading indicator for up to ~500ms during Phase 2 resolution.

### 4. Interaction with `@scope` prefix typing

`SpotlightInput.tsx` already sets scope via `@restaurants` / `@activities` prefix — this takes priority because it calls `setScope` directly. The auto-scope effect only fires when `scope === null`, so a manually typed prefix always wins.

---

## Changes to `services/discover.ts`

None required. The Lambda's `parseQuery()` function is left intact as a safety net for callers that bypass the intent layer. With the new client-side parsing, the Lambda will receive clean location strings in the common case and its own route detection becomes a fallback only.

---

## Deployment Notes

- `/api/parse-intent` is a Next.js API route — no new Lambda or SST resource needed
- `ANTHROPIC_API_KEY` must be set:
  - Locally: `apps/web/.env.local`
  - Production: in the deployment environment (user will provide the key value — do not commit it)
- Install `@anthropic-ai/sdk` in `apps/web`: `npm install --workspace=apps/web @anthropic-ai/sdk`

---

## What Is Not Changing

- `useContextSearch` — still receives the raw query (vector search works better with natural language)
- `fetchEntitySearch` — still receives the raw query (Postgres full-text handles it well)
- `SearchScope` type — not extended in this feature
- `services/discover.ts` Lambda — no redeployment required
- Scope pill UI — users can still manually override auto-detected scope

---

## Testing

- Unit tests for `parseQueryIntent` (Phase 1 only — no I/O) covering:
  - All 7 pattern priorities, including "things to do in X" before route pattern
  - Synonym variants for each entity type
  - Edge cases: "new trip", bare city name, no-match fallback
- Test that Phase 2 is NOT called when Phase 1 matches
- Test session cache hit prevents duplicate LLM calls
- Test Phase 2 failure returns `{ intent: 'unknown', rawQuery }` gracefully
- Manual QA:
  - "bakersfield restaurants" → destination card "Bakersfield", scope auto-set to restaurants
  - "restaurants in bakersfield" → same as above
  - "things to do in nyc" → destination "NYC", scope auto-set to activities
  - "hotel in miami" → destination "Miami", no scope set (hotel not in SearchScope)
  - "flights to london" → destination "London", no scope set
  - "somewhere to eat in bakersfield" → Haiku extracts restaurant + bakersfield
  - Existing: trip search, commands, entity search — no regressions

---

## Success Criteria

1. "bakersfield restaurants" → destination card shows "Bakersfield", scope auto-set to restaurants
2. "restaurants in bakersfield" → identical result to above (same React Query cache entry)
3. "things to do in nyc" → destination "NYC", scope auto-set to activities
4. Novel phrasing ("somewhere to eat in bakersfield") → Haiku returns structured intent correctly
5. LLM is not called when Phase 1 matches
6. Phase 2 failure degrades gracefully — raw query passed to discover, no crash
7. No regressions on existing trip search, entity search, and command search
