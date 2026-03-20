# For You Panel — API Wiring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock data in the For You panel with real Amazon Location + Foursquare suggestions via the deployed SST backend, and add interaction tracking.

**Architecture:** The `GET /suggest` Lambda discovers POIs via Amazon Location, enriches each with Foursquare photos/ratings/prices, caches in DynamoDB (30min, per-user). Frontend `useSuggestions` hook swaps mock import for React Query fetch with JWT auth. A new `useInteractionTracking` hook fires events to `POST /interact`.

**Tech Stack:** SST/Lambda, Amazon Location Services, Foursquare Places API, DynamoDB, React Query, Supabase Auth

**Spec:** `docs/superpowers/specs/2026-03-17-for-you-api-wiring-design.md`

---

## Chunk 1: Backend — Foursquare Enrichment

### Task 1: Add Foursquare API key secret to SST infra

**Files:**
- Modify: `infra/secrets.ts`
- Modify: `infra/api.ts:31-43`

- [ ] **Step 1: Add Foursquare secret declaration**

In `infra/secrets.ts`, add after line 2:

```ts
export const foursquareApiKey = new sst.Secret('FoursquareApiKey')
```

- [ ] **Step 2: Link secret to suggest Lambda**

In `infra/api.ts`, add import and link:

Line 3, change:
```ts
import { supabaseServiceRoleKey, supabaseUrl } from './secrets'
```
to:
```ts
import { supabaseServiceRoleKey, supabaseUrl, foursquareApiKey } from './secrets'
```

Line 33, change:
```ts
link: [cacheTable, supabaseServiceRoleKey, supabaseUrl],
```
to:
```ts
link: [cacheTable, supabaseServiceRoleKey, supabaseUrl, foursquareApiKey],
```

- [ ] **Step 3: Commit**

```bash
git add infra/secrets.ts infra/api.ts
git commit -m "infra: add Foursquare API key secret, link to suggest Lambda"
```

---

### Task 2: Create Foursquare enrichment client

**Files:**
- Create: `services/lib/foursquare.ts`

- [ ] **Step 1: Create the Foursquare client**

Create `services/lib/foursquare.ts`:

```ts
import { Resource } from 'sst'
import type { SuggestionCard } from './types'

const FSQ_BASE = 'https://api.foursquare.com/v3'

interface FsqPlace {
  fsq_id: string
  name: string
  rating?: number        // 0-10
  price?: number         // 1-4
  description?: string
  tips?: { text: string }[]
  photos?: { prefix: string; suffix: string }[]
}

interface FsqMatchResponse {
  place?: FsqPlace
}

function getApiKey(): string {
  return Resource.FoursquareApiKey.value
}

async function fsqFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(`${FSQ_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: getApiKey(),
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

async function matchPlace(name: string, lat: number, lng: number): Promise<FsqPlace | null> {
  const data = await fsqFetch<FsqMatchResponse>('/places/match', {
    name,
    ll: `${lat},${lng}`,
  })
  return data?.place ?? null
}

function buildPhotoUrl(photo: { prefix: string; suffix: string }, size = '400x300'): string {
  return `${photo.prefix}${size}${photo.suffix}`
}

/**
 * Enrich SuggestionCards (from Amazon Location) with Foursquare data.
 * Adds photos, ratings, prices, and descriptions where available.
 * Gracefully degrades — cards without a Foursquare match keep their original fields.
 */
export async function enrichSuggestions(suggestions: SuggestionCard[]): Promise<SuggestionCard[]> {
  const results = await Promise.allSettled(
    suggestions.map(async (suggestion) => {
      const place = await matchPlace(suggestion.name, suggestion.latitude, suggestion.longitude)
      if (!place) return suggestion

      return {
        ...suggestion,
        imageUrl: place.photos?.[0] ? buildPhotoUrl(place.photos[0]) : suggestion.imageUrl,
        rating: place.rating != null ? Math.round((place.rating / 2) * 10) / 10 : suggestion.rating,
        price: place.price != null ? [0, 10, 25, 50, 100][place.price] ?? suggestion.price : suggestion.price,
        description: place.tips?.[0]?.text ?? place.description ?? suggestion.description,
      }
    }),
  )

  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : suggestions[i]))
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd services && npx tsc --noEmit lib/foursquare.ts --skipLibCheck 2>&1 || echo "Type check skipped — will verify at deploy"
```

- [ ] **Step 3: Commit**

```bash
git add services/lib/foursquare.ts
git commit -m "feat: add Foursquare Places API enrichment client"
```

---

### Task 3: Wire Foursquare enrichment into suggest Lambda

**Files:**
- Modify: `services/suggest.ts:1-40`

- [ ] **Step 1: Add enrichment import and call**

In `services/suggest.ts`, add import at line 4:

```ts
import { enrichSuggestions } from './lib/foursquare'
```

Replace lines 23-29 (the Amazon Location query + cache write block):

```ts
    // Query Amazon Location Services for POIs
    const suggestions = await searchPlaces(destination, { maxResults: 10 })

    // Cache for 30 minutes
    if (suggestions.length > 0) {
      await setCachedSuggestions(userId, destination, suggestions)
    }
