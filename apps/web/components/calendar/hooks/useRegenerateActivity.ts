import { useMutation } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'
import type { SuggestionCard } from '../types'

interface RegenerateActivityParams {
  destination: string
  excludeNames: string[]
  category: string
  count?: number
}

interface RegenerateActivityResponse {
  alternatives: SuggestionCard[]
}

export function useRegenerateActivity() {
  return useMutation<SuggestionCard[], Error, RegenerateActivityParams>({
    mutationFn: async ({ destination, excludeNames, category, count = 4 }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await fetch('/api/calendar/regenerate-activity', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ destination, excludeNames, category, count }),
      })

      if (!res.ok) throw new Error(`regenerate activity failed: ${res.status}`)

      const data: RegenerateActivityResponse = await res.json()
      return data.alternatives
    },
  })
}
