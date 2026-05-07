// apps/web/components/calendar/hooks/useSuggestions.ts
'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SuggestionCard } from '../types'
import type { PlaceItem } from '@travyl/shared'

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

/**
 * Each chip maps to one of the FastAPI `nearby` categories that the
 * `/api/places` route understands. The route then translates them to
 * Foursquare-friendly tokens internally.
 */
const CHIP_TO_PLACE_CATEGORY: Record<Exclude<FilterCategory, 'All'>, string> = {
  Sightseeing: 'sightseeing',
  Dining: 'dining',
  Tours: 'tour',
  Culture: 'cultural',
  Shopping: 'shopping',
  Nightlife: 'nightlife',
  Outdoor: 'outdoor',
}

/** Categories the "All" feed pulls from to give the For-You feed real variety. */
const FOR_YOU_BUNDLE: string[] = [
  'sightseeing',
  'dining',
  'cultural',
  'outdoor',
  'tour',
  'nightlife',
]

/** Per-category cap when fetching the "All" feed — bundle ≈ 6 × 8 = 48 raw items. */
const PER_CATEGORY_LIMIT = 8
const SINGLE_CATEGORY_LIMIT = 24

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
  commitSearch: () => void
  activeFilter: FilterCategory
  setActiveFilter: (filter: FilterCategory) => void
  filterCategories: readonly FilterCategory[]
  removeSuggestion: (id: string) => void
  restoreSuggestion: (id: string) => void
  refetch: () => void
  hasMore: boolean
  isLoadingMore: boolean
  loadMore: () => void
}

// ── /api/places fetchers ──────────────────────────────────

interface Coords { lat: string; lng: string }

/** Geocode the destination once via the Nominatim proxy, then reuse the coords
 * across every category fetch. Doing it inline in `/api/places` per-call would
 * trigger Nominatim's 1-req/sec rate limit for parallel category fan-out. */
async function geocodeDestination(destination: string): Promise<Coords | null> {
  if (!destination) return null
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(destination)}&limit=1`)
    if (!res.ok) return null
    const data = await res.json() as Array<{ lat?: string; lon?: string }>
    const hit = data?.[0]
    if (!hit?.lat || !hit?.lon) return null
    return { lat: hit.lat, lng: hit.lon }
  } catch {
    return null
  }
}

async function fetchPlacesForCategory(
  destination: string,
  coords: Coords | null,
  category: string,
  limit: number,
): Promise<PlaceItem[]> {
  const params = new URLSearchParams({
    q: destination,
    category,
    limit: String(limit),
  })
  if (coords) {
    params.set('lat', coords.lat)
    params.set('lng', coords.lng)
  }
  try {
    const res = await fetch(`/api/places?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? (data as PlaceItem[]) : []
  } catch {
    return []
  }
}

/** Round-robin merge so the For-You feed alternates categories instead of
 * dumping one category after another. */
function interleave<T>(groups: T[][]): T[] {
  const out: T[] = []
  const cursors = groups.map(() => 0)
  while (true) {
    let progressed = false
    for (let i = 0; i < groups.length; i++) {
      if (cursors[i] < groups[i].length) {
        out.push(groups[i][cursors[i]])
        cursors[i] += 1
        progressed = true
      }
    }
    if (!progressed) break
  }
  return out
}

function placeToSuggestion(p: PlaceItem): SuggestionCard {
  // PlaceItem.category is a free-form string; SuggestionCard expects ActivityCategory.
  // We keep the raw value — downstream UI tolerates unknown values.
  return {
    id: String(p.id),
    name: p.name,
    category: (p.category || 'sightseeing') as SuggestionCard['category'],
    imageUrl: p.image,
    imageUrls: p.images && p.images.length ? p.images : (p.image ? [p.image] : undefined),
    duration: 1.5, // Reasonable default — PlaceItem.duration is a string ("1-2 hours") not a number.
    price: null, // Place data has price level (1–4), not a numeric cost.
    currency: '$',
    rating: typeof p.rating === 'number' && p.rating > 0 ? p.rating : null,
    location: p.address || p.tagline || '',
    latitude: p.latitude ?? 0,
    longitude: p.longitude ?? 0,
    description: p.description || p.tagline || '',
    source: 'search',
    relevanceScore: typeof p.rating === 'number' ? p.rating : 0,
  }
}

async function fetchAllSuggestions(
  destination: string,
  filter: FilterCategory,
): Promise<SuggestionCard[]> {
  if (!destination) return []
  const coords = await geocodeDestination(destination)

  if (filter === 'All') {
    const groups = await Promise.all(
      FOR_YOU_BUNDLE.map((cat) =>
        fetchPlacesForCategory(destination, coords, cat, PER_CATEGORY_LIMIT),
      ),
    )
    const merged = interleave(groups).map(placeToSuggestion)
    return dedupBy(merged, (s) => s.id)
  }

  const cat = CHIP_TO_PLACE_CATEGORY[filter]
  const places = await fetchPlacesForCategory(destination, coords, cat, SINGLE_CATEGORY_LIMIT)
  return dedupBy(places.map(placeToSuggestion), (s) => s.id)
}

function dedupBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// ── Hook ───────────────────────────────────────────────────

export function useSuggestions({
  destination,
  scheduledActivityIds = [],
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [searchQuery, setSearchQuery] = useState('')
  const [committedQuery, setCommittedQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const commitSearch = useCallback(() => {
    setCommittedQuery(searchQuery.trim())
  }, [searchQuery])

  const { data: allSuggestions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['for-you-suggestions', destination, activeFilter],
    queryFn: () => fetchAllSuggestions(destination, activeFilter),
    enabled: !!destination,
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  })

  // When a suggestion is dropped onto the calendar, also hide it locally so
  // the user gets immediate visual feedback before the query refreshes.
  useEffect(() => {
    if (scheduledActivityIds.length === 0) return
    setRemovedIds((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of scheduledActivityIds) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [scheduledActivityIds])

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

    // Live (uncommitted) search filters across name/category/location/description.
    const liveQuery = searchQuery.trim()
    const effectiveQuery = committedQuery || liveQuery
    if (effectiveQuery) {
      const q = effectiveQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.location ?? '').toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q),
      )
    }

    return filtered
  }, [allSuggestions, searchQuery, committedQuery, removedIds, scheduledActivityIds])

  return {
    suggestions,
    isLoading,
    error: error ? (error as Error).message : null,
    searchQuery,
    setSearchQuery,
    commitSearch,
    activeFilter,
    setActiveFilter,
    filterCategories: FILTER_CATEGORIES,
    removeSuggestion,
    restoreSuggestion,
    refetch,
    // Pagination intentionally disabled — `/api/places` returns a single
    // batch per category. Bundling multiple categories already gives a
    // dense, varied feed without it.
    hasMore: false,
    isLoadingMore: false,
    loadMore: () => {},
  }
}
