# Spotlight Search + Entity Detail Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the command palette with a unified spotlight search across all entity types, and add dedicated detail pages for hotels, flights, restaurants, and activities.

**Architecture:** Two independent workstreams — (1) backend search infrastructure (Supabase RPC + SST Lambda) feeding a new `useSpotlightSearch` hook and `SpotlightSearch` component that replaces `GlobalCommandPalette`, and (2) four entity detail pages sharing common layout components (`EntityHero`, `EntityActionsBar`, `EntityMap`, `EntityBreadcrumb`). Both workstreams connect when spotlight search results link to detail pages.

**Tech Stack:** Supabase (pg_trgm, RPC), SST v3 Lambda, React Query v5, Framer Motion, Leaflet (dynamic), Tailwind 4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-25-spotlight-search-entity-details-design.md`

---

## File Structure

### New files

```
supabase/migrations/YYYYMMDDHHMMSS_entity_search.sql     — pg_trgm + search_entities RPC
services/entity-search.ts                                  — GET /entity-search Lambda handler
apps/web/hooks/useSpotlightSearch.ts                       — orchestrating search hook
apps/web/components/spotlight/SpotlightSearch.tsx           — root overlay (replaces GlobalCommandPalette)
apps/web/components/spotlight/SpotlightInput.tsx            — search input with keyboard hint
apps/web/components/spotlight/SpotlightResults.tsx          — grouped result list
apps/web/components/spotlight/SpotlightResultGroup.tsx      — category header + items
apps/web/components/spotlight/SpotlightResultItem.tsx       — individual result row
apps/web/components/spotlight/SpotlightEmptyState.tsx       — recent searches + quick links
apps/web/components/entity/EntityHero.tsx                   — shared image hero with breadcrumb
apps/web/components/entity/EntityActionsBar.tsx             — shared Edit/Remove/Share/Favorite bar
apps/web/components/entity/EntityMap.tsx                    — shared Leaflet map wrapper for detail pages
apps/web/components/entity/EntityBreadcrumb.tsx             — shared "← Back to X" breadcrumb
apps/web/components/entity/EntitySection.tsx                — shared collapsible detail section
apps/web/app/(trips-app)/trip/[id]/hotels/[hotelId]/page.tsx
apps/web/app/(trips-app)/trip/[id]/flights/[flightId]/page.tsx
apps/web/app/(trips-app)/trip/[id]/restaurants/[restaurantId]/page.tsx
apps/web/app/(trips-app)/trip/[id]/activities/[activityId]/page.tsx
packages/shared/src/utils/entitySearch.test.ts             — tests for search result merging/dedup
```

### Modified files

```
infra/api.ts                                               — add GET /entity-search route
apps/web/components/providers.tsx                           — swap GlobalCommandPalette → SpotlightSearch
apps/web/components/itinerary/HotelCard.tsx                — wrap in Link to detail page
apps/web/components/itinerary/FlightCard.tsx               — wrap in Link to detail page
apps/web/app/(trips-app)/trip/[id]/restaurants/page.tsx    — card onClick → navigate to detail
apps/web/app/(trips-app)/trip/[id]/activities/page.tsx     — card onClick → navigate to detail
```

### Removed files

```
apps/web/components/GlobalCommandPalette.tsx               — replaced by SpotlightSearch
```

---

## Task 1: Database Migration — pg_trgm + search_entities RPC

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_entity_search.sql`

**Parallel:** Can run in parallel with Tasks 5-9 (entity detail pages).

- [ ] **Step 1: Write the migration SQL**

Create the migration file. Use `apply_migration` via Supabase MCP.

