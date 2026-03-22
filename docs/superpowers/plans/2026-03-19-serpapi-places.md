# SerpAPI Google Local — Places Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Foursquare integration with SerpAPI's Google Local API, with per-category server-side queries and a shared (non-user-scoped) cache.

**Architecture:** Replace `services/lib/foursquare.ts` with `services/lib/serpapi.ts` that calls `https://serpapi.com/search.json?engine=google_local`. Update the cache key from `(userId, destination)` to `(destination, category)`. Thread the active filter category from the hook through the Lambda so each filter chip fetches targeted results.

**Tech Stack:** TypeScript, AWS Lambda (SST v4), DynamoDB (DynamoDB Document Client), React Query, Next.js 16

**Spec:** `docs/superpowers/specs/2026-03-19-serpapi-places-design.md`

---

## Chunk 1: Infra + SerpAPI Module

### Task 1: Update SST secrets and API infra

**Files:**
- Modify: `infra/secrets.ts`
- Modify: `infra/api.ts`

- [ ] **Step 1: Replace `FoursquareApiKey` with `SerpApiKey` in secrets**

In `infra/secrets.ts`, replace:
```ts
export const foursquareApiKey = new sst.Secret('FoursquareApiKey')
```
With:
```ts
export const serpApiKey = new sst.Secret('SerpApiKey')
```

- [ ] **Step 2: Update the `/suggest` route link in api.ts**

In `infra/api.ts`, find the `api.route('GET /suggest', ...)` block. Replace `foursquareApiKey` with `serpApiKey` in the `link` array:
```ts
api.route('GET /suggest', {
  handler: 'services/suggest.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey],
})
```

Also update the import at the top of the file from:
```ts
import { supabaseSecretKey, supabaseUrl, foursquareApiKey } from './secrets'
```
To:
```ts
import { supabaseSecretKey, supabaseUrl, serpApiKey } from './secrets'
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add infra/secrets.ts infra/api.ts
git commit -m "feat: replace FoursquareApiKey secret with SerpApiKey"
```

---

### Task 2: Create SerpAPI module and delete Foursquare

**Files:**
- Create: `services/lib/serpapi.ts`
- Delete: `services/lib/foursquare.ts`

- [ ] **Step 1: Create `services/lib/serpapi.ts`**

```ts
import { Resource } from 'sst'
import type { SuggestionCard } from './types'

const SERPAPI_BASE = 'https://serpapi.com/search.json'

/** Maps category slugs to natural language search queries */
const CATEGORY_QUERIES: Record<string, string> = {
  all: 'top things to do',
  sightseeing: 'top tourist attractions',
  dining: 'best restaurants',
  nightlife: 'best bars and nightlife',
  cultural: 'museums and cultural sites',
  shopping: 'shopping',
  outdoor: 'outdoor activities',
  tour: 'guided tours and excursions',
}

interface SerpLocalResult {
  place_id?: string
  title: string
  thumbnail?: string
  rating?: number
  price?: string
  description?: string
  address?: string
  gps_coordinates?: { latitude: number; longitude: number }
}

interface SerpLocalResponse {
  local_results?: SerpLocalResult[]
}

function getApiKey(): string {
  return Resource.SerpApiKey.value
}

function mapPrice(price: string | undefined): number | null {
  if (!price) return null
  const map: Record<string, number> = { '$': 10, '$$': 25, '$$$': 50, '$$$$': 100 }
  return map[price] ?? null
}

function toSuggestionCard(place: SerpLocalResult, category: string, index: number): SuggestionCard {
  return {
    id: `serp-${place.place_id ?? index}`,
    name: place.title,
    category,
    imageUrl: place.thumbnail ?? '',
    duration: 2,
    price: mapPrice(place.price),
    currency: 'USD',
    rating: place.rating ?? null,
    location: place.address ?? '',
    latitude: place.gps_coordinates?.latitude ?? 0,
    longitude: place.gps_coordinates?.longitude ?? 0,
    description: place.description ?? '',
    source: 'ai',
    relevanceScore: Math.max(0, 1 - index * 0.05),
  }
}

/**
 * Search for places near a destination using SerpAPI Google Local.
 * Category maps to a targeted query (e.g. "dining" → "best restaurants").
 * Returns results mapped to SuggestionCard format.
 */
export async function searchPlaces(
  destination: string,
  category: string,
  options?: { limit?: number },
): Promise<SuggestionCard[]> {
  const query = CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.all
  const limit = options?.limit ?? 10

  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_local')
  url.searchParams.set('q', query)
  url.searchParams.set('location', destination)
  url.searchParams.set('api_key', getApiKey())

  console.log('[serpapi] searching:', query, 'in', destination, '(category:', category, ')')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[serpapi] search failed: ${res.status} ${body}`)
      return []
    }

    const data = (await res.json()) as SerpLocalResponse
    const results = (data.local_results ?? []).slice(0, limit)
    console.log('[serpapi] got', results.length, 'results')
    return results.map((place, i) => toSuggestionCard(place, category, i))
  } catch (err) {
    console.error('[serpapi] search error:', err)
    return []
  }
}
```

- [ ] **Step 2: Delete `services/lib/foursquare.ts`**

```bash
git rm services/lib/foursquare.ts
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: No new errors (foursquare.ts is imported in suggest.ts — that will error until Task 4)

