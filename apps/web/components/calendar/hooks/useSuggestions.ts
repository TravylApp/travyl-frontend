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
