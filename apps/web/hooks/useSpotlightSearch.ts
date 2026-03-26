'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, usePathname } from 'next/navigation'
import { useAuthStore, useTrip, mergeSearchResults, type SpotlightResult } from '@travyl/shared'
import { useContextSearch } from './useContextSearch'
import { useCalendarCommandsStore } from '@/stores/calendarCommandsStore'
import { fuzzyMatch } from '@/components/spotlight/fuzzyMatch'
import { parseQueryIntent, type ParsedIntent } from '@/lib/parseQueryIntent'

const RECENT_SEARCHES_KEY = 'travyl:recentSearches'
const PINNED_RESULTS_KEY = 'travyl:pinnedResults'
const MAX_RECENT = 10

export type SearchScope = 'trips' | 'restaurants' | 'activities' | 'commands' | null

const SCOPE_TO_TYPES: Record<string, string[]> = {
  trips: ['trip'],
  restaurants: ['restaurant'],
  activities: ['activity'],
  commands: ['command'],
}

const ENTITY_TYPE_TO_SCOPE: Partial<Record<string, SearchScope>> = {
  restaurant: 'restaurants',
  activity: 'activities',
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
      latitude: number | null
      longitude: number | null
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
      href: buildHref(item.entity_type, item.entity_id, item.trip_id, item.entity_name),
      score: item.score,
      metadata: {
        ...item.metadata,
        latitude: item.latitude ?? undefined,
        longitude: item.longitude ?? undefined,
      },
    }))
  }
  return mapped
}

interface DiscoverPlace {
  id: string
  name: string
  category: string
  imageUrl: string
  rating: number | null
  priceLevel: string | null
  location: string
  latitude: number
  longitude: number
  description: string
}

interface DiscoverResponse {
  destination: { name: string; imageUrl: string } | null
  places: DiscoverPlace[]
  route?: { origin: string; destination: string }
}

