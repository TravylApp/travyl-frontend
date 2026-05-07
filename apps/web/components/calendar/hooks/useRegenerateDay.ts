import { useMutation } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'
import type { SuggestionCard } from '../types'

interface DayActivitySlot {
  id: string
  title: string
  type: string
  startHour: number
  duration: number
}

interface RegenerateDayParams {
  destination: string
  activities: DayActivitySlot[]
}

interface DaySlotAlternatives {
  activityId: string
  startHour: number
  duration: number
  originalType: string
  alternatives: SuggestionCard[]
}

interface RegenerateDayResponse {
  slots: DaySlotAlternatives[]
}

export function useRegenerateDay() {
  return useMutation<RegenerateDayResponse, Error, RegenerateDayParams>({
    mutationFn: async ({ destination, activities }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await fetch('/api/calendar/regenerate-day', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ destination, activities }),
      })

      if (!res.ok) throw new Error(`regenerate day failed: ${res.status}`)

      const data: RegenerateDayResponse = await res.json()
      return data
    },
  })
}

export type { DaySlotAlternatives, RegenerateDayResponse, DayActivitySlot }
