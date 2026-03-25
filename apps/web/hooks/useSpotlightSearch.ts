'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, usePathname } from 'next/navigation'
import { useAuthStore, useTrip, mergeSearchResults, type SpotlightResult } from '@travyl/shared'
import { useContextSearch } from './useContextSearch'
import { useCalendarCommandsStore } from '@/stores/calendarCommandsStore'
import { fuzzyMatch } from '@/components/spotlight/fuzzyMatch'

const RECENT_SEARCHES_KEY = 'travyl:recentSearches'
const PINNED_RESULTS_KEY = 'travyl:pinnedResults'
const MAX_RECENT = 10

export type SearchScope = 'hotels' | 'flights' | 'trips' | 'restaurants' | 'activities' | 'commands' | null

const SCOPE_TO_TYPES: Record<string, string[]> = {
  hotels: ['hotel'],
  flights: ['flight'],
  trips: ['trip'],
  restaurants: ['restaurant'],
  activities: ['activity'],
  commands: ['command'],
}

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

  const res = await fetch(`/api/entity-search?${params}`, {
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
      metadata?: Record<string, unknown>
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
      metadata: item.metadata,
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

export interface PinnedResult {
  id: string
  type: SpotlightResult['type']
  title: string
  subtitle: string
  href: string
}

function loadPinnedResults(): PinnedResult[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(PINNED_RESULTS_KEY) || '[]')
  } catch { return [] }
}

function savePinnedResults(pinned: PinnedResult[]) {
  localStorage.setItem(PINNED_RESULTS_KEY, JSON.stringify(pinned))
}

export function useSpotlightSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [scope, setScope] = useState<SearchScope>(null)
  const [clearTripScope, setClearTripScope] = useState(false)
  const [pinnedResults, setPinnedResults] = useState<PinnedResult[]>(loadPinnedResults)
  const token = useAuthStore((s) => s.session?.access_token)
  const pathname = usePathname()
  const params = useParams()
  const commands = useCalendarCommandsStore((s) => s.commands)

  // Detect if we're inside a trip context
  const tripId = (params?.id as string) ?? null
  const isInTripContext = pathname?.includes('/trip/') ?? false
  const effectiveTripId = clearTripScope ? null : tripId

  // Get trip name for context pill
  const { data: tripData } = useTrip(isInTripContext && !clearTripScope ? tripId ?? undefined : undefined)
  const tripName = tripData?.title ?? null

  // Debounce query for entity search (context-search has its own debounce)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Determine entity-search types based on scope
  const entitySearchTypes = useMemo(() => {
    if (!scope) return null
    return SCOPE_TO_TYPES[scope] ?? null
  }, [scope])

  const shouldSearch = debouncedQuery.length >= 3 && !!token

  // Existing context-search for trips (vector-powered)
  const { results: tripSearchResults, isLoading: tripSearchLoading } = useContextSearch(query)

  // New entity-search for hotels, flights, restaurants, activities, destinations
  const { data: entityResults, isLoading: entityLoading } = useQuery({
    queryKey: ['entity-search', debouncedQuery, effectiveTripId, entitySearchTypes],
    queryFn: () => fetchEntitySearch(debouncedQuery, entitySearchTypes, effectiveTripId, token!),
    enabled: shouldSearch,
    staleTime: 30_000,
  })

  // Client-side filter for navigation items using fuzzy match
  const navResults = useMemo((): Record<string, SpotlightResult[]> => {
    if (debouncedQuery.length < 1) return {}
    if (scope && scope !== 'commands') return {} // scope filters out nav items
    const q = debouncedQuery.toLowerCase()
    const matched = NAV_ITEMS
      .map((item) => {
        const titleScore = fuzzyMatch(item.title, q)
        const subtitleScore = fuzzyMatch(item.subtitle, q)
        const bestScore = Math.max(titleScore ?? -1, subtitleScore ?? -1)
        return bestScore >= 0 ? { item, score: bestScore } : null
      })
      .filter((m): m is { item: SpotlightResult; score: number } => m !== null)
      .sort((a, b) => b.score - a.score)
      .map((m) => m.item)
    return matched.length ? { navigation: matched } : {}
  }, [debouncedQuery, scope])

  // Client-side filter for calendar commands using fuzzy match
  const commandResults = useMemo((): Record<string, SpotlightResult[]> => {
    if (!commands?.length || debouncedQuery.length < 1) return {}
    if (scope && scope !== 'commands') return {} // scope filters out commands unless scoped to commands
    const q = debouncedQuery.toLowerCase()
    const matched: (SpotlightResult & { _fuzzyScore: number })[] = commands
      .filter((cmd) => cmd.isEnabled)
      .map((cmd) => {
        const score = fuzzyMatch(cmd.label, q)
        if (score === null) return null
        return {
          id: `cmd-${cmd.id}`,
          type: 'command' as const,
          title: cmd.label,
          subtitle: cmd.group,
          href: '',
          score: 1,
          shortcut: cmd.shortcut,
          execute: cmd.execute,
          _fuzzyScore: score,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b._fuzzyScore - a._fuzzyScore)

    const cleaned = matched.map(({ _fuzzyScore, ...rest }) => rest)
    return cleaned.length ? { command: cleaned } : {}
  }, [commands, debouncedQuery, scope])

  // Transform trip search results into SpotlightResult format
  const tripResults = useMemo((): Record<string, SpotlightResult[]> => {
    if (scope && scope !== 'trips') return {} // scope filters out trip results
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
  }, [tripSearchResults, scope])

  // Merge all sources (now including commands)
  const results = useMemo(() => {
    return mergeSearchResults([tripResults, entityResults ?? {}, navResults, commandResults], { maxPerCategory: 3 })
  }, [tripResults, entityResults, navResults, commandResults])

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

  // Pinned results management
  const pinResult = useCallback((result: SpotlightResult) => {
    setPinnedResults((prev) => {
      if (prev.some((p) => p.id === result.id)) return prev
      const next = [...prev, { id: result.id, type: result.type, title: result.title, subtitle: result.subtitle, href: result.href }]
      savePinnedResults(next)
      return next
    })
  }, [])

  const unpinResult = useCallback((id: string) => {
    setPinnedResults((prev) => {
      const next = prev.filter((p) => p.id !== id)
      savePinnedResults(next)
      return next
    })
  }, [])

  const isPinned = useCallback((id: string) => {
    return pinnedResults.some((p) => p.id === id)
  }, [pinnedResults])

  const removeTripScope = useCallback(() => {
    setClearTripScope(true)
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
    tripName,
    clearTripScope,
    removeTripScope,
    scope,
    setScope,
    pinnedResults,
    pinResult,
    unpinResult,
    isPinned,
  }
}
