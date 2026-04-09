import { useState, useEffect, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import { supabase, toCalendarActivity, mapToDbType, type ActivityRow, type Trip } from '@travyl/shared'
import { useYjsTripContext } from '../providers/YjsTripProvider'
import { CALENDAR_ACTIVITY_KEYS } from './yMapToCalendarActivity'

interface UseTripActivitiesReturn {
  trip: Trip | null
  tripStartDate: string
  loading: boolean
  error: string | null
  refetchTrip: () => Promise<void>
}

export function useTripActivities(tripId: string): UseTripActivitiesReturn {
  const { activitiesMap } = useYjsTripContext()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track which tripId has been hydrated so we don't re-hydrate on re-renders.
  const hydratedRef = useRef<string | null>(null)
  // Separate ref to track when initial data has loaded, so re-runs of the effect
  // (e.g. after a refetch) don't re-show the loading skeleton.
  const loadedTripIdRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchAndHydrate() {
      // Show skeleton only when this tripId hasn't loaded yet.
      // Re-runs caused by activitiesMap changing (MapA → MapB) re-hydrate silently.
      if (loadedTripIdRef.current !== tripId) {
        setLoading(true)
      }
      setError(null)

      // Fetch trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()

      if (cancelled) return

      if (tripError) {
        setError(tripError.message)
        setLoading(false)
        return
      }

      const fetchedTrip = tripData as Trip
      setTrip(fetchedTrip)

      // Fetch activities
      const { data: activityData, error: activityError } = await supabase
        .from('activity')
        .select('*')
        .eq('trip_id', tripId)

      if (cancelled) return

      if (activityError) {
        setError(activityError.message)
        setLoading(false)
        return
      }

      let rows = (activityData ?? []) as ActivityRow[]
      const tripStartDate = fetchedTrip.start_date

      // Auto-seed: if no activities in DB but trip_context has itinerary, insert them
      if (rows.length === 0 && fetchedTrip.trip_context?.itinerary?.length) {
        const itinerary = fetchedTrip.trip_context.itinerary as any[]
        const seedRows: Record<string, unknown>[] = []
        let sortIdx = 0
        for (const day of itinerary) {
          const dayDate = day.date || fetchedTrip.start_date
          for (const slot of day.slots ?? []) {
            const poi = slot.poi ?? {}
            seedRows.push({
              trip_id: tripId,
              user_id: null,
              activity_name: poi.name || 'Activity',
              activity_type: mapToDbType(poi.category || 'sightseeing'),
              starting_date: dayDate,
              ending_date: dayDate,
              starting_time: slot.start_time || '09:00',
              ending_time: slot.end_time || '11:00',
              latitude: poi.lat || 0,
              longitude: poi.lng || 0,
              sort_order: sortIdx++,
              notes: '',
              activity_data: {
                category: poi.category,
                location_name: poi.name,
                image_url: poi.photo_url || null,
                rating: poi.rating || null,
              },
            })
          }
        }
        if (seedRows.length > 0) {
          const { data: seeded, error: seedErr } = await supabase
            .from('activity')
            .insert(seedRows)
            .select('*')
          if (!seedErr && seeded) {
            rows = seeded as ActivityRow[]
          }
        }
      }

      // Hydrate Y.Map inside a single transaction. Use 'hydration' as the
      // transaction origin so onUpdate skips broadcasting this initial load.
      if (hydratedRef.current !== tripId) {
        activitiesMap.doc?.transact(() => {
          for (const row of rows) {
            const cal = toCalendarActivity(row, tripStartDate)
            let yMap = activitiesMap.get(cal.id)
            if (!yMap) {
              yMap = new Y.Map<unknown>()
              activitiesMap.set(cal.id, yMap)
            }
            for (const key of CALENDAR_ACTIVITY_KEYS) {
              const val = (cal as any)[key]
              if (val !== undefined) yMap.set(key, val)
            }
          }
        }, 'hydration')
        hydratedRef.current = tripId
      }

      loadedTripIdRef.current = tripId
      setLoading(false)
    }

    fetchAndHydrate()

    return () => {
      cancelled = true
    }
  }, [tripId, activitiesMap])

  const tripStartDate = trip?.start_date ?? ''

  const refetchTrip = useCallback(async () => {
    const { data, error } = await supabase.from('trips').select('*').eq('id', tripId).single()
    if (!error && data) setTrip(data as Trip)
  }, [tripId])

  return { trip, tripStartDate, loading, error, refetchTrip }
}
