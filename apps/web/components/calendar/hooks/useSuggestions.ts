// apps/web/components/calendar/hooks/useSuggestions.ts
'use client'

import { useState, useMemo, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { SuggestionCard } from '../types'

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
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
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
  category: string,
  start: number,
): Promise<SuggestionCard[]> {
  const url = `/api/suggest?destination=${encodeURIComponent(destination)}&category=${encodeURIComponent(category)}&start=${start}`
  console.log('[ForYou] fetching:', url)

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

export function useSuggestions({
  destination,
  scheduledActivityIds = [],
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const category = FILTER_TO_CATEGORY[activeFilter] ?? 'all'

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['suggestions', destination, activeFilter],
    queryFn: ({ pageParam }) => fetchSuggestions(destination, category, pageParam as number),
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

  const suggestions = useMemo(() => {
    let filtered = allSuggestions.filter(
      (s) => !removedIds.has(s.id) && !scheduledActivityIds.includes(s.id),
    )

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
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
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