> Note: if typecheck fails only because `suggest.ts` still imports from `./lib/foursquare`, that is expected and will be fixed in Task 4. Confirm the only errors are import-not-found on foursquare.

- [ ] **Step 4: Commit**

```bash
git add services/lib/serpapi.ts
git rm services/lib/foursquare.ts
git commit -m "feat: replace Foursquare module with SerpAPI Google Local"
```

---

## Chunk 2: Cache + Lambda

### Task 3: Update cache key

**Files:**
- Modify: `services/lib/cache.ts`

The cache key currently uses `userId` to namespace results per user. Place results don't vary by user, so we remove `userId` and add `category` instead. This means all users looking at "Dining in Paris" share one cache entry.

- [ ] **Step 1: Update `getCachedSuggestions` signature and key**

Replace the entire `getCachedSuggestions` function:
```ts
export async function getCachedSuggestions(
  destination: string,
  category: string,
): Promise<SuggestionCard[] | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: `${destination}:${category}`, sk: 'suggestions' },
    }),
  )

  if (!result.Item) return null
  const entry = result.Item as CacheEntry
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.suggestions
}
```

- [ ] **Step 2: Update `setCachedSuggestions` signature and key**

Replace the entire `setCachedSuggestions` function:
```ts
export async function setCachedSuggestions(
  destination: string,
  category: string,
  suggestions: SuggestionCard[],
  ttlSeconds: number = 1800, // 30 min default
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: `${destination}:${category}`,
        sk: 'suggestions',
        suggestions,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: Errors in `suggest.ts` only (it still calls the old signatures — fixed in Task 4)

- [ ] **Step 4: Commit**

```bash
git add services/lib/cache.ts
git commit -m "feat: update suggestion cache key to (destination, category)"
```

---

### Task 4: Update the suggest Lambda

**Files:**
- Modify: `services/suggest.ts`

- [ ] **Step 1: Replace import and add category param**

Replace the full contents of `services/suggest.ts`:

```ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { getCachedSuggestions, setCachedSuggestions } from './lib/cache'
import { searchPlaces } from './lib/serpapi'
import type { SuggestResponse } from './lib/types'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const destination = event.queryStringParameters?.destination
    const category = event.queryStringParameters?.category ?? 'all'

    if (!destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'destination required' }) }
    }

    console.log('[suggest] destination:', destination, 'category:', category, 'userId:', userId)

    // Check cache first
    const cached = await getCachedSuggestions(destination, category)
    if (cached) {
      console.log('[suggest] cache hit, returning', cached.length, 'suggestions')
      const response: SuggestResponse = { suggestions: cached, source: 'cache' }
      return { statusCode: 200, body: JSON.stringify(response) }
    }

    console.log('[suggest] cache miss, calling SerpAPI')

    // Search SerpAPI for places matching category
    const suggestions = await searchPlaces(destination, category, { limit: 10 })

    console.log('[suggest] SerpAPI returned', suggestions.length, 'suggestions')

    // Cache results (30min default TTL)
    if (suggestions.length > 0) {
      await setCachedSuggestions(destination, category, suggestions)
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

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add services/suggest.ts
git commit -m "feat: accept category param in suggest Lambda, wire to SerpAPI"
```

---

## Chunk 3: Hook

### Task 5: Update `useSuggestions` hook

**Files:**
- Modify: `apps/web/components/calendar/hooks/useSuggestions.ts`

Key changes:
- Add `FILTER_TO_CATEGORY` map (filter label → slug)
- Remove `CATEGORY_MAP` and `CATEGORY_SEARCH_TERMS` (dead code)
- Update `fetchSuggestions` to accept and pass `category`
- Update `queryKey` to include `activeFilter`
- Remove client-side category filter block from `useMemo`

- [ ] **Step 1: Replace the full file contents**

```ts
// apps/web/components/calendar/hooks/useSuggestions.ts
'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@travyl/shared'
import { MOCK_SUGGESTIONS } from '@travyl/shared/config/mockSuggestions'
import type { SuggestionCard } from '../types'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

const FILTER_CATEGORIES = [
  'All',
  'Sightseeing',
  'Dining',
  'Tours',
  'Culture',
  'Shopping',
  'Nightlife',
  'Outdoor',
] as const

/** Maps filter chip labels to category slugs sent to the API */
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

export type FilterCategory = (typeof FILTER_CATEGORIES)[number]

interface UseSuggestionsOptions {
  destination: string
  scheduledActivityIds?: string[]
}

interface UseSuggestionsReturn {
  suggestions: SuggestionCard[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeFilter: FilterCategory
  setActiveFilter: (filter: FilterCategory) => void
  filterCategories: readonly FilterCategory[]
  removeSuggestion: (id: string) => void
  restoreSuggestion: (id: string) => void
  refetch: () => void
}

async function fetchSuggestions(
  destination: string,
  token: string,
  category: string,
): Promise<SuggestionCard[]> {
  if (!API_URL) {
    console.warn('[ForYou] NEXT_PUBLIC_RECOMMENDATION_API_URL not set — using mock data')
    return MOCK_SUGGESTIONS
  }

  const url = `${API_URL}/suggest?destination=${encodeURIComponent(destination)}&category=${encodeURIComponent(category)}`
  console.log('[ForYou] fetching:', url)

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    console.log('[ForYou] response status:', res.status)

    if (!res.ok) {
      const body = await res.text()
      console.error('[ForYou] error body:', body)
      throw new Error(`Failed to fetch suggestions (${res.status})`)
    }

    const data = await res.json()
    console.log('[ForYou] got', data.suggestions?.length ?? 0, 'suggestions, source:', data.source)
    return data.suggestions ?? []
  } catch (err) {
    console.warn('[ForYou] API unavailable, falling back to mock data:', (err as Error).message)
    return MOCK_SUGGESTIONS
  }
}

export function useSuggestions({
  destination,
  scheduledActivityIds = [],
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const token = useAuthStore((s) => s.session?.access_token)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  console.log('[ForYou] destination:', destination, 'filter:', activeFilter, 'token:', token ? 'present' : 'missing', 'API_URL:', API_URL)

  const { data: allSuggestions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['suggestions', destination, activeFilter],
    queryFn: () => fetchSuggestions(destination, token!, FILTER_TO_CATEGORY[activeFilter] ?? 'all'),
    enabled: !!destination && !!token,
    staleTime: 30 * 60 * 1000, // 30 min — matches backend DynamoDB cache TTL
    refetchOnMount: true,
    retry: 2,
    retryDelay: 1000,
  })

  const removeSuggestion = useCallback((id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id))
  }, [])

  const restoreSuggestion = useCallback((id: string) => {
    setRemovedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const suggestions = useMemo(() => {
    let filtered = allSuggestions.filter(
      (s) => !removedIds.has(s.id) && !scheduledActivityIds.includes(s.id),
    )

    // Text search — filters by name, description, location
    // (category filtering is handled server-side via the category param)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
      )
    }

    return filtered
  }, [allSuggestions, searchQuery, removedIds, scheduledActivityIds])

  return {
    suggestions,
    isLoading,
    error: error ? (error as Error).message : null,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterCategories: FILTER_CATEGORIES,
    removeSuggestion,
    restoreSuggestion,
    refetch,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useSuggestions.ts
git commit -m "feat: pass activeFilter category to suggest API, remove client-side category filtering"
```

---

## Post-Implementation

- [ ] **Set the SerpAPI secret**

```bash
npx sst secret set SerpApiKey <your-serpapi-key>
```

- [ ] **Deploy**

```bash
npx sst deploy
```

- [ ] **Smoke test**

Navigate to any trip's For You panel. Verify:
- "All" tab loads results (Google Local "top things to do" results)
- Switching to "Dining" fetches a new set of restaurant results
- Switching to "Sightseeing" fetches attraction results
- Text search filters within the current category's results
- Second visit to the same filter loads from cache (check Lambda logs for "cache hit")
