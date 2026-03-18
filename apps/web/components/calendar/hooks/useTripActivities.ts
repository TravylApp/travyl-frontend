import { useState, useEffect, useRef } from 'react'
import * as Y from 'yjs'
import { supabase, toCalendarActivity, type ActivityRow } from '@travyl/shared'
import { useYjsTripContext } from '../providers/YjsTripProvider'

interface Trip {
  id: string
  title: string
  destination: string
  start_date: string
  end_date: string
  status: string
  user_id: string
}

const CALENDAR_ACTIVITY_KEYS = [
  'id',
  'title',
  'type',
  'day',
  'endDay',
  'startHour',
  'duration',
  'location',
  'image',
  'rating',
  'price',
  'notes',
  'color',
  'latitude',
  'longitude',
  'sortOrder',
] as const

interface UseTripActivitiesReturn {
  trip: Trip | null
  tripStartDate: string
  loading: boolean
  error: string | null
}

export function useTripActivities(tripId: string): UseTripActivitiesReturn {
  const { activitiesMap } = useYjsTripContext()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track whether we've already hydrated for this tripId to avoid re-hydrating
  const hydratedRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchAndHydrate() {
      setLoading(true)
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

      const rows = (activityData ?? []) as ActivityRow[]
      const tripStartDate = fetchedTrip.start_date

      // Hydrate Y.Map inside a single transaction
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
        })
        hydratedRef.current = tripId
      }

      setLoading(false)
    }

    fetchAndHydrate()

    return () => {
      cancelled = true
    }
  }, [tripId, activitiesMap])

  const tripStartDate = trip?.start_date ?? ''

  return { trip, tripStartDate, loading, error }
}
