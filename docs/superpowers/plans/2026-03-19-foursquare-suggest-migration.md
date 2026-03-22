# Foursquare Suggest Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Amazon Location → Foursquare enrichment pipeline with a single Foursquare Places Search call so the For You panel returns activity suggestions instead of an empty list.

**Architecture:** `services/lib/location.ts` is rewritten to call Foursquare's `/v3/places/search` directly, returning fully enriched `SuggestionCard[]` in one request. The separate enrichment step in `suggest.ts` is removed. The Amazon Location Place Index and its IAM policy are removed from infra. `foursquare.ts` is deleted (dead code).

**Tech Stack:** Foursquare Places API v3, SST Resource bindings, AWS Lambda (Node 20), DynamoDB (unchanged), TypeScript.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `services/lib/location.ts` | Rewrite | Foursquare Places Search + SuggestionCard mapping |
| `services/suggest.ts` | Modify | Remove dead `enrichSuggestions` call |
| `services/lib/foursquare.ts` | Delete | Dead code — all consumers removed |
| `infra/storage.ts` | Modify | Remove Amazon Location Place Index |
| `infra/api.ts` | Modify | Remove Location IAM policy/env vars; add `foursquareApiKey` to `/search` route |

---

## Task 1: Rewrite `services/lib/location.ts`

**Files:**
- Modify: `services/lib/location.ts` (full rewrite)

This is the core change. The function signature stays the same — callers (`suggest.ts`, `search.ts`) require no changes.

Key facts about the Foursquare v3 API:
- Endpoint: `GET https://api.foursquare.com/v3/places/search`
- Auth: API key goes directly in `Authorization` header — **no `Bearer` prefix**
- `near` param accepts destination strings like `"Paris"` or `"Tokyo, Japan"`
- `fields` param controls which fields are returned (photos are NOT returned by default)
- `categories` field in response is an array of objects with shape `{ id, name, short_name, plural_name, icon }`
- `photos` field is an array of `{ prefix: string, suffix: string }` — same format as the old enrichment code
- `rating` is 0–10 scale → normalize to 0–5 with `Math.round((r / 2) * 10) / 10`
- `price` is 1–4 tier → map to dollars: `{ 1: 10, 2: 25, 3: 50, 4: 100 }`
- `geocodes.main.latitude` / `geocodes.main.longitude` for coordinates
- `location.locality ?? location.region` for the location label

- [ ] **Step 1: Replace the file contents**

```typescript
// services/lib/location.ts
import { Resource } from 'sst'
import type { SuggestionCard } from '@travyl/shared'

const FSQ_BASE = 'https://api.foursquare.com/v3'

// --- Foursquare v3 response types ---

interface FsqCategory {
  id: number
  name: string
  short_name: string
  plural_name: string
  icon: { prefix: string; suffix: string }
}

interface FsqSearchPlace {
  fsq_id: string
  name: string
  categories: FsqCategory[]
  photos?: { prefix: string; suffix: string }[]
  rating?: number      // 0–10
  price?: number       // 1–4
  tips?: { text: string }[]
  geocodes: { main: { latitude: number; longitude: number } }
  location: { locality?: string; region?: string }
  description?: string
}

interface FsqSearchResponse {
  results: FsqSearchPlace[]
}

// --- Category mapping ---

const CATEGORY_MAP: Array<[string[], SuggestionCard['category']]> = [
  [['museum', 'gallery', 'exhibition'], 'museum'],
  [['restaurant', 'food', 'café', 'cafe', 'bar'], 'dining'],
  [['nightlife', 'club'], 'nightlife'],
  [['shopping', 'market', 'boutique'], 'shopping'],
  [['park', 'garden', 'trail', 'outdoor', 'nature'], 'outdoor'],
  [['theater', 'music', 'cultural', 'arts'], 'cultural'],
  [['tour', 'sightseeing', 'landmark', 'monument', 'historic'], 'sightseeing'],
]

function mapCategory(categories: FsqCategory[]): SuggestionCard['category'] {
  for (const cat of categories) {
    const lower = cat.name.toLowerCase()
    for (const [keywords, slug] of CATEGORY_MAP) {
      if (keywords.some((kw) => lower.includes(kw))) return slug
    }
  }
  return 'sightseeing'
}

// --- Field mapping ---

function mapPlace(place: FsqSearchPlace, index: number, destination: string): SuggestionCard {
  const photo = place.photos?.[0]
  const imageUrl = photo ? `${photo.prefix}400x300${photo.suffix}` : ''
  const rating = place.rating != null ? Math.round((place.rating / 2) * 10) / 10 : null
  const priceMap: Record<number, number> = { 1: 10, 2: 25, 3: 50, 4: 100 }
  const price = place.price != null ? (priceMap[place.price] ?? null) : null

  return {
    id: `fsq-${place.fsq_id}`,
    name: place.name,
    category: mapCategory(place.categories),
    imageUrl,
    duration: 2,
    price,
    currency: 'USD',
    rating,
    location: place.location.locality ?? place.location.region ?? destination,
    latitude: place.geocodes.main.latitude,
    longitude: place.geocodes.main.longitude,
    description: place.tips?.[0]?.text ?? place.description ?? '',
    source: 'ai',
    relevanceScore: Math.max(0, 1 - index * 0.05),
  }
}

// --- Public API (signature unchanged) ---

export async function searchPlaces(
  destination: string,
  options?: {
    query?: string
    maxResults?: number
    categories?: string[]
  },
): Promise<SuggestionCard[]> {
  const { query, maxResults = 10 } = options ?? {}

  const url = new URL(`${FSQ_BASE}/places/search`)
  url.searchParams.set('query', query ?? 'things to do')
  url.searchParams.set('near', destination)
  url.searchParams.set('limit', String(maxResults))
  url.searchParams.set(
    'fields',
    'fsq_id,name,categories,photos,rating,price,tips,geocodes,location,description',
  )

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: Resource.FoursquareApiKey.value,
        Accept: 'application/json',
      },
    })

    if (!res.ok) return []

    const data: FsqSearchResponse = await res.json()
    return data.results.map((place, i) => mapPlace(place, i, destination))
  } catch {
    return []
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors referencing `location.ts`. If `SuggestionCard` type errors appear, confirm `@travyl/shared` export at root includes `SuggestionCard`.

- [ ] **Step 3: Commit**

```bash
git add services/lib/location.ts
git commit -m "feat: replace Amazon Location with Foursquare Places Search in location.ts"
```

---

## Task 2: Simplify `services/suggest.ts`

**Files:**
- Modify: `services/suggest.ts`

Remove the `enrichSuggestions` import and call. `searchPlaces()` now returns fully enriched cards.

Current lines 5–6 + 26–27 in `suggest.ts`:
```typescript
// remove this import:
import { enrichSuggestions } from './lib/foursquare'

