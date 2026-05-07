/**
 * @module useCarSearch
 * Searches for available car rentals at a location for given pickup/dropoff dates.
 * Calls the /api/cars/search endpoint and caches results for 15 minutes.
 * The query is held until pickup_location, pickup_date, and dropoff_date are all provided.
 * Used by the web car rental search UI.
 */

'use client'

import { getWebApiBase } from '../utils'
import { useQuery } from '@tanstack/react-query'

/**
 * Parameters for a car rental availability search.
 */
export interface CarSearchParams {
  /** Pickup location as a city/address string (e.g. 'San Francisco, CA') */
  pickupLocation?: string
  /** Dropoff location; defaults to pickup location if omitted */
  dropoffLocation?: string
  /** Pickup date in YYYY-MM-DD format */
  pickupDate?: string
  /** Pickup time in HH:MM format; defaults to '10:00' */
  pickupTime?: string
  /** Dropoff date in YYYY-MM-DD format */
  dropoffDate?: string
  /** Dropoff time in HH:MM format; defaults to '10:00' */
  dropoffTime?: string
}

/**
 * Searches for available car rentals matching the given parameters.
 * Results are cached for 15 minutes. The query is disabled until pickupLocation,
 * pickupDate, and dropoffDate are all non-empty strings.
 * @param params - Car rental search criteria
 * @returns React Query result with car rental search results from the API
 */
export function useCarSearch(params: CarSearchParams) {
  const base = getWebApiBase()
  const { pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime } = params
  const enabled = !!pickupLocation && !!pickupDate && !!dropoffDate

  return useQuery({
    queryKey: ['car-search', pickupLocation, dropoffLocation, pickupDate, pickupTime, dropoffDate, dropoffTime],
    queryFn: async () => {
      const qs = new URLSearchParams({
        pickup_location: pickupLocation!,
        pickup_date: pickupDate!,
        dropoff_date: dropoffDate!,
      })
      if (dropoffLocation) qs.set('dropoff_location', dropoffLocation)
      if (pickupTime) qs.set('pickup_time', pickupTime)
      if (dropoffTime) qs.set('dropoff_time', dropoffTime)
      const url = `${base}/api/cars/search?${qs}`
      const res = await fetch(url)
      if (!res.ok) {
        const text = await res.text()
        let body: any = {}
        try { body = JSON.parse(text) } catch {}
        console.warn('[useCarSearch] non-OK', res.status, body?.error || text.slice(0, 200))
        return { rates: [], error: body?.error || `HTTP ${res.status}`, status: res.status }
      }
      return res.json()
    },
    enabled,
    staleTime: 15 * 60 * 1000,
    retry: false,
  })
}
