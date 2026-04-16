'use client'

import { useCallback, useRef } from 'react'
import { supabase } from '@travyl/shared'

type InteractionAction = 'impression' | 'click' | 'drag' | 'dismiss'

export function useInteractionTracking(tripId: string) {
  // Deduplicate impressions within a session
  const impressedIds = useRef(new Set<string>())

  const trackEvent = useCallback(
    (suggestionId: string, action: InteractionAction, category: string) => {
      // Skip duplicate impressions
      if (action === 'impression') {
        if (impressedIds.current.has(suggestionId)) return
        impressedIds.current.add(suggestionId)
      }

      // Fire and forget — no await, no error handling
      supabase.auth.getSession().then(({ data: { session } }) => {
        const token = session?.access_token
        if (!token) return

        fetch('/api/calendar/interact', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ suggestionId, action, tripId, category }),
        }).catch(() => {}) // swallow errors
      })
    },
    [tripId],
  )

  return { trackEvent }
}
