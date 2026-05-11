'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'
import type { CalendarActivity } from '@travyl/shared'
import type { TransitDirectionResult } from '@travyl/shared'

// ── Public types ─────────────────────────────────────────────

export interface TransitRouteInfo {
  /** The activity ID this transit route leads TO */
  destinationActivityId: string
  /** The activity ID this transit route comes FROM */
  sourceActivityId: string
  /** Full transit direction result from OTP */
  direction: TransitDirectionResult | null
  /** Whether the fetch failed */
  error: string | null
  /** Whether the fetch is loading */
  isLoading: boolean
}

export interface TransitRouteMap {
  /** Keyed by destination activity ID */
  [destinationId: string]: TransitRouteInfo
}

// ── Coordinate check ────────────────────────────────────────

function hasCoords(a: CalendarActivity): boolean {
  return (
    typeof a.latitude === 'number' &&
    typeof a.longitude === 'number' &&
    !isNaN(a.latitude) &&
    !isNaN(a.longitude) &&
    a.latitude !== 0 &&
    a.longitude !== 0
  )
}

// ── Pair detection ─────────────────────────────────────────-

export function detectConsecutivePairs(
  activities: CalendarActivity[],
): { source: CalendarActivity; destination: CalendarActivity }[] {
  const sorted = [...activities]
    .filter((a) => a.onCalendar !== false)
    .sort((a, b) => a.startHour - b.startHour)

  const pairs: { source: CalendarActivity; destination: CalendarActivity }[] = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const source = sorted[i]
    const destination = sorted[i + 1]
    if (hasCoords(source) && hasCoords(destination)) {
      pairs.push({ source, destination })
    }
  }

  return pairs
}

// ── Fetch transit directions for a single pair ──────────────

async function fetchTransitDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<TransitDirectionResult | null> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const params = new URLSearchParams({
    origin_lat: originLat.toString(),
    origin_lng: originLng.toString(),
    dest_lat: destLat.toString(),
    dest_lng: destLng.toString(),
  })

  const res = await fetch(`/api/transit/directions?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Transit routing failed: ${res.status}`)
  }

  const data = await res.json()
  // The API returns { results: TransitDirectionResult[] } — pick the first/shortest
  if (Array.isArray(data) && data.length > 0) return data[0]
  if (data.results && Array.isArray(data.results) && data.results.length > 0) return data.results[0]
  if (data.itineraries && Array.isArray(data.itineraries) && data.itineraries.length > 0) return data.itineraries[0]

  return null
}

// ── Hook ─────────────────────────────────────────────────────

/**
 * Fetches transit directions between consecutive activities in a day.
 *
 * Returns a map keyed by destination activity ID, containing the transit
 * direction result (or null if none available) and loading/error state.
 */
export function useTransitRouting(
  tripStartDate: Date,
  dayIndex: number,
  activities: CalendarActivity[],
): TransitRouteMap {
  const dayActivities = activities.filter((a) => a.day === dayIndex)
  const pairs = detectConsecutivePairs(dayActivities)

  // Build query key from pair coordinates so cached results are reused
  const pairKey = pairs
    .map(
      (p) =>
        `${p.source.id}>${p.destination.id}:${p.source.latitude!.toFixed(4)},${p.source.longitude!.toFixed(4)}-${p.destination.latitude!.toFixed(4)},${p.destination.longitude!.toFixed(4)}`,
    )
    .join('|')

  const query = useQuery({
    queryKey: ['calendar-transit-routing', tripStartDate.toISOString(), dayIndex, pairKey],
    queryFn: async () => {
      const results: TransitRouteMap = {}

      for (const pair of pairs) {
        try {
          const direction = await fetchTransitDirections(
            pair.source.latitude!,
            pair.source.longitude!,
            pair.destination.latitude!,
            pair.destination.longitude!,
          )
          results[pair.destination.id] = {
            destinationActivityId: pair.destination.id,
            sourceActivityId: pair.source.id,
            direction,
            error: null,
            isLoading: false,
          }
        } catch (err) {
          results[pair.destination.id] = {
            destinationActivityId: pair.destination.id,
            sourceActivityId: pair.source.id,
            direction: null,
            error: err instanceof Error ? err.message : 'Unknown error',
            isLoading: false,
          }
        }
      }

      return results
    },
    enabled: pairs.length > 0,
    staleTime: 30 * 60 * 1000, // 30 min — transit schedules don't change often
    retry: 1,
  })

  return query.data ?? {}
}
