import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'

export interface ActivityIntelligence {
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
  weather: {
    tempMaxC: number | null
    precipitationMm: number | null
    weatherCode: number | null
  } | null
  conflicts: {
    hours: boolean
    travelTime: boolean
  }
}

const STALE_TIME = 60 * 60 * 1000 // 1 hour — matches Lambda DynamoDB TTL

export async function fetchActivityIntelligence(
  activityId: string,
  tripId: string,
): Promise<ActivityIntelligence> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const apiUrl = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL ?? ''
  const url = `${apiUrl}/activity-intelligence?activityId=${activityId}&tripId=${tripId}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`intelligence fetch failed: ${res.status}`)
  return res.json()
}

export function useActivityIntelligence(
  activityId: string | null,
  tripId: string,
) {
  return useQuery({
    queryKey: ['activity-intelligence', activityId, tripId],
    queryFn: () => fetchActivityIntelligence(activityId!, tripId),
    enabled: !!activityId,
    staleTime: STALE_TIME,
  })
}
