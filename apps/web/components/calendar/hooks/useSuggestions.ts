// apps/web/components/calendar/hooks/useSuggestions.ts
'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeFilter: FilterCategory
  setActiveFilter: (filter: FilterCategory) => void
  filterCategories: readonly FilterCategory[]
  removeSuggestion: (id: string) => void
  restoreSuggestion: (id: string) => void
  refetch: () => void
}

async function fetchSuggestions(destination: string): Promise<SuggestionCard[]> {
  const params = new URLSearchParams({ destination }).toString()

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
    throw new Error(`Failed to fetch suggestions (${res.status})`)
  }

  const data = await res.json()
  return data.suggestions
}

export function useSuggestions({
  destination,
  scheduledActivityIds = [],
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const { data: allSuggestions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['suggestions', destination],
    queryFn: () => fetchSuggestions(destination),
    enabled: !!destination,
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

    // Category filter
    if (activeFilter !== 'All') {
      const slugs = CATEGORY_MAP[activeFilter] ?? []
      filtered = filtered.filter((s) => slugs.includes(s.category))
    }

    // Search filter
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
