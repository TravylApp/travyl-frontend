# SerpAPI Google Local — Places Integration Design Spec

## Goal

Replace the broken Foursquare integration with SerpAPI's Google Local API. Each filter category triggers its own server-side query, returning targeted results. Cache keyed by `(destination, category)` so results are shared across users.

## Files Changed

```
services/lib/serpapi.ts          ← replaces foursquare.ts (delete foursquare.ts)
services/lib/cache.ts            ← cache key: (destination, category) instead of (userId, destination)
services/suggest.ts              ← accepts category query param
infra/secrets.ts                 ← FoursquareApiKey → SerpApiKey
infra/api.ts                     ← update linked secret
apps/web/components/calendar/hooks/useSuggestions.ts  ← pass activeFilter to API
```

## SerpAPI Module (`services/lib/serpapi.ts`)

### Endpoint

```
GET https://serpapi.com/search.json
  engine=google_local
  q=<category-query>
  location=<destination>
  api_key=<SerpApiKey>
```

Both `q` and `location` are required. The `google_local` engine uses `location` to constrain results geographically — `q` alone does not do this.

### Category → Query Mapping

The `category` param comes from the client (lowercased filter label). Filter label → category param → query:

| Filter label | category param | `q` sent to SerpAPI |
|---|---|---|
| `All` | `all` | `top things to do` |
| `Sightseeing` | `sightseeing` | `top tourist attractions` |
| `Dining` | `dining` | `best restaurants` |
| `Nightlife` | `nightlife` | `best bars and nightlife` |
| `Culture` | `cultural` | `museums and cultural sites` |
| `Shopping` | `shopping` | `shopping` |
| `Outdoor` | `outdoor` | `outdoor activities` |
| `Tours` | `tour` | `guided tours and excursions` |

Note: `Culture` maps to `cultural` (not `culture`) and `Tours` maps to `tour` — the hook must pass these exact slugs. The `location` param is set to `destination` in all cases.

### Response → SuggestionCard Mapping

| SerpAPI field | SuggestionCard field | Notes |
|---|---|---|
| `place_id` | `id` | prefixed `serp-{place_id}` |
| `title` | `name` | |
| `thumbnail` | `imageUrl` | direct URL; fall back to `''` — many listings have no image |
| `rating` | `rating` | already 0–5, no conversion; `null` if absent |
| `price` | `price` | `$`→10, `$$`→25, `$$$`→50, `$$$$`→100; `null` if absent (most results will not include price) |
| `description` | `description` | rarely populated in Google Local results; fall back to `''` |
| `address` | `location` | |
| `gps_coordinates.latitude` | `latitude` | fall back to `0` |
| `gps_coordinates.longitude` | `longitude` | fall back to `0` |
| `category` param | `category` | passed from caller; no type-string parsing needed |

Fixed fields: `duration: 2`, `currency: 'USD'` (was `'EUR'` in Foursquare — intentional correction), `source: 'ai'`, `relevanceScore: 1 - index * 0.05`.

The `id` prefix changes from `fsq-{id}` to `serp-{place_id}`. Any existing DynamoDB cache entries with `fsq-` prefixed IDs are orphaned data — they will expire naturally via TTL and cause no correctness issues. The `SuggestionCard.id` field has no DB constraint; it is only used client-side for `removedIds` and `scheduledActivityIds` exclusion.

### Known Data Gaps

- `thumbnail`: frequently absent. `imageUrl` will be `''` for many results. UI must handle this.
- `description`: rarely present in Google Local organic results. Most cards will have an empty description.
- `price`: not included in standard `local_results` — will be `null` for almost all results.

### Function Signature

```ts
export async function searchPlaces(
  destination: string,
  category: string,
  options?: { limit?: number },
): Promise<SuggestionCard[]>
```

Returns `[]` on any error (graceful degradation).

## Cache (`services/lib/cache.ts`)

Cache key changes from `pk: "${userId}:${destination}"` to `pk: "${destination}:${category}"`.

