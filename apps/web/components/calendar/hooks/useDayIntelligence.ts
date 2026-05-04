import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'

export interface DayIntelligenceActivity {
  place: {
    name: string
    address: string
    rating: number | null
    priceTier: string | null
    photos: string[]
    openingHours: Array<{ day: string; opens: string; closes: string }> | null
  }
  logistics: {
    travelTimeMinutes: number | null
    distanceKm: number | null
    previousActivityName: string | null
  }
  conflicts: {
    hours: boolean
    travelTime: boolean
  }
}

export interface DayIntelligenceData {
  weather: {
    tempMaxC: number | null
    precipitationMm: number | null
    weatherCode: number | null
  } | null
  activities: Record<string, DayIntelligenceActivity>
}

const STALE_TIME = 60 * 60 * 1000 // 1 hour

export async function fetchDayIntelligence(
  tripId: string,
  date: string,
): Promise<DayIntelligenceData> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const url = `/api/calendar/day-intelligence?tripId=${tripId}&date=${date}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`intelligence fetch failed: ${res.status}`)
  return res.json()
}

export function useDayIntelligence(
  tripId: string | null,
  date: string | null,
) {
  return useQuery({
    queryKey: ['day-intelligence', tripId, date],
    queryFn: () => fetchDayIntelligence(tripId!, date!),
    enabled: !!tripId && !!date,
    staleTime: STALE_TIME,
  })
}
