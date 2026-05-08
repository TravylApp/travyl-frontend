import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAuditEntries, supabase } from '@travyl/shared'
import type { EnrichedAuditEntry } from '@travyl/shared'

export type AuditEntry = EnrichedAuditEntry
export type { EnrichedAuditEntry }

export function useActivityHistory(tripId: string, enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled || !tripId) return

    const channel = supabase
      .channel(`itinerary-edits:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'itinerary_edits',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('[useActivityHistory] Real-time audit entry received:', payload.new)
          queryClient.invalidateQueries({ queryKey: ['activity-history', tripId] })
        },
      )
      .subscribe((status, err) => {
        console.log(`[useActivityHistory] Subscription status for trip ${tripId}:`, status)
        if (err) {
          console.error('[useActivityHistory] Subscription error:', err.message)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId, enabled, queryClient])

  return useQuery({
    queryKey: ['activity-history', tripId],
    queryFn: () => fetchAuditEntries(tripId),
    enabled,
    staleTime: 0,
  })
}