- Removes user dimension — place results don't vary by user
- Adds category — each filter slot caches independently
- Function signatures: remove `userId` param from both `getCachedSuggestions` and `setCachedSuggestions`
- TTL unchanged: 30 minutes

## Lambda (`services/suggest.ts`)

- `validateAuth` call is kept — still required for authentication. `userId` is still extracted (used in logging) but is no longer passed to cache functions.
- Accepts new `category` query param, defaults to `"all"` if omitted
- Passes `(destination, category)` to both `searchPlaces` and cache functions
- Import changes: replace `import { searchPlaces } from './lib/foursquare'` with `import { searchPlaces } from './lib/serpapi'`

## Secrets

`infra/secrets.ts`:
```ts
// remove:
export const foursquareApiKey = new sst.Secret('FoursquareApiKey')
// add:
export const serpApiKey = new sst.Secret('SerpApiKey')
```

`infra/api.ts`: replace `foursquareApiKey` with `serpApiKey` in the `/suggest` route's `link` array.

After deploying: `npx sst secret set SerpApiKey <your-serpapi-key>`

## Hook (`apps/web/components/calendar/hooks/useSuggestions.ts`)

### `fetchSuggestions` signature

New signature: `fetchSuggestions(destination: string, token: string, category: string): Promise<SuggestionCard[]>`

URL: `/suggest?destination={destination}&category={category}`

Category is the lowercased+mapped slug (see table above). The `queryFn` must pass `activeFilter` through to this function.

### React Query key

```ts
queryKey: ['suggestions', destination, activeFilter]
```

Each filter change triggers a separate fetch (and separate cache slot on the server).

### Dead code to delete

The following are no longer needed and must be removed:
- `CATEGORY_MAP` constant (lines ~24–32)
- `CATEGORY_SEARCH_TERMS` constant (lines ~35–44)
- The category filter block inside `useMemo` (the `if (activeFilter !== 'All')` block, ~lines 137–140)

### Filter label → category slug conversion

The hook must convert filter labels to slugs before sending to the API:

```ts
const FILTER_TO_CATEGORY: Record<string, string> = {
  All: 'all',
  Sightseeing: 'sightseeing',
  Dining: 'dining',
  Tours: 'tour',
  Culture: 'cultural',
  Shopping: 'shopping',
  Nightlife: 'nightlife',
  Outdoor: 'outdoor',
}
```

### `queryFn` implementation

The `queryFn` must apply `FILTER_TO_CATEGORY` before calling `fetchSuggestions`:

```ts
queryFn: () => fetchSuggestions(destination, token!, FILTER_TO_CATEGORY[activeFilter] ?? 'all')
```

Do not pass `activeFilter` directly — it is the raw label (`'Culture'`) not the slug (`'cultural'`).

### Client-side filtering

- **Category filtering removed** — server now handles it; delete the `CATEGORY_MAP`/`CATEGORY_SEARCH_TERMS` constants and the `if (activeFilter !== 'All')` block in `useMemo`
- **Synonym matching intentionally dropped** — previously `CATEGORY_SEARCH_TERMS` let a user type "restaurant" to match dining cards. With per-category server queries this is unnecessary: selecting "Dining" already returns restaurant results. Text search now filters by `name`, `description`, and `location` fields only.
- **Text search kept** — client-side `name`/`description`/`location` filtering unchanged
- `scheduledActivityIds` exclusion unchanged
- `removedIds` state unchanged
- `staleTime: 30 * 60 * 1000` unchanged — each filter's React Query slot independently goes stale after 30 min, matching the DynamoDB TTL. This is correct and intentional.

## What Does Not Change

- Auth validation in Lambda (`validateAuth` still called on every request)
- DynamoDB table and TTL (30 min)
- `removedIds` / `restoreSuggestion` state in hook
- `scheduledActivityIds` exclusion
- All other Lambda routes (`/search`, `/interact`)
- Mock data fallback when `NEXT_PUBLIC_RECOMMENDATION_API_URL` is unset
- `FILTER_CATEGORIES` list in hook (UI filter chips unchanged)