// remove this call (keep the searchPlaces call, just remove enrichment):
const suggestions = await enrichSuggestions(basicSuggestions)
```

- [ ] **Step 1: Edit `services/suggest.ts`**

The file currently looks like:
```typescript
import { enrichSuggestions } from './lib/foursquare'
// ...
const basicSuggestions = await searchPlaces(destination, { maxResults: 10 })
const suggestions = await enrichSuggestions(basicSuggestions)
```

Change to:
```typescript
// (remove the enrichSuggestions import line entirely)
// ...
const suggestions = await searchPlaces(destination, { maxResults: 10 })
// (remove the enrichSuggestions call line entirely)
```

The full updated `services/suggest.ts`:

```typescript
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { getCachedSuggestions, setCachedSuggestions } from './lib/cache'
import { searchPlaces } from './lib/location'
import type { SuggestResponse } from './lib/types'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const destination = event.queryStringParameters?.destination

    if (!destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'destination required' }) }
    }

    // Check cache first
    const cached = await getCachedSuggestions(userId, destination)
    if (cached) {
      const response: SuggestResponse = { suggestions: cached, source: 'cache' }
      return { statusCode: 200, body: JSON.stringify(response) }
    }

    // Query Foursquare for enriched suggestions
    const suggestions = await searchPlaces(destination, { maxResults: 10 })

    // Cache results (30min default TTL)
    if (suggestions.length > 0) {
      await setCachedSuggestions(userId, destination, suggestions)
    }

    const response: SuggestResponse = { suggestions, source: 'fresh' }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('suggest error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add services/suggest.ts
git commit -m "feat: remove enrichSuggestions from suggest.ts — Foursquare search is now enriched directly"
```

---

## Task 3: Delete `services/lib/foursquare.ts`

**Files:**
- Delete: `services/lib/foursquare.ts`

All consumers of `enrichSuggestions` and `matchPlace` have been removed. `buildPhotoUrl` is now inlined in `location.ts`.

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "from.*foursquare" services/ --include="*.ts"
```

Expected: no output (no files import from `foursquare.ts` anymore). Run this before deleting the file so the check isn't confused by the file's own contents.

- [ ] **Step 2: Delete the file**

```bash
git rm services/lib/foursquare.ts
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete foursquare.ts — dead code after Foursquare direct search migration"
```

---

## Task 4: Update infra files

**Files:**
- Modify: `infra/storage.ts`
- Modify: `infra/api.ts`

### `infra/storage.ts`

Remove the `placeIndex` export. SST will destroy the Place Index on next deploy.

- [ ] **Step 1: Edit `infra/storage.ts`**

Remove these lines (lines 18–25 currently):
```typescript
// Amazon Location Services — Place Index for POI discovery
export const placeIndex = new aws.location.PlaceIndex('TravylPlaceIndex', {
  indexName: $interpolate`travyl-places-${$app.stage}`,
  dataSource: 'Here',
  dataSourceConfiguration: {
    intendedUse: 'Storage',
  },
})
```

The full updated `infra/storage.ts`:
```typescript
// Recommendation cache
export const cacheTable = new sst.aws.Dynamo('RecommendationCache', {
  fields: {
    pk: 'string',   // {userId}:{destination}
    sk: 'string',   // {travelStyle}:{budgetTier}
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
})

// Activity images + Personalize training data
export const bucket = new sst.aws.Bucket('ActivityAssets')
```

### `infra/api.ts`

Three changes:
1. Remove `placeIndex` import
2. Remove `locationPolicy` definition
3. Remove `permissions` + `PLACE_INDEX_NAME` from both routes
4. Add `foursquareApiKey` to the `/search` route's `link` array

- [ ] **Step 2: Edit `infra/api.ts`**

The full updated `infra/api.ts`:
```typescript
import { cacheTable } from './storage'
import { bus } from './events'
import { supabaseServiceRoleKey, supabaseUrl, foursquareApiKey } from './secrets'

export const api = new sst.aws.ApiGatewayV2('RecommendationApi', {
  cors: {
    allowOrigins: ['*'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
  },
})

api.route('GET /suggest', {
  handler: 'services/suggest.handler',
  link: [cacheTable, supabaseServiceRoleKey, supabaseUrl, foursquareApiKey],
})

api.route('GET /search', {
  handler: 'services/search.handler',
  link: [supabaseServiceRoleKey, supabaseUrl, foursquareApiKey],
})

api.route('POST /interact', {
  handler: 'services/interact.handler',
  link: [bus, supabaseServiceRoleKey, supabaseUrl],
})
```

- [ ] **Step 3: Commit**

```bash
git add infra/storage.ts infra/api.ts
git commit -m "chore: remove Amazon Location Place Index and IAM policy from infra; add foursquareApiKey to /search route"
```

---

## Task 5: Deploy and verify

- [ ] **Step 1: Run `sst deploy`**

```bash
npx sst deploy --stage production
```

Expected: deployment completes, outputs `apiUrl`. The Place Index will be destroyed. New Lambda bundles (without Amazon Location SDK) will be deployed.

If the deploy fails due to the Place Index destruction (e.g. it has dependent resources), check the SST/Pulumi output and manually delete the Place Index from the AWS Console under Location Services before re-running.

- [ ] **Step 2: Confirm the API URL matches `.env.local`**

The deploy output will show the `apiUrl`. Verify it matches `NEXT_PUBLIC_RECOMMENDATION_API_URL` in `apps/web/.env.local`:
```
NEXT_PUBLIC_RECOMMENDATION_API_URL=https://zp5ghw4drj.execute-api.us-east-1.amazonaws.com
```

If the URL changed (unlikely for an existing stack), update `.env.local`.

- [ ] **Step 3: Test the `/suggest` endpoint directly**

Get a valid Supabase JWT by signing in via the app dev server and copying it from browser devtools (Application → Local Storage → `sb-<project>-auth-token` → `access_token`). Then:

```bash
curl -s \
  "https://zp5ghw4drj.execute-api.us-east-1.amazonaws.com/suggest?destination=Paris" \
  -H "Authorization: Bearer <your-token>" | jq '.suggestions | length, .[0].name, .[0].imageUrl'
```

Expected: a count > 0, a place name like `"Eiffel Tower"`, and a non-empty `imageUrl` (Foursquare CDN URL).

If count is 0: check CloudWatch logs for the Lambda (`sst dev` shows live logs — start `npx sst dev` and hit the endpoint again to see output).

- [ ] **Step 4: Verify the For You panel in the browser**

```bash
npm run web
```

Open a trip in the browser. The For You panel should show activity suggestion cards instead of the empty state.

- [ ] **Step 5: Update PLANNING.md**

In `PLANNING.md`, under the `feature/tra-205 — For You Panel + SST Recommendation Engine` section, move the following items from "Deferred" to "Completed":
- SST infrastructure setup
- DynamoDB cache layer
- Lambda function: suggest (Foursquare direct search)

- [ ] **Step 6: Commit**

Note: `.env.local` is gitignored — do not commit it. Only commit `PLANNING.md`.

```bash
git add PLANNING.md
git commit -m "chore: update PLANNING.md — Foursquare suggest migration complete"
```
