'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useAuthStore } from '@travyl/shared/stores/authStore'
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
  source: 'cache' | 'fresh' | null
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeFilter: FilterCategory
  setActiveFilter: (filter: FilterCategory) => void
  filterCategories: readonly FilterCategory[]
  removeSuggestion: (id: string) => void
  restoreSuggestion: (id: string) => void
}

export function useSuggestions({
  destination,
  scheduledActivityIds = [],
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const session = useAuthStore((s) => s.session)

  const [allSuggestions, setAllSuggestions] = useState<SuggestionCard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'cache' | 'fresh' | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  // Track the current fetch to avoid race conditions
  const fetchIdRef = useRef(0)

  useEffect(() => {
    const fetchId = ++fetchIdRef.current

    // Reset state when destination changes
    setAllSuggestions([])
    setError(null)
    setSource(null)

    if (!destination) {
      setIsLoading(false)
      return
    }

    if (!API_URL || !session?.access_token) {
      setError('Not authenticated')
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    const controller = new AbortController()

    fetch(`${API_URL}/suggest?destination=${encodeURIComponent(destination)}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (fetchId !== fetchIdRef.current) return // Stale request

        if (!res.ok) {
          throw new Error(`Failed to load suggestions (${res.status})`)
        }

        const data = await res.json()
        setAllSuggestions(data.suggestions ?? [])
        setSource(data.source ?? null)
        setError(null)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        if (fetchId !== fetchIdRef.current) return

        setError(err.message ?? 'Failed to load suggestions')
        setAllSuggestions([])
      })
      .finally(() => {
        if (fetchId === fetchIdRef.current) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [destination, session?.access_token])

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

    // Search filter (client-side)
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
    error,
    source,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterCategories: FILTER_CATEGORIES,
    removeSuggestion,
    restoreSuggestion,
  }
}
