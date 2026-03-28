'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, usePathname } from 'next/navigation'
import { useAuthStore, useTrip, mergeSearchResults, type SpotlightResult } from '@travyl/shared'
import { useCalendarCommandsStore } from '@/stores/calendarCommandsStore'
import { fuzzyMatch } from '@/components/spotlight/fuzzyMatch'

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

// --- New interfaces for the two-phase pipeline ---

interface QuickSearchTripResult {
  tripId: string
  title: string
  destination: string
  startDate: string | null
  endDate: string | null
  status: string
  activityCount: number
  imageUrl: string | null
  score: number
}

interface QuickSearchEntityResult {
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
}

interface QuickSearchResponse {
  intent: { intent: string; location?: string; entityType?: string; rawQuery: string }
  results: {
    trip?: QuickSearchTripResult[]
    [key: string]: QuickSearchEntityResult[] | QuickSearchTripResult[] | undefined
  }
}

interface DeepSearchResponse {
  results: {
    restaurant?: Array<{ id: string; type: string; title: string; subtitle: string; href: string; score: number; metadata?: Record<string, unknown> }>
    activity?: Array<{ id: string; type: string; title: string; subtitle: string; href: string; score: number; metadata?: Record<string, unknown> }>
    hotel?: Array<{ id: string; type: string; title: string; subtitle: string; href: string; score: number; metadata?: Record<string, unknown> }>
    destination?: Array<{ id: string; type: string; title: string; subtitle: string; imageUrl?: string; href: string; score: number; metadata?: Record<string, unknown> }>
    user?: Array<{ id: string; type: string; title: string; subtitle: string; href: string; score: number; metadata?: Record<string, unknown> }>
    [key: string]: Array<{ id: string; type: string; title: string; subtitle: string; href?: string; imageUrl?: string; score: number; metadata?: Record<string, unknown> }> | undefined
  }
}

// --- Fetch functions ---

