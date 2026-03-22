// apps/web/hooks/useIndexTrip.ts
'use client'

import { useCallback, useRef } from 'react'
import { supabase } from '@travyl/shared'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export function useIndexTrip() {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const indexTrip = useCallback((tripId: string) => {
    // Clear existing timer for this tripId (5s debounce per trip)
    const existing = timers.current.get(tripId)
    if (existing) clearTimeout(existing)

    timers.current.set(
      tripId,
      setTimeout(() => {
        timers.current.delete(tripId)

        // Fire and forget
        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token
          if (!token) return

          fetch(`${API_URL}/index`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tripId }),
          }).catch(() => {}) // swallow errors
        })
      }, 5000),
    )
  }, [])

  return { indexTrip }
}