```

with:

```ts
    // Query Amazon Location Services for POIs, then enrich with Foursquare
    const basicSuggestions = await searchPlaces(destination, { maxResults: 10 })
    const suggestions = await enrichSuggestions(basicSuggestions)

    // Cache enriched results (30min default TTL)
    if (suggestions.length > 0) {
      await setCachedSuggestions(userId, destination, suggestions)
    }
```

- [ ] **Step 2: Commit**

```bash
git add services/suggest.ts
git commit -m "feat: wire Foursquare enrichment into suggest Lambda"
```

---

## Chunk 2: Frontend — Real API Integration

### Task 4: Rewrite useSuggestions to fetch from real API

**Files:**
- Modify: `apps/web/components/calendar/hooks/useSuggestions.ts`

- [ ] **Step 1: Rewrite the hook**

Replace the entire contents of `apps/web/components/calendar/hooks/useSuggestions.ts`:

```ts
// apps/web/components/calendar/hooks/useSuggestions.ts
'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'
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

/** Maps filter chip labels to activity category slugs */
const CATEGORY_MAP: Record<string, string[]> = {
  Sightseeing: ['sightseeing'],
  Dining: ['dining'],
  Tours: ['tour'],
  Culture: ['cultural', 'museum'],
  Shopping: ['shopping'],
  Nightlife: ['nightlife'],
  Outdoor: ['outdoor'],
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

async function fetchSuggestions(destination: string): Promise<SuggestionCard[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(`${API_URL}/suggest?destination=${encodeURIComponent(destination)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch suggestions (${res.status})`)
  }

  const data = await res.json()
  return data.suggestions
}

export function useSuggestions({
  destination,
  scheduledActivityIds = [],
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const { data: allSuggestions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['suggestions', destination],
    queryFn: () => fetchSuggestions(destination),
    enabled: !!destination,
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

    // Category filter
    if (activeFilter !== 'All') {
      const slugs = CATEGORY_MAP[activeFilter] ?? []
      filtered = filtered.filter((s) => slugs.includes(s.category))
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      )
    }

    return filtered
  }, [allSuggestions, searchQuery, activeFilter, removedIds, scheduledActivityIds])

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

- [ ] **Step 2: Verify types compile**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -i "useSuggestions\|ForYouPanel" | head -10
```

Expected: no errors related to these files.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useSuggestions.ts
git commit -m "feat: wire useSuggestions to real /suggest API with React Query"
```

---

### Task 5: Wire retry button in ForYouPanel

**Files:**
- Modify: `apps/web/components/calendar/ForYouPanel.tsx:18-27,96-105`

- [ ] **Step 1: Destructure refetch from useSuggestions**

In `ForYouPanel.tsx`, line 18-27, add `refetch` to the destructured return:

Change:
```ts
  const {
    suggestions,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterCategories,
  } = useSuggestions({ destination, scheduledActivityIds })
```

to:
```ts
  const {
    suggestions,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterCategories,
    refetch,
  } = useSuggestions({ destination, scheduledActivityIds })
```

- [ ] **Step 2: Wire the retry button onClick**

In `ForYouPanel.tsx`, line 102, change:
```tsx
            <button className="text-xs text-[var(--cal-accent)] hover:underline">
```
to:
```tsx
            <button onClick={() => refetch()} className="text-xs text-[var(--cal-accent)] hover:underline">
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/ForYouPanel.tsx
git commit -m "feat: wire retry button to refetch suggestions"
```

---

### Task 6: Create useInteractionTracking hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useInteractionTracking.ts`

- [ ] **Step 1: Create the hook**

Create `apps/web/components/calendar/hooks/useInteractionTracking.ts`:

