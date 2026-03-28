import { useMutation } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'
import type { CalendarActivity } from '../types'

interface GapSuggestionDto {
  title: string
  type: string
  startHour: number
  duration: number
  latitude?: number
  longitude?: number
  address?: string
  rating?: number
  price?: number | null
  image?: string
  description?: string
}

interface FillGapsParams {
  date: string
  dayIndex: number
  activities: CalendarActivity[]
}

interface UseGapFillerOpts {
  tripId: string
  destination: string
  onSuccess: (suggestions: CalendarActivity[]) => void
  onError?: () => void
}

export function useGapFiller({
  tripId,
  destination,
  onSuccess,
  onError,
}: UseGapFillerOpts): {
  fill: (params: FillGapsParams) => void
  isPending: boolean
} {
  const mutation = useMutation<CalendarActivity[], Error, FillGapsParams>({
    mutationFn: async ({ date, dayIndex, activities }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const apiUrl = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL ?? ''
      const res = await fetch(`${apiUrl}/fill-gaps`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          destination,
          date,
          activities: activities.map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            startHour: a.startHour,
            duration: a.duration,
            latitude: a.latitude,
            longitude: a.longitude,
          })),
        }),
      })

      if (!res.ok) throw new Error(`fill-gaps failed: ${res.status}`)

      const data: { suggestions: GapSuggestionDto[] } = await res.json()

      return data.suggestions.map((s) => ({
        id: `ghost-${crypto.randomUUID()}`,
        title: s.title,
        type: s.type,
        day: dayIndex,
        startHour: s.startHour,
        duration: s.duration,
        latitude: s.latitude,
        longitude: s.longitude,
        rating: s.rating,
        price: s.price != null ? `$${s.price}` : undefined,
        image: s.image,
        unscheduled: false,
      } satisfies CalendarActivity))
    },
    onSuccess,
    onError: () => {
      onError?.()
    },
  })

  return {
    fill: (params) => mutation.mutate(params),
    isPending: mutation.isPending,
  }
}