async function fetchDiscover(query: string, token: string): Promise<DiscoverResponse> {
  const res = await fetch(`/api/discover?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { destination: null, places: [] }
  return res.json()
}

async function fetchFsqSearch(query: string, near?: string): Promise<Record<string, SpotlightResult[]>> {
  const params = new URLSearchParams({ q: query })
  if (near) params.set('near', near)
  const res = await fetch(`/api/fsq-search?${params}`)
  if (!res.ok) return {}
  const { results } = await res.json() as { results: SpotlightResult[] }
  const grouped: Record<string, SpotlightResult[]> = {}
  for (const r of results) {
    if (!grouped[r.type]) grouped[r.type] = []
    grouped[r.type].push(r)
  }
  return grouped
}

function buildHref(type: string, entityId: string, tripId: string | null, entityName?: string): string {
  if (type === 'destination') return `/destination/${encodeURIComponent(entityName ?? '')}`
  if (type === 'restaurant') return `/restaurant/${encodeURIComponent(entityId)}`
  if (type === 'hotel') return `/hotel/${encodeURIComponent(entityId)}`
  if (type === 'activity') return `/activity/${encodeURIComponent(entityId)}`
  if (!tripId) return '/'
  switch (type) {
    case 'flight': return `/trip/${tripId}/flights/${entityId}`
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

  // Intent parsing — Phase 1 (sync regex) or Phase 2 (Haiku LLM fallback) before any search fires
  const { data: parsedIntent, isLoading: intentLoading } = useQuery<ParsedIntent>({
    queryKey: ['parse-intent', debouncedQuery],
    queryFn: () => parseQueryIntent(debouncedQuery, token!),
    enabled: shouldSearch,
    staleTime: Infinity, // intent for a given query string never changes
  })

  // Existing context-search for trips (vector-powered)
  const { results: tripSearchResults, isLoading: tripSearchLoading } = useContextSearch(query)

  // New entity-search for hotels, flights, restaurants, activities, destinations
  const { data: entityResults, isLoading: entityLoading } = useQuery({
    queryKey: ['entity-search', debouncedQuery, effectiveTripId, entitySearchTypes],
    queryFn: () => fetchEntitySearch(debouncedQuery, entitySearchTypes, effectiveTripId, token!),
    enabled: shouldSearch,
    staleTime: 30_000,
  })

  // Use parsed location if available (e.g. "Bakersfield" from "bakersfield restaurants")
  const discoverLocation = parsedIntent?.location ?? debouncedQuery

  // Live discover for destination queries — waits for intent to resolve before firing.
  // Fires regardless of scope so entity-type scoped searches (e.g. "bakersfield restaurants")
  // still get discover results; scope filtering happens in discoverResults memo below.
  const { data: discoverData, isLoading: discoverLoading } = useQuery({
    queryKey: ['discover', discoverLocation],
    queryFn: () => fetchDiscover(discoverLocation, token!),
    enabled: shouldSearch && parsedIntent !== undefined,
    staleTime: 60_000,
  })

  // Foursquare text search — fires for entity-search intents to surface named places
  // (e.g. "the botanist bakersfield") that aren't in the user's saved trip data.
  const fsqEnabled = shouldSearch && parsedIntent !== undefined && parsedIntent.intent === 'entity-search'
  const { data: fsqResults, isLoading: fsqLoading } = useQuery({
    queryKey: ['fsq-search', debouncedQuery, parsedIntent?.location],
    queryFn: () => fetchFsqSearch(debouncedQuery, parsedIntent?.location),
    enabled: fsqEnabled,
    staleTime: 60_000,
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

  // Transform discover response into SpotlightResult format
  const discoverResults = useMemo((): Record<string, SpotlightResult[]> => {
    if (!discoverData?.places?.length) return {}

    // Build destination card — only when no scope (scope-less exploration)
    const results: Record<string, SpotlightResult[]> = {}

    if (!scope && discoverData.destination?.name) {
      results.destination = [{
        id: `discover-dest-${discoverData.destination.name}`,
        type: 'destination' as const,
        title: discoverData.destination.name,
        subtitle: `${discoverData.places.length} places to explore`,
        imageUrl: discoverData.destination.imageUrl || undefined,
        href: `/destination/${encodeURIComponent(discoverData.destination.name)}`,
        score: 2, // higher than entity results
        metadata: {},
      }]
    }

    // Group places by category → map to SpotlightResult types
    const categoryMap: Record<string, SpotlightResult['type']> = {
      dining: 'restaurant',
      sightseeing: 'activity',
      outdoor: 'activity',
      cultural: 'activity',
      shopping: 'activity',
      nightlife: 'activity',
      tour: 'activity',
    }

    // When a scope is active, only include place types that match it
    const allowedTypes = scope ? new Set(SCOPE_TO_TYPES[scope] ?? []) : null

    for (const place of discoverData.places) {
      const type = categoryMap[place.category] ?? 'activity'
      if (allowedTypes && !allowedTypes.has(type)) continue
      if (!results[type]) results[type] = []
      results[type].push({
        id: place.id,
        type,
        title: place.name,
        subtitle: place.location,
        imageUrl: place.imageUrl || undefined,
        href: `/destination/${encodeURIComponent(discoverData.destination?.name ?? debouncedQuery)}`,
        score: 1.5,
        metadata: {
          rating: place.rating ?? undefined,
          priceLevel: place.priceLevel ?? undefined,
          latitude: place.latitude,
          longitude: place.longitude,
          category: place.category,
          source: 'discover',
        },
      })
    }

    return results
  }, [discoverData, debouncedQuery, scope])

  // Action results derived from parsed intent (replaces createTripIntent + routeIntent memos)
  const actionResults = useMemo((): Record<string, SpotlightResult[]> => {
    if (!parsedIntent) return {}
    const actions: SpotlightResult[] = []

    if (parsedIntent.intent === 'create-trip') {
      actions.push({
        id: 'create-trip',
        type: 'action' as const,
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
        type: 'action' as const,
        title: `Plan trip: ${origin} to ${destination}`,
        subtitle: 'Start planning with destinations pre-filled',
        href: '',
        score: 100,
        metadata: { prefillDestination: destination, origin },
      })
    }

    return actions.length ? { action: actions } : {}
  }, [parsedIntent, discoverData?.route])

  // Auto-set scope from parsed entity type (only when user hasn't set one manually)
  useEffect(() => {
    if (parsedIntent?.entityType && scope === null) {
      const autoScope = ENTITY_TYPE_TO_SCOPE[parsedIntent.entityType]
      if (autoScope) setScope(autoScope)
    }
  }, [parsedIntent?.entityType, scope, setScope])

  // Merge all sources (now including commands, actions, discover, and Foursquare text search)
  const results = useMemo(() => {
    return mergeSearchResults([actionResults, tripResults, entityResults ?? {}, discoverResults, fsqResults ?? {}, navResults, commandResults], { maxPerCategory: 5 })
  }, [actionResults, tripResults, entityResults, discoverResults, fsqResults, navResults, commandResults])

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
    isLoading: tripSearchLoading || entityLoading || discoverLoading || intentLoading,
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