```sql
-- Enable pg_trgm if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexes for entity search
CREATE INDEX IF NOT EXISTS idx_hotels_data_name
  ON hotels USING gin ((data->>'name') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_flights_data_airline
  ON flights USING gin ((data->>'airline') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_flights_data_flight_number
  ON flights USING gin ((data->>'flight_number') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_flights_data_origin_iata
  ON flights ((data->>'origin_iata'));
CREATE INDEX IF NOT EXISTS idx_flights_data_dest_iata
  ON flights ((data->>'dest_iata'));
CREATE INDEX IF NOT EXISTS idx_activity_name_trgm
  ON activity USING gin (activity_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_trips_destination_trgm
  ON trips USING gin (destination gin_trgm_ops);

-- search_entities RPC
CREATE OR REPLACE FUNCTION search_entities(
  query TEXT,
  match_user_id UUID,
  entity_types TEXT[] DEFAULT ARRAY['hotel','flight','restaurant','activity','destination'],
  match_trip_id UUID DEFAULT NULL,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  entity_id UUID,
  entity_type TEXT,
  entity_name TEXT,
  entity_subtitle TEXT,
  trip_id UUID,
  trip_title TEXT,
  trip_destination TEXT,
  image_url TEXT,
  score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY

  -- Hotels
  SELECT h.id, 'hotel'::TEXT, (h.data->>'name')::TEXT,
         (h.data->>'address')::TEXT,
         h.trip_id, t.title, t.destination,
         (h.data->>'image_url')::TEXT,
         CASE WHEN h.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END
  FROM hotels h
  JOIN trips t ON h.trip_id = t.id
  WHERE t.user_id = match_user_id
    AND 'hotel' = ANY(entity_types)
    AND (
      h.data->>'name' ILIKE '%' || query || '%'
      OR h.data->>'address' ILIKE '%' || query || '%'
      OR h.data->>'booking_ref' ILIKE '%' || query || '%'
    )

  UNION ALL

  -- Flights
  SELECT f.id, 'flight'::TEXT,
         ((f.data->>'airline') || ' ' || COALESCE(f.data->>'flight_number', ''))::TEXT,
         ((f.data->>'origin_iata') || ' → ' || (f.data->>'dest_iata'))::TEXT,
         f.trip_id, t.title, t.destination,
         NULL::TEXT,
         CASE WHEN f.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END
  FROM flights f
  JOIN trips t ON f.trip_id = t.id
  WHERE t.user_id = match_user_id
    AND 'flight' = ANY(entity_types)
    AND (
      f.data->>'airline' ILIKE '%' || query || '%'
      OR f.data->>'flight_number' ILIKE '%' || query || '%'
      OR f.data->>'origin_iata' ILIKE '%' || query || '%'
      OR f.data->>'dest_iata' ILIKE '%' || query || '%'
    )

  UNION ALL

  -- Restaurants (activity_type = 'food')
  SELECT a.id, 'restaurant'::TEXT, a.activity_name,
         (a.activity_data->>'location_name')::TEXT,
         a.trip_id, t.title, t.destination,
         (a.activity_data->>'image_url')::TEXT,
         CASE WHEN a.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END
  FROM activity a
  JOIN trips t ON a.trip_id = t.id
  WHERE t.user_id = match_user_id
    AND 'restaurant' = ANY(entity_types)
    AND a.activity_type = 'food'
    AND (
      a.activity_name ILIKE '%' || query || '%'
      OR a.notes ILIKE '%' || query || '%'
      OR a.activity_data->>'location_name' ILIKE '%' || query || '%'
    )

  UNION ALL

  -- Activities (non-food, non-hotel)
  SELECT a.id, 'activity'::TEXT, a.activity_name,
         (a.activity_data->>'location_name')::TEXT,
         a.trip_id, t.title, t.destination,
         (a.activity_data->>'image_url')::TEXT,
         CASE WHEN a.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END
  FROM activity a
  JOIN trips t ON a.trip_id = t.id
  WHERE t.user_id = match_user_id
    AND 'activity' = ANY(entity_types)
    AND a.activity_type NOT IN ('food', 'hotel')
    AND (
      a.activity_name ILIKE '%' || query || '%'
      OR a.notes ILIKE '%' || query || '%'
      OR a.activity_data->>'location_name' ILIKE '%' || query || '%'
      OR a.activity_data->>'category' ILIKE '%' || query || '%'
    )

  UNION ALL

  -- Destinations (grouped)
  SELECT gen_random_uuid(), 'destination'::TEXT, t.destination,
         (COUNT(*)::TEXT || ' trips')::TEXT,
         NULL::UUID, NULL::TEXT, t.destination,
         NULL::TEXT, 1.0
  FROM trips t
  WHERE t.user_id = match_user_id
    AND 'destination' = ANY(entity_types)
    AND t.destination ILIKE '%' || query || '%'
  GROUP BY t.destination

  ORDER BY score DESC
  LIMIT match_count;
END;
$$;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Run: `apply_migration` with name `entity_search` and the SQL above.

- [ ] **Step 3: Verify the RPC works**

Run via `execute_sql`:
```sql
SELECT * FROM search_entities('Paris', '<your-user-id>', ARRAY['destination'], NULL, 5);
```
Expected: Returns destination rows matching "Paris".

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/*entity_search*
git commit -m "feat: add search_entities RPC and pg_trgm indexes for spotlight search"
```

---

## Task 2: entity-search Lambda + SST Route

**Files:**
- Create: `services/entity-search.ts`
- Modify: `infra/api.ts`

**Depends on:** Task 1 (migration must be applied).

- [ ] **Step 1: Create the Lambda handler**

Create `services/entity-search.ts`. Follow the pattern from `services/context-search.ts`:

```typescript
import { Resource } from 'sst'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'

interface EntitySearchResult {
  entity_id: string
  entity_type: string
  entity_name: string
  entity_subtitle: string | null
  trip_id: string | null
  trip_title: string | null
  trip_destination: string | null
  image_url: string | null
  score: number
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    const query = event.queryStringParameters?.q
    const typesParam = event.queryStringParameters?.types
    const tripId = event.queryStringParameters?.tripId || null

    if (!query || query.length < 3) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Query must be at least 3 characters' }),
      }
    }

    const entityTypes = typesParam
      ? typesParam.split(',').filter(Boolean)
      : ['hotel', 'flight', 'restaurant', 'activity', 'destination']

    const supabase = createClient(
      Resource.SupabaseUrl.value,
      Resource.SupabaseSecretKey.value,
    )

    const { data, error } = await supabase.rpc('search_entities', {
      query,
      match_user_id: userId,
      entity_types: entityTypes,
      match_trip_id: tripId,
      match_count: 20,
    })

    if (error) {
      console.error('entity-search RPC error:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Search failed' }),
      }
    }

    // Group results by entity_type
    const grouped: Record<string, EntitySearchResult[]> = {}
    for (const row of (data as EntitySearchResult[]) ?? []) {
      if (!grouped[row.entity_type]) grouped[row.entity_type] = []
      grouped[row.entity_type].push(row)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ results: grouped }),
    }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('entity-search error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [ ] **Step 2: Add the SST route**

In `infra/api.ts`, after the `GET /context-search` route block, add:

```typescript
api.route('GET /entity-search', {
  handler: 'services/entity-search.handler',
  link: [supabaseSecretKey, supabaseUrl],
})
```

- [ ] **Step 3: Verify Lambda builds**

Run: `npx sst build` (or `npx sst dev` if already running)
Expected: No TypeScript compilation errors.

- [ ] **Step 4: Commit**

```bash
git add services/entity-search.ts infra/api.ts
git commit -m "feat: add entity-search Lambda for spotlight search"
```

---

## Task 3: useSpotlightSearch Hook

**Files:**
- Create: `apps/web/hooks/useSpotlightSearch.ts`
- Create: `packages/shared/src/utils/entitySearch.test.ts`

**Depends on:** Task 2 (Lambda must exist for type reference, but hook can be built with mocked responses).

- [ ] **Step 1: Write tests for result merging and dedup logic**

Create `packages/shared/src/utils/entitySearch.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mergeSearchResults, deduplicateResults } from './entitySearch'
import type { SpotlightResult } from './entitySearch'

const tripResult: SpotlightResult = {
  id: 'trip-1',
  type: 'trip',
  title: 'Paris Trip',
  subtitle: 'France',
  href: '/trip/trip-1',
  score: 0.9,
}

