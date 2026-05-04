'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export type BookingStatus = 'unmatched' | 'matched' | 'opened'

export interface BookingMatch {
  activityId: string
  status: BookingStatus
  provider?: string
  matchedName?: string
  bookingUrl?: string
  affiliateUrl?: string
  confidence?: number
  updatedAt?: string
}

interface UseBookingMatchesOptions {
  tripId: string
  authToken: string
}

interface UseBookingMatchesReturn {
  matches: Map<string, BookingMatch>
  hasMatches: boolean
  fetchStatus: () => Promise<void>
  startRealtimeAndMatch: (activities: Array<{
    id: string; title: string; type: string
    latitude: number | null; longitude: number | null
  }>) => Promise<{ total: number; matches: BookingMatch[] }>
  markOpened: (activityIds: string[]) => Promise<void>
}

export function useBookingMatches({
  tripId,
  authToken,
}: UseBookingMatchesOptions): UseBookingMatchesReturn {
  const [matches, setMatches] = useState<Map<string, BookingMatch>>(new Map())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)

  const applyRows = useCallback((rows: BookingMatch[]) => {
    setMatches((prev) => {
      const next = new Map(prev)
      for (const row of rows) next.set(row.activityId, row)
      return next
    })
  }, [])

  // Subscribe to Realtime updates for this trip
  const subscribeRealtime = useCallback(() => {
    const supabase = getSupabaseBrowser()
    if (channelRef.current) return // already subscribed

    const channel = supabase
      .channel(`booking_matches:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_matches',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = payload.new as any
          if (!row?.activity_id) return
          applyRows([{
            activityId: row.activity_id,
            status: row.status,
            provider: row.provider ?? undefined,
            matchedName: row.matched_name ?? undefined,
            bookingUrl: row.booking_url ?? undefined,
            affiliateUrl: row.affiliate_url ?? undefined,
            confidence: row.confidence ?? undefined,
            updatedAt: row.updated_at,
          }])
        },
      )
      .subscribe()
    channelRef.current = channel
  }, [tripId, applyRows])

  // Fetch current status from proxy
  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/calendar/book/status/${tripId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    if (!res.ok) return
    const data = await res.json()
    applyRows(data.matches ?? [])
  }, [tripId, authToken, applyRows])

  // Subscribe Realtime first, then fire POST /book/match
  const startRealtimeAndMatch = useCallback(async (activities: Array<{
    id: string; title: string; type: string
    latitude: number | null; longitude: number | null
  }>) => {
    subscribeRealtime()

    const res = await fetch('/api/calendar/book/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ tripId, activities }),
    })
    if (!res.ok) throw new Error('match request failed')
    const data = await res.json()
    return data as { total: number; matches: BookingMatch[] }
  }, [tripId, authToken, subscribeRealtime])

  // Mark activities as opened in Supabase (client-side update, constrained by RLS to 'opened' only)
  const markOpened = useCallback(async (activityIds: string[]) => {
    const supabase = getSupabaseBrowser()
    for (const activityId of activityIds) {
      await supabase
        .from('booking_matches')
        .update({ status: 'opened' })
        .eq('trip_id', tripId)
        .eq('activity_id', activityId)
    }
    applyRows(activityIds.map((id) => {
      const existing = matches.get(id)
      return { ...(existing ?? { activityId: id, status: 'unmatched' as BookingStatus }), status: 'opened' as BookingStatus }
    }))
  }, [tripId, matches, applyRows])

  // Fetch prior state on mount
  useEffect(() => {
    if (!tripId || !authToken) return
    fetchStatus()
    return () => {
      // Unsubscribe on unmount
      if (channelRef.current) {
        getSupabaseBrowser().removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const hasMatches = matches.size > 0

  return { matches, hasMatches, fetchStatus, startRealtimeAndMatch, markOpened }
}