async function fetchSearchQuick(
  query: string,
  token: string,
  tripId: string | null,
): Promise<QuickSearchResponse> {
  const params = new URLSearchParams({ q: query })
  if (tripId) params.set('tripId', tripId)
  const res = await fetch(`/api/search/quick?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { intent: { intent: 'unknown', rawQuery: query }, results: {} }
  return res.json()
}

async function fetchSearchDeep(
  query: string,
  intent: { intent: string; location?: string; entityType?: string; rawQuery: string },
  token: string,
): Promise<DeepSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    intent: intent.intent,
  })
  if (intent.location) params.set('location', intent.location)
  if (intent.entityType) params.set('entityType', intent.entityType)
  const res = await fetch(`/api/search/deep?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { results: {} }
  return res.json()
}

// --- Helpers ---

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

function mapEntityToSpotlight(item: QuickSearchEntityResult): SpotlightResult {
  return {
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

  // 200ms debounce (single debounce for the two-phase pipeline)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  const shouldSearchQuick = debouncedQuery.length >= 2 && !!token

  // Phase 1: Quick search — internal data only
  const { data: quickData, isLoading: quickLoading } = useQuery({
    queryKey: ['search-quick', debouncedQuery, effectiveTripId],
    queryFn: () => fetchSearchQuick(debouncedQuery, token!, effectiveTripId),
    enabled: shouldSearchQuick,
    staleTime: 30_000,
  })

  // Extract intent from Phase 1 response (parsed server-side)
  const parsedIntent = quickData?.intent

  // Phase 2: Deep search — external data, only fires when Phase 1 returns intent
  const shouldSearchDeep = !!quickData?.intent && debouncedQuery.length >= 3
  const { data: deepData, isLoading: deepLoading } = useQuery({
    queryKey: ['search-deep', debouncedQuery, quickData?.intent],
    queryFn: () => fetchSearchDeep(debouncedQuery, quickData!.intent, token!),
    enabled: shouldSearchDeep,
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

  // Transform Phase 1 trip results
  const tripResults = useMemo((): Record<string, SpotlightResult[]> => {
    if (scope && scope !== 'trips') return {}
    const trips = quickData?.results?.trip
    if (!trips?.length) return {}
    return {
      trip: trips.map((r) => ({
        id: r.tripId,
        type: 'trip' as const,
        title: r.title,
        subtitle: r.destination,
        imageUrl: r.imageUrl ?? undefined,
        tripId: r.tripId,
        href: `/trip/${r.tripId}`,
        score: r.score,
        metadata: { source: 'my-trips' },
      })),
    }
  }, [quickData?.results?.trip, scope])

  // Transform Phase 1 entity results (activities + restaurants from user's trips)
  const quickEntityResults = useMemo((): Record<string, SpotlightResult[]> => {
    const results: Record<string, SpotlightResult[]> = {}
    for (const [type, items] of Object.entries(quickData?.results ?? {})) {
      if (type === 'trip') continue
      if (!items?.length) continue
      const allowedTypes = scope ? new Set(SCOPE_TO_TYPES[scope] ?? []) : null
      if (allowedTypes && !allowedTypes.has(type)) continue
      results[type] = (items as QuickSearchEntityResult[]).map(mapEntityToSpotlight)
    }
    return results
  }, [quickData?.results, scope])

  // Transform Phase 2 results (Foursquare + SerpAPI + collaborators)
  const deepEntityResults = useMemo((): Record<string, SpotlightResult[]> => {
    const results: Record<string, SpotlightResult[]> = {}
    for (const [type, items] of Object.entries(deepData?.results ?? {})) {
      if (!items?.length) continue
      const allowedTypes = scope ? new Set(SCOPE_TO_TYPES[scope] ?? []) : null
      if (allowedTypes && !allowedTypes.has(type)) continue
      results[type] = items.map((item) => ({
        id: item.id,
        type: item.type as SpotlightResult['type'],
        title: item.title,
        subtitle: item.subtitle,
        imageUrl: item.imageUrl,
        href: item.href ?? '/',
        score: item.score,
        metadata: item.metadata,
      }))
    }
    return results
  }, [deepData?.results, scope])

  // Action results derived from parsed intent
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

    if (parsedIntent.intent === 'route') {
      actions.push({
        id: 'create-trip-route',
        type: 'action' as const,
        title: parsedIntent.location ? `Plan route to ${parsedIntent.location}` : 'Plan a route',
        subtitle: 'Start planning with destinations pre-filled',
        href: '',
        score: 100,
        metadata: { prefillDestination: parsedIntent.location ?? '' },
      })
    }

    return actions.length ? { action: actions } : {}
  }, [parsedIntent])

  // Auto-set scope from parsed entity type (only when user hasn't set one manually)
  useEffect(() => {
    if (parsedIntent?.entityType && scope === null) {
      const autoScope = ENTITY_TYPE_TO_SCOPE[parsedIntent.entityType]
      if (autoScope) setScope(autoScope)
    }
  }, [parsedIntent?.entityType, scope, setScope])

  // Merge all sources
  const results = useMemo(() => {
    return mergeSearchResults(
      [actionResults, tripResults, quickEntityResults, deepEntityResults, navResults, commandResults],
      { maxPerCategory: 5 },
    )
  }, [actionResults, tripResults, quickEntityResults, deepEntityResults, navResults, commandResults])

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

  // Phase 1 (quick): trip search + command filtering + nav filtering
  const quickLoading = tripSearchLoading

  // Phase 2 (deep): external searches (entity, discover, fsq) + intent parsing
  const deepLoading = entityLoading || discoverLoading || intentLoading || fsqLoading

  // Overall loading: either phase is loading
  const isLoading = quickLoading || deepLoading

  return {
    query,
    setQuery,
    results,
    isLoading,
    quickLoading,
    deepLoading,
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