const hotelResult: SpotlightResult = {
  id: 'hotel-1',
  type: 'hotel',
  title: 'Le Marais Hotel',
  subtitle: '123 Rue de Rivoli',
  tripId: 'trip-1',
  tripTitle: 'Paris Trip',
  href: '/trip/trip-1/hotels/hotel-1',
  score: 1.5,
}

const dupHotelResult: SpotlightResult = {
  ...hotelResult,
  score: 1.0, // lower score duplicate
}

describe('mergeSearchResults', () => {
  it('merges results from multiple sources into grouped record', () => {
    const tripResults = { trip: [tripResult] }
    const entityResults = { hotel: [hotelResult] }
    const merged = mergeSearchResults([tripResults, entityResults])
    expect(merged.trip).toHaveLength(1)
    expect(merged.hotel).toHaveLength(1)
  })

  it('caps results at maxPerCategory', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      ...hotelResult,
      id: `hotel-${i}`,
    }))
    const merged = mergeSearchResults([{}, { hotel: many }], { maxPerCategory: 3 })
    expect(merged.hotel).toHaveLength(3)
  })

  it('deduplicates within categories keeping higher score', () => {
    const merged = mergeSearchResults([{ hotel: [hotelResult] }, { hotel: [dupHotelResult] }])
    expect(merged.hotel).toHaveLength(1)
    expect(merged.hotel[0].score).toBe(1.5)
  })
})

