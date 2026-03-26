'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@travyl/shared'

export interface ContextSearchResult {
  tripId: string
  title: string
  destination: string
  startDate: string
  endDate: string
  status: string
  activityCount: number
  imageUrl: string | null
  score: number
}

async function fetchContextSearch(query: string, token: string): Promise<ContextSearchResult[]> {
  const res = await fetch(`/api/context-search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    console.error('[context-search] proxy error:', res.status, await res.text().catch(() => ''))
    return []
  }
  const json = await res.json()
  return json.results ?? []
}

export function useContextSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const token = useAuthStore((s) => s.session?.access_token)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const enabled = debouncedQuery.length >= 3 && !!token

  const { data, isLoading, isError } = useQuery({
    queryKey: ['context-search', debouncedQuery, token],
    queryFn: () => fetchContextSearch(debouncedQuery, token!),
    enabled,
    staleTime: 30_000,
    refetchOnMount: 'always',
  })

  return {
    results: data ?? [],
    isLoading: enabled && isLoading,
    isError,
  }
}
