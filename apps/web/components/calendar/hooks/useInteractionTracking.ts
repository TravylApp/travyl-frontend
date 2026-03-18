'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@travyl/shared/stores/authStore'

type InteractionAction = 'impression' | 'click' | 'drag' | 'dismiss'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export function useInteractionTracking(tripId: string) {
  const session = useAuthStore((s) => s.session)

  const trackInteraction = useCallback(
    async (suggestionId: string, action: InteractionAction) => {
      if (!API_URL || !session?.access_token) return

      try {
        await fetch(`${API_URL}/interact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ suggestionId, action, tripId }),
        })
      } catch {
        // Fire-and-forget — don't block UI on tracking failures
      }
    },
    [tripId, session?.access_token],
  )

  return { trackInteraction }
}
