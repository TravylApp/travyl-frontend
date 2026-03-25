'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, usePathname } from 'next/navigation'
import { useAuthStore, mergeSearchResults, type SpotlightResult } from '@travyl/shared'
import { useContextSearch } from './useContextSearch'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL
const RECENT_SEARCHES_KEY = 'travyl:recentSearches'
const MAX_RECENT = 10

// Static navigation items
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

  const res = await fetch(`${API_URL}/entity-search?${params}`, {
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
  if (!tripId) return '/'
  switch (type) {
    case 'hotel': return `/trip/${tripId}/hotels/${entityId}`
    case 'flight': return `/trip/${tripId}/flights/${entityId}`
    case 'restaurant': return `/trip/${tripId}/restaurants/${entityId}`
    case 'activity': return `/trip/${tripId}/activities/${entityId}`
    case 'destination': return `/trips`
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
      trip: tripSearchResults.map((r) => ({
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
