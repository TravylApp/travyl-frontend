// apps/web/components/calendar/hooks/useSuggestions.ts
'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
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

async function fetchSuggestions(destination: string, q?: string): Promise<SuggestionCard[]> {
  if (!destination) return []
  try {
    const params = new URLSearchParams({ destination })
    if (q) params.set('q', q)
    const res = await fetch(`/api/suggest?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.suggestions ?? []
  } catch {
    return []
  }
}

async function fetchSuggestionsPage(destination: string, page: number): Promise<{ suggestions: SuggestionCard[]; hasMore: boolean }> {
  try {
    const params = new URLSearchParams({ destination, page: String(page) })
    const res = await fetch(`/api/suggest?${params}`)
    if (!res.ok) return { suggestions: [], hasMore: false }
    const data = await res.json()
    return { suggestions: data.suggestions ?? [], hasMore: data.hasMore ?? false }
  } catch {
    return { suggestions: [], hasMore: false }
  }
}

function dedup(items: SuggestionCard[]): SuggestionCard[] {
  const seen = new Set<string>()
  return items.filter((s) => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
}

export function useSuggestions({
  destination,
  scheduledActivityIds = [],
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [searchQuery, setSearchQuery] = useState('')
  const [committedQuery, setCommittedQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [extraSuggestions, setExtraSuggestions] = useState<SuggestionCard[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreFromServer, setHasMoreFromServer] = useState(true)
  const nextPageRef = useRef(1)
  const isLoadingMoreRef = useRef(false)

  const commitSearch = useCallback(() => {
    setCommittedQuery(searchQuery.trim())
    setExtraSuggestions([])
    setHasMoreFromServer(true)
    nextPageRef.current = 1
  }, [searchQuery])

  const { data: initialSuggestions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['suggestions', destination, committedQuery],
    queryFn: () => fetchSuggestions(destination, committedQuery || undefined),
    enabled: !!destination,
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  })

  // Combine initial + extra, deduped
  const allSuggestions = useMemo(
    () => dedup([...initialSuggestions, ...extraSuggestions]),
    [initialSuggestions, extraSuggestions],
  )

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMoreFromServer || committedQuery) return
    isLoadingMoreRef.current = true
    setIsLoadingMore(true)
    try {
      const page = nextPageRef.current
      const { suggestions: results, hasMore } = await fetchSuggestionsPage(destination, page)
      nextPageRef.current = page + 1
      setHasMoreFromServer(hasMore)
      setExtraSuggestions((prev) => [...prev, ...results])
    } finally {
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [destination, committedQuery, hasMoreFromServer])

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

    if (activeFilter !== 'All') {
      const slugs = CATEGORY_MAP[activeFilter] ?? []
      filtered = filtered.filter((s) => slugs.includes(s.category))
    }

    if (searchQuery.trim() && !committedQuery) {
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
  }, [allSuggestions, searchQuery, committedQuery, activeFilter, removedIds, scheduledActivityIds])

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
    hasMore: hasMoreFromServer && !committedQuery,
    isLoadingMore,
    loadMore,
  }
}
