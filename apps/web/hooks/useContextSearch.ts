'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export interface ContextSearchResult {
  tripId: string
  title: string
  destination: string
  startDate: string
  endDate: string
  status: string
  activityCount: number
  score: number
}

async function fetchContextSearch(query: string): Promise<ContextSearchResult[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return []

  const res = await fetch(`${API_URL}/api/events/search?city=${encodeURIComponent(query)}&country=`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return []
  const json = await res.json()
  return json.results ?? []
}

export function useContextSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const enabled = debouncedQuery.length >= 3

  const { data, isLoading, isError } = useQuery({
    queryKey: ['context-search', debouncedQuery],
    queryFn: () => fetchContextSearch(debouncedQuery),
    enabled,
    staleTime: 30_000,
  })

  return {
    results: data ?? [],
    isLoading: enabled && isLoading,
    isError,
  }
}
