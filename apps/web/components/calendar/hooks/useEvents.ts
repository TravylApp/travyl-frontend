'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { LocalEvent } from '../types'

interface UseEventsParams {
  destination: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
}

interface UseEventsReturn {
  events: LocalEvent[]
  eventsByDate: Record<string, LocalEvent[]>
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// Auth is handled server-side by the Next.js proxy route (api-utils proxyToBackend),
// which forwards the Supabase session cookie to the Lambda.
async function fetchEvents(
  destination: string,
  startDate: string,
  endDate: string,
): Promise<LocalEvent[]> {
  const params = new URLSearchParams({ destination, startDate, endDate })
  const res = await fetch(`/api/trip-events?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`)
  const data = await res.json()
  return (data.events ?? []) as LocalEvent[]
}

export function useEvents({
  destination,
  startDate,
  endDate,
}: UseEventsParams): UseEventsReturn {
  const {
    data: events = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['trip-events', destination, startDate, endDate],
    queryFn: () => fetchEvents(destination, startDate, endDate),
    enabled: !!destination && !!startDate && !!endDate,
    staleTime: 60 * 60 * 1000,       // 1 hour
    gcTime: 2 * 60 * 60 * 1000,     // 2 hours
  })

  const eventsByDate = useMemo(() => {
    const map: Record<string, LocalEvent[]> = {}
    for (const event of events) {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    }
    return map
  }, [events])

  return {
    events,
    eventsByDate,
    isLoading,
    error,
    refetch,
  }
}
