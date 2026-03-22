// apps/web/components/calendar/hooks/useSuggestions.ts
'use client'

import { useState, useMemo, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { SuggestionCard, RecommendationSection } from '../types'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

interface UseSuggestionsOptions {
  destination: string
  scheduledActivityIds?: string[]
}

interface UseSuggestionsReturn {
  sections: RecommendationSection[]
  suggestions: SuggestionCard[]
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  error: string | null
  searchQuery: string
  setSearchQuery: (query: string) => void
  removeSuggestion: (id: string) => void
  restoreSuggestion: (id: string) => void
  refetch: () => void
}

async function fetchSuggestions(
  destination: string,
  category: string,
  start: number,
): Promise<SuggestionCard[]> {
  const params = new URLSearchParams({ destination, category, start: String(start) })

  // Try authenticated /recommend endpoint first
  if (API_URL) {
    try {
      const { supabase } = await import('@travyl/shared')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (token) {
        const url = `${API_URL}/recommend?${params}`
        console.log('[ForYou] fetching (recommend):', url)

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })

        if (res.ok) {
          const data = await res.json()
          const items = data.suggestions ?? []
          console.log('[ForYou] got', items.length, 'personalized suggestions')
          if (items.length > 0) return items
          console.warn('[ForYou] /recommend returned 0 results, falling back to /api/suggest')
        } else {
          console.warn(`[ForYou] /recommend failed (${res.status}), falling back to /api/suggest`)
        }
      }
    } catch (err) {
      console.warn('[ForYou] /recommend auth error, falling back to /api/suggest', err)
    }
  }

  // Fallback: unauthenticated Next.js proxy
  const url = `/api/suggest?${params}`
  console.log('[ForYou] fetching (fallback):', url)

  const res = await fetch(url)

  if (!res.ok) {
    const body = await res.text()
    console.error('[ForYou] error body:', body)
    throw new Error(`${res.status}: ${body}`)
  }

  const data = await res.json()
  console.log('[ForYou] got', data.suggestions?.length ?? 0, 'suggestions at start', start)
  return data.suggestions ?? []
}

const CATEGORY_TITLES: Record<string, string> = {
  sightseeing: 'Must-See Sights',
  dining: 'Top Dining Spots',
  tour: 'Guided Tours',
  cultural: 'Arts & Culture',
  shopping: 'Shopping',
  nightlife: 'Nightlife',
  outdoor: 'Outdoor Activities',
  other: 'More to Explore',
}

function groupIntoSections(suggestions: SuggestionCard[], destination: string): RecommendationSection[] {
  const topRated = [...suggestions]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6)
  const topRatedIds = new Set(topRated.map((s) => s.id))

  const sections: RecommendationSection[] = []

  if (topRated.length > 0) {
    sections.push({
      sectionType: 'destination',
      sectionTitle: destination ? `Popular in ${destination}` : 'Popular Nearby',
      suggestions: topRated,
    })
  }

  const remaining = suggestions.filter((s) => !topRatedIds.has(s.id))
  const byCategory = new Map<string, SuggestionCard[]>()
  for (const s of remaining) {
    const cat = s.category || 'other'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(s)
  }

  for (const [cat, items] of byCategory) {
    if (items.length === 0) continue
    sections.push({
      sectionType: 'category',
      sectionTitle: CATEGORY_TITLES[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1),
      sectionSubtitle: `${items.length} places`,
      suggestions: items,
    })
  }

  return sections
}

export function useSuggestions({
  destination,
  scheduledActivityIds = [],
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [searchQuery, setSearchQuery] = useState('')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['suggestions', destination],
    queryFn: ({ pageParam }) => fetchSuggestions(destination, 'all', pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 20) return undefined
      return allPages.length * 20
    },
    enabled: !!destination,
    staleTime: 30 * 60 * 1000,
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

  const allSuggestions = useMemo(
    () => data?.pages.flat() ?? [],
    [data],
  )

  const scheduledSet = useMemo(() => new Set(scheduledActivityIds), [scheduledActivityIds])

  const filteredSuggestions = useMemo(() => {
    return allSuggestions.filter(
      (s) => !removedIds.has(s.id) && !scheduledSet.has(s.id),
    )
  }, [allSuggestions, removedIds, scheduledSet])

  const sections = useMemo(
    () => groupIntoSections(filteredSuggestions, destination),
    [filteredSuggestions, destination],
  )

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return filteredSuggestions
    const q = searchQuery.toLowerCase()
    return filteredSuggestions.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q),
    )
  }, [filteredSuggestions, searchQuery])

  return {
    sections,
    suggestions,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    error: error ? (error as Error).message : null,
    searchQuery,
    setSearchQuery,
    removeSuggestion,
    restoreSuggestion,
    refetch,
  }
}