describe('deduplicateResults', () => {
  it('removes duplicates keeping higher score', () => {
    const results = [hotelResult, dupHotelResult]
    const deduped = deduplicateResults(results)
    expect(deduped).toHaveLength(1)
    expect(deduped[0].score).toBe(1.5)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npm test -- --run`
Expected: FAIL — module `./entitySearch` not found.

- [ ] **Step 3: Implement the merge/dedup utility**

Create `packages/shared/src/utils/entitySearch.ts`:

```typescript
export interface SpotlightResult {
  id: string
  type: 'trip' | 'hotel' | 'flight' | 'restaurant' | 'activity' | 'destination' | 'navigation' | 'command' | 'setting'
  title: string
  subtitle: string
  imageUrl?: string
  tripId?: string
  tripTitle?: string
  href: string
  score: number
}

export function mergeSearchResults(
  sources: Record<string, SpotlightResult[]>[],
  options?: { maxPerCategory?: number },
): Record<string, SpotlightResult[]> {
  const maxPerCategory = options?.maxPerCategory ?? Infinity
  const merged: Record<string, SpotlightResult[]> = {}
  for (const source of sources) {
    for (const [type, items] of Object.entries(source)) {
      if (!merged[type]) merged[type] = []
      merged[type].push(...items)
    }
  }
  // Deduplicate within each category, sort by score desc, cap
  for (const type of Object.keys(merged)) {
    merged[type] = deduplicateResults(merged[type])
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPerCategory)
  }
  return merged
}

export function deduplicateResults(results: SpotlightResult[]): SpotlightResult[] {
  const seen = new Map<string, SpotlightResult>()
  for (const r of results) {
    const existing = seen.get(r.id)
    if (!existing || r.score > existing.score) {
      seen.set(r.id, r)
    }
  }
  return Array.from(seen.values())
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/shared && npm test -- --run`
Expected: All tests PASS.

- [ ] **Step 5: Export from shared package barrel**

In `packages/shared/src/index.ts`, add:

```typescript
export { mergeSearchResults, deduplicateResults, type SpotlightResult } from './utils/entitySearch'
```

- [ ] **Step 6: Create the useSpotlightSearch hook**

Create `apps/web/hooks/useSpotlightSearch.ts`:

```typescript
'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, usePathname } from 'next/navigation'
import { useAuthStore } from '@travyl/shared'
import { useContextSearch } from './useContextSearch'
import { mergeSearchResults, deduplicateResults, type SpotlightResult } from '@travyl/shared'

const RECENT_SEARCHES_KEY = 'travyl:recentSearches'
const MAX_RECENT = 10

// Static navigation items (migrated from GlobalCommandPalette)
const NAV_ITEMS: SpotlightResult[] = [
  { id: 'nav-home', type: 'navigation', title: 'Home', subtitle: 'Discover destinations', href: '/', score: 1 },
  { id: 'nav-trips', type: 'navigation', title: 'My Trips', subtitle: 'View all trips', href: '/trips', score: 1 },
  { id: 'nav-places', type: 'navigation', title: 'Places', subtitle: 'Browse places', href: '/places', score: 1 },
  { id: 'nav-explore', type: 'navigation', title: 'Explore', subtitle: 'Explore destinations', href: '/explore', score: 1 },
  { id: 'nav-profile', type: 'navigation', title: 'Profile', subtitle: 'Your profile', href: '/profile', score: 1 },
  { id: 'nav-settings', type: 'navigation', title: 'Settings', subtitle: 'App settings', href: '/profile/settings', score: 1 },
]

async function fetchEntitySearch(
  query: string,
  types: string[] | null,
  tripId: string | null,
  token: string,
): Promise<Record<string, SpotlightResult[]>> {
  const params = new URLSearchParams({ q: query })
  if (types) params.set('types', types.join(','))
  if (tripId) params.set('tripId', tripId)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const res = await fetch(`${apiUrl}/entity-search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return {}

  const { results } = await res.json() as {
    results: Record<string, Array<{
      entity_id: string
      entity_type: string
      entity_name: string
      entity_subtitle: string | null
      trip_id: string | null
      trip_title: string | null
      trip_destination: string | null
      image_url: string | null
      score: number
    }>>
  }

  // Transform API results to SpotlightResult
  const mapped: Record<string, SpotlightResult[]> = {}
  for (const [type, items] of Object.entries(results)) {
    mapped[type] = items.map((item) => ({
      id: item.entity_id,
      type: item.entity_type as SpotlightResult['type'],
      title: item.entity_name,
      subtitle: item.entity_subtitle ?? item.trip_title ?? '',
      imageUrl: item.image_url ?? undefined,
      tripId: item.trip_id ?? undefined,
      tripTitle: item.trip_title ?? undefined,
      href: buildHref(item.entity_type, item.entity_id, item.trip_id),
      score: item.score,
    }))
  }
  return mapped
}

function buildHref(type: string, entityId: string, tripId: string | null): string {
  if (!tripId) return '/' // destinations have no trip context
  switch (type) {
    case 'hotel': return `/trip/${tripId}/hotels/${entityId}`
    case 'flight': return `/trip/${tripId}/flights/${entityId}`
    case 'restaurant': return `/trip/${tripId}/restaurants/${entityId}`
    case 'activity': return `/trip/${tripId}/activities/${entityId}`
    case 'destination': return `/trips` // link to trips filtered by destination
    default: return '/'
  }
}

export function useSpotlightSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const token = useAuthStore((s) => s.session?.access_token)
  const pathname = usePathname()
  const params = useParams()

  // Detect if we're inside a trip context
  const tripId = (params?.id as string) ?? null
  const isInTripContext = pathname?.includes('/trip/') ?? false

  // Debounce query for entity search (context-search has its own debounce)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const shouldSearch = debouncedQuery.length >= 3 && !!token

  // Existing context-search for trips (vector-powered)
  // Note: useContextSearch has its own 300ms internal debounce, so pass raw query
  // to avoid double-debouncing. Entity search uses our debouncedQuery.
  const { results: tripSearchResults, isLoading: tripSearchLoading } = useContextSearch(query)

  // New entity-search for hotels, flights, restaurants, activities, destinations
  const { data: entityResults, isLoading: entityLoading } = useQuery({
    queryKey: ['entity-search', debouncedQuery, tripId],
    queryFn: () => fetchEntitySearch(debouncedQuery, null, tripId, token!),
    enabled: shouldSearch,
    staleTime: 30_000,
  })

  // Client-side filter for navigation items
  const navResults = useMemo(() => {
    if (debouncedQuery.length < 1) return {}
    const q = debouncedQuery.toLowerCase()
    const matched = NAV_ITEMS.filter(
      (item) => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q),
    )
    return matched.length ? { navigation: matched } : {}
  }, [debouncedQuery])

  // Transform trip search results into SpotlightResult format
  const tripResults = useMemo(() => {
    if (!tripSearchResults?.length) return {}
    return {
      trip: tripSearchResults.map((r: any) => ({
        id: r.tripId,
        type: 'trip' as const,
        title: r.title,
        subtitle: r.destination,
        imageUrl: r.imageUrl ?? undefined,
        tripId: r.tripId,
        href: `/trip/${r.tripId}`,
        score: r.score,
      })),
    }
  }, [tripSearchResults])

  // Merge all sources
  const results = useMemo(() => {
    return mergeSearchResults([tripResults, entityResults ?? {}, navResults], { maxPerCategory: 3 })
  }, [tripResults, entityResults, navResults])

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
    } catch { return [] }
  })

  const addRecentSearch = useCallback((q: string) => {
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((s) => s !== q)].slice(0, MAX_RECENT)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearRecent = useCallback(() => {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
    setRecentSearches([])
  }, [])

  return {
    query,
    setQuery,
    results,
    isLoading: tripSearchLoading || entityLoading,
    recentSearches,
    addRecentSearch,
    clearRecent,
    isInTripContext,
    tripId,
  }
}
```

- [ ] **Step 7: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/utils/entitySearch.ts packages/shared/src/utils/entitySearch.test.ts packages/shared/src/index.ts apps/web/hooks/useSpotlightSearch.ts
git commit -m "feat: add useSpotlightSearch hook with entity search, merge, and dedup"
```

---

## Task 4: SpotlightSearch Component Suite

**Files:**
- Create: `apps/web/components/spotlight/SpotlightSearch.tsx`
- Create: `apps/web/components/spotlight/SpotlightInput.tsx`
- Create: `apps/web/components/spotlight/SpotlightResults.tsx`
- Create: `apps/web/components/spotlight/SpotlightResultGroup.tsx`
- Create: `apps/web/components/spotlight/SpotlightResultItem.tsx`
- Create: `apps/web/components/spotlight/SpotlightEmptyState.tsx`

**Depends on:** Task 3 (hook must exist).

- [ ] **Step 1: Create SpotlightResultItem**

Smallest unit. Renders a single search result row.

```typescript
'use client'

import { Building2, Plane, UtensilsCrossed, MapPin, Compass, ArrowRight, Settings, Terminal } from 'lucide-react'
import type { SpotlightResult } from '@travyl/shared'

const TYPE_ICONS: Record<string, React.ElementType> = {
  trip: Compass,
  hotel: Building2,
  flight: Plane,
  restaurant: UtensilsCrossed,
  activity: MapPin,
  destination: MapPin,
  navigation: ArrowRight,
  command: Terminal,
  setting: Settings,
}

interface Props {
  result: SpotlightResult
  isActive: boolean
  onClick: () => void
}

export function SpotlightResultItem({ result, isActive, onClick }: Props) {
  const Icon = TYPE_ICONS[result.type] ?? MapPin

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
        isActive ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      {result.imageUrl ? (
        <img src={result.imageUrl} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-gray-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{result.title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</div>
      </div>
      {result.tripTitle && result.type !== 'trip' && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{result.tripTitle}</span>
      )}
    </button>
  )
}
```

- [ ] **Step 2: Create SpotlightResultGroup**

Renders a category header + list of items.

```typescript
'use client'

import type { SpotlightResult } from '@travyl/shared'
import { SpotlightResultItem } from './SpotlightResultItem'

const TYPE_LABELS: Record<string, string> = {
  trip: 'Trips',
  hotel: 'Hotels',
  flight: 'Flights',
  restaurant: 'Restaurants',
  activity: 'Activities',
  destination: 'Destinations',
  navigation: 'Navigation',
  command: 'Commands',
  setting: 'Settings',
}

interface Props {
  type: string
  results: SpotlightResult[]
  activeIndex: number | null
  baseIndex: number
  onSelect: (result: SpotlightResult) => void
}

export function SpotlightResultGroup({ type, results, activeIndex, baseIndex, onSelect }: Props) {
  if (!results.length) return null

  return (
    <div className="px-2 pb-1">
      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {TYPE_LABELS[type] ?? type}
      </div>
      {results.map((result, i) => (
        <SpotlightResultItem
          key={result.id}
          result={result}
          isActive={activeIndex === baseIndex + i}
          onClick={() => onSelect(result)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create SpotlightEmptyState**

Shown when query is empty — shows recent searches and category quick links.

```typescript
'use client'

import { Clock, X, Building2, Plane, UtensilsCrossed, MapPin } from 'lucide-react'

interface Props {
  recentSearches: string[]
  onSelectRecent: (query: string) => void
  onClearRecent: () => void
}

const QUICK_CATEGORIES = [
  { label: 'Hotels', icon: Building2 },
  { label: 'Flights', icon: Plane },
  { label: 'Restaurants', icon: UtensilsCrossed },
  { label: 'Activities', icon: MapPin },
]

export function SpotlightEmptyState({ recentSearches, onSelectRecent, onClearRecent }: Props) {
  return (
    <div className="px-4 py-3">
      {recentSearches.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Recent</span>
            <button onClick={onClearRecent} className="text-[11px] text-gray-400 hover:text-gray-600">
              Clear
            </button>
          </div>
          {recentSearches.slice(0, 5).map((q) => (
            <button
              key={q}
              onClick={() => onSelectRecent(q)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md"
            >
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {q}
            </button>
          ))}
        </div>
      )}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">Browse</span>
        <div className="flex gap-2 flex-wrap">
          {QUICK_CATEGORIES.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => onSelectRecent(label.toLowerCase())}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create SpotlightInput**

```typescript
'use client'

import { Search, X, Loader2 } from 'lucide-react'
import { useRef, useEffect } from 'react'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  isLoading: boolean
}

export function SpotlightInput({ query, onQueryChange, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      {isLoading ? (
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
      ) : (
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search trips, hotels, flights..."
        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
      />
      {query && (
        <button onClick={() => onQueryChange('')} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      )}
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
        ESC
      </kbd>
    </div>
  )
}
```

- [ ] **Step 5: Create SpotlightResults**

Orchestrates groups and keyboard navigation. When inside a trip context, entity results (hotel, flight, restaurant, activity) are split into "In this trip" and "Other trips" sub-groups based on `result.tripId` matching the current trip.

```typescript
'use client'

import { useMemo } from 'react'
import type { SpotlightResult } from '@travyl/shared'
import { SpotlightResultGroup } from './SpotlightResultGroup'

// Display order for categories
const CATEGORY_ORDER = ['trip', 'hotel', 'flight', 'restaurant', 'activity', 'destination', 'navigation', 'command', 'setting']

interface Props {
  results: Record<string, SpotlightResult[]>
  activeIndex: number
  onSelect: (result: SpotlightResult) => void
}

export function SpotlightResults({ results, activeIndex, onSelect }: Props) {
  const orderedCategories = useMemo(() => {
    return CATEGORY_ORDER.filter((type) => results[type]?.length)
  }, [results])

  // Build flat index mapping for keyboard navigation
  let runningIndex = 0

  const isEmpty = orderedCategories.length === 0

  if (isEmpty) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-400">
        No results found
      </div>
    )
  }

  return (
    <div className="max-h-[400px] overflow-y-auto py-2">
      {orderedCategories.map((type) => {
        const baseIndex = runningIndex
        runningIndex += results[type].length
        return (
          <SpotlightResultGroup
            key={type}
            type={type}
            results={results[type]}
            activeIndex={activeIndex}
            baseIndex={baseIndex}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 6: Create SpotlightSearch (root component)**

This is the main overlay that replaces `GlobalCommandPalette`. Handles open/close, keyboard navigation, Ctrl+K binding.

```typescript
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import type { SpotlightResult } from '@travyl/shared'
import { useSpotlightSearch } from '@/hooks/useSpotlightSearch'
import { SpotlightInput } from './SpotlightInput'
import { SpotlightResults } from './SpotlightResults'
import { SpotlightEmptyState } from './SpotlightEmptyState'

const CATEGORY_ORDER = ['trip', 'hotel', 'flight', 'restaurant', 'activity', 'destination', 'navigation', 'command', 'setting']

export function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()
  const {
    query,
    setQuery,
    results,
    isLoading,
    recentSearches,
    addRecentSearch,
    clearRecent,
  } = useSpotlightSearch()

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    const flat: SpotlightResult[] = []
    for (const type of CATEGORY_ORDER) {
      if (results[type]) flat.push(...results[type])
    }
    return flat
  }, [results])

  // Ctrl+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [isOpen, setQuery])

  const handleSelect = useCallback(
    (result: SpotlightResult) => {
      if (query.length >= 3) addRecentSearch(query)
      setIsOpen(false)
      router.push(result.href)
    },
    [query, addRecentSearch, router],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatResults[activeIndex]) handleSelect(flatResults[activeIndex])
          break
        case 'Tab': {
          // Tab cycles to the next category group
          e.preventDefault()
          const categories = CATEGORY_ORDER.filter((t) => results[t]?.length)
          let runIdx = 0
          let currentCat = 0
          for (let c = 0; c < categories.length; c++) {
            if (activeIndex < runIdx + results[categories[c]].length) { currentCat = c; break }
            runIdx += results[categories[c]].length
          }
          const nextCat = (currentCat + (e.shiftKey ? -1 : 1) + categories.length) % categories.length
          let nextIdx = 0
          for (let c = 0; c < nextCat; c++) nextIdx += results[categories[c]].length
          setActiveIndex(nextIdx)
          break
        }
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
      }
    },
    [flatResults, activeIndex, handleSelect, results],
  )

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
            onKeyDown={handleKeyDown}
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <SpotlightInput
                query={query}
                onQueryChange={setQuery}
                isLoading={isLoading}
              />
              {query.length < 3 ? (
                <SpotlightEmptyState
                  recentSearches={recentSearches}
                  onSelectRecent={(q) => setQuery(q)}
                  onClearRecent={clearRecent}
                />
              ) : (
                <SpotlightResults
                  results={results}
                  activeIndex={activeIndex}
                  onSelect={handleSelect}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 7: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/spotlight/
git commit -m "feat: add SpotlightSearch component suite"
```

---

## Task 5: Wire SpotlightSearch into Layout + Remove GlobalCommandPalette

**Files:**
- Modify: `apps/web/components/providers.tsx` (where `GlobalCommandPalette` is imported/rendered)
- Remove: `apps/web/components/GlobalCommandPalette.tsx` (after verifying no other imports)

- [ ] **Step 1: Replace import in providers.tsx**

In `apps/web/components/providers.tsx`, change:
```typescript
// Before (line 7)
import { GlobalCommandPalette } from './GlobalCommandPalette';
// After
import { SpotlightSearch } from './spotlight/SpotlightSearch';
```

And replace the JSX (line 55):
```typescript
// Before
<GlobalCommandPalette />
// After
<SpotlightSearch />
```

Also check `CalendarDashboard.tsx` — it references `GlobalCommandPalette` in a comment about publishing commands to the global store. Update the comment but no import to change there.

- [ ] **Step 2: Migrate commands and settings data**

The existing `GlobalCommandPalette.tsx` defines static data arrays for commands and settings (toggle switches, color pickers, segmented controls, pill selectors). Before deleting it, migrate the relevant data:

1. Read `GlobalCommandPalette.tsx` and extract the `CONFIGURABLE_TABS`, settings items (type `SettingItem` with toggle/picker/link variants), and any calendar command integration via `useCalendarCommandsStore`.
2. Add a `commands` and `settings` source to `useSpotlightSearch` — filter them client-side like `NAV_ITEMS`.
3. For settings with interactive controls (toggles, pickers), the `SpotlightResultItem` needs to render inline controls instead of just a link. Add a `renderAction` prop or check `result.type === 'setting'` for special rendering.

This is the most complex migration step. Reference the existing component carefully.

- [ ] **Step 3: Delete GlobalCommandPalette.tsx**

```bash
rm apps/web/components/GlobalCommandPalette.tsx
```

- [ ] **Step 4: Verify build**

Run: `npm run typecheck`
Expected: No errors. No broken imports.

- [ ] **Step 5: Commit**

```bash
git add -u apps/web/
git commit -m "feat: replace GlobalCommandPalette with SpotlightSearch"
```

---

## Task 6: Shared Entity Detail Components

**Files:**
- Create: `apps/web/components/entity/EntityBreadcrumb.tsx`
- Create: `apps/web/components/entity/EntityHero.tsx`
- Create: `apps/web/components/entity/EntityActionsBar.tsx`
- Create: `apps/web/components/entity/EntityMap.tsx`
- Create: `apps/web/components/entity/EntitySection.tsx`

**Parallel:** Can run in parallel with Tasks 1-5.

- [ ] **Step 1: Create EntityBreadcrumb**

```typescript
'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Props {
  label: string
  href: string
}

export function EntityBreadcrumb({ label, href }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors mb-4"
    >
      <ChevronLeft className="w-4 h-4" />
      Back to {label}
    </Link>
  )
}
```

- [ ] **Step 2: Create EntityHero**

Image carousel (or single image) with overlay gradient. Carousel-ready but works with single image.

```typescript
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  images: string[]
  alt: string
  accentColor?: string // e.g. from ACTIVITY_TYPE_COLORS
}

export function EntityHero({ images, alt, accentColor }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const hasMultiple = images.length > 1

  if (!images.length) {
    return (
      <div
        className="w-full h-[280px] rounded-xl flex items-center justify-center"
        style={{ backgroundColor: accentColor ? `${accentColor}15` : '#f3f4f6' }}
      >
        <span className="text-gray-400 text-sm">No image available</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-[280px] rounded-xl overflow-hidden group">
      <img
        src={images[currentIndex]}
        alt={alt}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {hasMultiple && (
        <>
          <button
            onClick={() => setCurrentIndex((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentIndex((i) => (i + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create EntityActionsBar**

Fixed bottom bar with Edit, Remove, Share, Favorite.

```typescript
'use client'

import { Pencil, Trash2, Share2, Heart } from 'lucide-react'

interface Props {
  onEdit?: () => void
  onRemove?: () => void
  onShare?: () => void
  isFavorited?: boolean
  onToggleFavorite?: () => void
}

export function EntityActionsBar({ onEdit, onRemove, onShare, isFavorited, onToggleFavorite }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onEdit && (
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onShare && (
            <button onClick={onShare} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          )}
          {onToggleFavorite && (
            <button onClick={onToggleFavorite} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create EntityMap**

Wrapper around the existing Leaflet dynamic import pattern.

```typescript
'use client'

import dynamic from 'next/dynamic'

const LeafletMap = dynamic(() => import('@/components/leaflet-map').then((m) => m.default), { ssr: false })

interface Props {
  latitude: number
  longitude: number
  label?: string
  className?: string
}

export function EntityMap({ latitude, longitude, label, className }: Props) {
  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 ${className ?? 'h-[200px]'}`}>
      <LeafletMap lat={latitude} lng={longitude} label={label} />
    </div>
  )
}
```

Note: Verify the `LeafletMap` component props. It may use `lat`/`lng` or `locations`. Check `apps/web/components/leaflet-map.tsx` for the actual interface. Adjust the props accordingly.

- [ ] **Step 5: Create EntitySection**

Collapsible section for detail pages.

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function EntitySection({ title, children, defaultOpen = true }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 text-sm font-semibold text-gray-900 dark:text-gray-100"
      >
        {title}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  )
}
```

- [ ] **Step 6: Verify typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/entity/
git commit -m "feat: add shared entity detail components (Hero, ActionsBar, Map, Breadcrumb, Section)"
```

---

## Task 7: Hotel Detail Page

**Files:**
- Create: `apps/web/app/(trips-app)/trip/[id]/hotels/[hotelId]/page.tsx`

**Depends on:** Task 6 (shared components).

- [ ] **Step 1: Create the hotel detail page**

```typescript
'use client'

import { use } from 'react'
import { useHotels } from '@travyl/shared'
import { Star, MapPin, Calendar, CreditCard, Hash } from 'lucide-react'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntityHero } from '@/components/entity/EntityHero'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'
import { EntityMap } from '@/components/entity/EntityMap'
import { EntitySection } from '@/components/entity/EntitySection'

interface Props {
  params: Promise<{ id: string; hotelId: string }>
}

export default function HotelDetailPage({ params }: Props) {
  const { id: tripId, hotelId } = use(params)
  const { data: hotels, isLoading } = useHotels(tripId)
  const hotel = hotels?.find((h) => h.id === hotelId)

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="h-[280px] bg-gray-200 dark:bg-gray-700 rounded-xl mb-6" />
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  if (!hotel) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Hotel not found</p>
        <EntityBreadcrumb label="Hotels" href={`/trip/${tripId}/hotels`} />
      </div>
    )
  }

  const { data } = hotel
  const images = data.image_url ? [data.image_url] : []
  const nights = data.check_in && data.check_out
    ? Math.ceil((new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <EntityBreadcrumb label="Hotels" href={`/trip/${tripId}/hotels`} />
      <EntityHero images={images} alt={data.name} />

      {/* Overview */}
      <div className="mt-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.name}</h1>
            {data.star_rating && (
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: data.star_rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
            )}
          </div>
          {data.rating && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{data.rating}</span>
              <span className="text-xs text-blue-500">/5</span>
            </div>
          )}
        </div>

        {data.address && (
          <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            {data.address}
          </div>
        )}
      </div>

      {/* Dates & Pricing */}
      <EntitySection title="Stay Details">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-500">Check-in</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {new Date(data.check_in).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-500">Check-out</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {new Date(data.check_out).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
        {nights && (
          <div className="mt-2 text-sm text-gray-500">{nights} night{nights !== 1 ? 's' : ''}</div>
        )}
      </EntitySection>

      {(data.price_per_night || data.total_price) && (
        <EntitySection title="Pricing">
          <div className="space-y-2">
            {data.price_per_night && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Per night</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {data.currency ?? '$'}{data.price_per_night.toFixed(2)}
                </span>
              </div>
            )}
            {data.total_price && (
              <div className="flex justify-between text-sm font-semibold border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
                <span className="text-gray-900 dark:text-gray-100">Total</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {data.currency ?? '$'}{data.total_price.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </EntitySection>
      )}

      {data.booking_ref && (
        <EntitySection title="Booking">
          <div className="flex items-center gap-2 text-sm">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">Reference:</span>
            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{data.booking_ref}</span>
          </div>
        </EntitySection>
      )}

      {data.latitude && data.longitude && (
        <EntitySection title="Location">
          <EntityMap latitude={data.latitude} longitude={data.longitude} label={data.name} />
        </EntitySection>
      )}

      <EntityActionsBar
        onEdit={() => {/* TODO: wire to edit modal */}}
        onRemove={() => {/* TODO: wire to remove mutation */}}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify page renders**

Start dev server: `npm run web`
Navigate to `/trip/<trip-id>/hotels/<hotel-id>` (use a known trip with a hotel).
Expected: Page renders with hotel data, skeleton on load, 404 for bad ID.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(trips-app\)/trip/\[id\]/hotels/\[hotelId\]/
git commit -m "feat: add hotel detail page"
```

---

## Task 8: Flight Detail Page

**Files:**
- Create: `apps/web/app/(trips-app)/trip/[id]/flights/[flightId]/page.tsx`

**Depends on:** Task 6. **Parallel with:** Tasks 7, 9, 10.

- [ ] **Step 1: Create the flight detail page**

Follow the same pattern as the hotel detail page. Key differences:
- Use `useFlights(tripId)` hook
- Route visualization hero (origin → plane → destination) with sky gradient instead of image carousel
- Two-column departure/arrival layout
- Computed duration from `departure_at` and `arrival_at`
- Flight number and airline prominently displayed
- Cabin class badge
- `ComparisonAlternatives` component embedded (import from existing `apps/web/components/itinerary/ComparisonAlternatives.tsx`) if that component can work standalone

Data fields to render: `data.airline`, `data.flight_number`, `data.origin_iata`, `data.origin_name`, `data.dest_iata`, `data.dest_name`, `data.departure_at`, `data.arrival_at`, `data.price`, `data.currency`, `data.cabin_class`, `data.booking_ref`, `data.offer_id`.

Hero section should use a gradient background (`bg-gradient-to-r from-sky-500 to-blue-600`) with the route displayed as large IATA codes with a plane icon between them — similar to the existing `FlightCard` header pattern but full-width.

- [ ] **Step 2: Verify page renders**

Navigate to `/trip/<trip-id>/flights/<flight-id>`.
Expected: Flight detail with route visualization, duration, pricing.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(trips-app\)/trip/\[id\]/flights/\[flightId\]/
git commit -m "feat: add flight detail page"
```

---

## Task 9: Restaurant Detail Page

**Files:**
- Create: `apps/web/app/(trips-app)/trip/[id]/restaurants/[restaurantId]/page.tsx`

**Depends on:** Task 6. **Parallel with:** Tasks 7, 8, 10.

- [ ] **Step 1: Create the restaurant detail page**

Key differences from hotel/flight:
- Uses `useItineraryScreen(tripId)` to get activities, then filters by `restaurantId` and `activity_type === 'food'`
- Data comes from `ActivityRow` shape: `activity_name`, `activity_data` (jsonb with `location_name`, `image_url`, `category`, `rating`), `notes`, `estimated_cost`, `currency`, `latitude`, `longitude`, `starting_date`, `starting_time`, `ending_time`
- Shows trip context: which day/meal slot, adjacent activities

Render: EntityBreadcrumb → EntityHero (from `activity_data.image_url`) → name + category badge + cost + rating → location with EntityMap → notes → schedule (date/time) → EntityActionsBar.

Check how `useItineraryScreen` returns data — it returns `{ days, flights, hotels }` where `days` contains `ItineraryDayViewModel[]`. Each day has activities. Find the restaurant by iterating days and matching activity ID.

- [ ] **Step 2: Verify page renders**

Navigate to `/trip/<trip-id>/restaurants/<activity-id>` with a food-type activity.
Expected: Restaurant detail renders with name, image, location, schedule.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(trips-app\)/trip/\[id\]/restaurants/\[restaurantId\]/
git commit -m "feat: add restaurant detail page"
```

---

## Task 10: Activity Detail Page

**Files:**
- Create: `apps/web/app/(trips-app)/trip/[id]/activities/[activityId]/page.tsx`

**Depends on:** Task 6. **Parallel with:** Tasks 7, 8, 9.

- [ ] **Step 1: Create the activity detail page**

Same data source approach as restaurant (Task 9) but for non-food activity types. Additional:
- Category color accent from `ACTIVITY_TYPE_COLORS` (import from `@travyl/shared` config)
- Duration computed from `starting_time`/`ending_time`
- Category badge colored by type

Pattern is nearly identical to restaurant detail. The main visual difference is the category color accent on the hero and badge.

- [ ] **Step 2: Verify page renders**

Navigate to `/trip/<trip-id>/activities/<activity-id>`.
Expected: Activity detail with category color, duration, schedule.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(trips-app\)/trip/\[id\]/activities/\[activityId\]/
git commit -m "feat: add activity detail page"
```

---

## Task 11: Wire Existing Cards to Link to Detail Pages

**Files:**
- Modify: `apps/web/components/itinerary/HotelCard.tsx`
- Modify: `apps/web/components/itinerary/FlightCard.tsx`
- Modify: `apps/web/app/(trips-app)/trip/[id]/restaurants/page.tsx`
- Modify: `apps/web/app/(trips-app)/trip/[id]/activities/page.tsx`

**Depends on:** Tasks 7-10 (detail pages must exist).

- [ ] **Step 1: Wire HotelCard**

In `HotelCard.tsx`, wrap the card in a Next.js `Link` or add an `onClick` with `router.push`:

```typescript
import Link from 'next/link'

// Wrap the outer div in a Link
<Link href={`/trip/${hotel.tripId}/hotels/${hotel.id}`} className="block">
  {/* existing card JSX */}
</Link>
```

Check the component's props — it receives a `HotelViewModel`. Verify it has `tripId` and `id` available. If `tripId` is not on the view model, get it from the page context or add it.

- [ ] **Step 2: Wire FlightCard**

Same approach as HotelCard:

```typescript
<Link href={`/trip/${flight.tripId}/flights/${flight.id}`} className="block">
  {/* existing card JSX */}
</Link>
```

- [ ] **Step 3: Wire restaurant list page cards**

In `restaurants/page.tsx`, when rendering restaurant/activity cards (likely `ItineraryPinCard` or similar), add an onClick handler:

```typescript
onClick={() => router.push(`/trip/${tripId}/restaurants/${item.id}`)}
```

- [ ] **Step 4: Wire activities list page cards**

Same approach in `activities/page.tsx`:

```typescript
onClick={() => router.push(`/trip/${tripId}/activities/${item.id}`)}
```

- [ ] **Step 5: Verify navigation works**

Click a hotel card → hotel detail page. Click back → hotel list.
Click a flight card → flight detail page. Click back → flight list.
Same for restaurants and activities.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/itinerary/HotelCard.tsx apps/web/components/itinerary/FlightCard.tsx apps/web/app/\(trips-app\)/trip/\[id\]/restaurants/page.tsx apps/web/app/\(trips-app\)/trip/\[id\]/activities/page.tsx
git commit -m "feat: link entity cards to detail pages"
```

---

## Task 12: Final Integration Verification

**Depends on:** All previous tasks.

- [ ] **Step 1: Typecheck all workspaces**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 2: Lint all workspaces**

Run: `npm run lint`
Expected: No errors (or only pre-existing ones).

- [ ] **Step 3: Run shared package tests**

Run: `cd packages/shared && npm test -- --run`
Expected: All tests pass including new `entitySearch.test.ts`.

- [ ] **Step 4: End-to-end manual verification**

1. Open any page → Ctrl+K → type a hotel name → see it in results → click → navigates to hotel detail
2. Ctrl+K → type a flight number → see flight result → click → flight detail
3. Ctrl+K → type a destination → see destination result
4. From inside a trip → Ctrl+K → verify "In this trip" results appear first
5. Hotel/Flight/Restaurant/Activity list pages → click any card → detail page renders → back button works
6. Empty states: bad URLs show "not found" with back link
7. Recent searches: search something, close, reopen → appears in recent

- [ ] **Step 5: Commit any fixes from verification**

```bash
git add -u
git commit -m "fix: integration fixes from spotlight search verification"
```

---

## Parallelization Guide

```
Task 1 (DB migration) ─────────────┐
                                    ├──→ Task 2 (Lambda) ──→ Task 3 (Hook) ──→ Task 4 (Components) ──→ Task 5 (Wire layout)
                                    │
Task 6 (Shared entity components) ──┼──→ Task 7 (Hotel detail)    ─┐
                                    ├──→ Task 8 (Flight detail)    ├──→ Task 11 (Wire cards) ──→ Task 12 (Verify)
                                    ├──→ Task 9 (Restaurant detail)│
                                    └──→ Task 10 (Activity detail) ┘
```

- **Tasks 7, 8, 9, 10** can all run in parallel once Task 6 is done.
- **Task 6** can run in parallel with Tasks 1-5 (no dependencies).
- **Task 11** needs both workstreams complete.
- **Task 12** is the final gate.