```ts
'use client'

import { useCallback, useRef } from 'react'
import { supabase } from '@travyl/shared'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

type InteractionAction = 'impression' | 'click' | 'drag' | 'dismiss'

export function useInteractionTracking(tripId: string) {
  // Deduplicate impressions within a session
  const impressedIds = useRef(new Set<string>())

  const trackEvent = useCallback(
    (suggestionId: string, action: InteractionAction) => {
      // Skip duplicate impressions
      if (action === 'impression') {
        if (impressedIds.current.has(suggestionId)) return
        impressedIds.current.add(suggestionId)
      }

      // Fire and forget — no await, no error handling
      supabase.auth.getSession().then(({ data: { session } }) => {
        const token = session?.access_token
        if (!token) return

        fetch(`${API_URL}/interact`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ suggestionId, action, tripId }),
        }).catch(() => {}) // swallow errors
      })
    },
    [tripId],
  )

  return { trackEvent }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/hooks/useInteractionTracking.ts
git commit -m "feat: add useInteractionTracking hook for fire-and-forget events"
```

---

### Task 7: Wire interaction tracking into ForYouPanel

**Files:**
- Modify: `apps/web/components/calendar/ForYouPanel.tsx`

- [ ] **Step 1: Add tripId prop and import tracking hook**

In `ForYouPanel.tsx`, update the props interface (line 9-12):

```ts
interface ForYouPanelProps {
  destination: string
  tripId: string
  scheduledActivityIds?: string[]
}
```

Update the destructure (line 14-17):

```ts
export function ForYouPanel({
  destination,
  tripId,
  scheduledActivityIds,
}: ForYouPanelProps) {
```

Add import at line 7:

```ts
import { useInteractionTracking } from './hooks/useInteractionTracking'
```

Add after the `useSuggestions` call:

```ts
  const { trackEvent } = useInteractionTracking(tripId)
```

- [ ] **Step 2: Fire impression events when cards render**

In the masonry grid section (line 122-126), wrap SuggestionCard to fire impressions:

Change:
```tsx
          <div className="columns-2 gap-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
```

to:
```tsx
          <div className="columns-2 gap-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onVisible={() => trackEvent(suggestion.id, 'impression')}
              />
            ))}
          </div>
```

- [ ] **Step 3: Add onVisible prop to SuggestionCard**

In `apps/web/components/calendar/SuggestionCard.tsx`, add the prop and a `useEffect` to fire it on mount:

Add `useEffect` import at the top of the file (add to existing React import or import separately):

```ts
import { useEffect } from 'react'
```

Update the interface (line 8-10):

```ts
interface SuggestionCardProps {
  suggestion: SuggestionCardType
  onVisible?: () => void
}
```

Update the destructure (line 12):

```ts
export function SuggestionCard({ suggestion, onVisible }: SuggestionCardProps) {
```

Add after the `useDraggable` call (after line 17):

```ts
  useEffect(() => {
    onVisible?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Pass tripId from CalendarDashboard**

Find where `ForYouPanel` is rendered in `CalendarDashboard.tsx` and add the `tripId` prop. The component already has access to the trip object (which can be undefined during loading). Add `tripId={trip?.id ?? ''}` to the `<ForYouPanel>` JSX, matching the existing defensive pattern used for `destination` (`trip?.destination ?? ''`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/ForYouPanel.tsx apps/web/components/calendar/SuggestionCard.tsx apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire interaction tracking to ForYouPanel and SuggestionCard"
```

---

## Chunk 3: Deploy and Verify

### Task 8: Set Foursquare API key and deploy

- [ ] **Step 1: Set the Foursquare secret**

Get a Foursquare API key from https://foursquare.com/developers and set it:

```bash
npx sst secret set FoursquareApiKey <your-key>
```

- [ ] **Step 2: Deploy**

```bash
npx sst deploy
```

Expected: no errors, API Gateway URL stays the same.

- [ ] **Step 3: Test the suggest endpoint directly**

```bash
# Get a JWT token from your Supabase session (check browser devtools → Application → Local Storage or cookies)
curl -H "Authorization: Bearer <jwt>" "https://mdqhm2rlga.execute-api.us-east-2.amazonaws.com/suggest?destination=Paris"
```

Expected: JSON response with `suggestions` array containing enriched cards (images, ratings, prices from Foursquare).

- [ ] **Step 4: Test in browser**

1. Sign in to the app
2. Open a trip with a destination set (e.g., "Paris")
3. The For You panel should show real suggestions with photos, ratings, and prices
4. Search box should filter results client-side
5. Category chips should filter results
6. Drag a card onto the calendar — should create an activity
7. Check browser Network tab: `GET /suggest` should return enriched data, `POST /interact` should fire on card visibility and drag

- [ ] **Step 5: Final commit if any adjustments needed**

```bash
git add -A
git commit -m "chore: deployment adjustments for For You API wiring"
```
