'use client'

// Background preloader for the flights/hotels/cars/explore subpages of a trip.
//
// Fires once per (tripId + derived inputs) when the trip overview page mounts.
// Goal: by the time the user clicks the Flights/Hotels/Cars tab, the
// upstream API call has already been answered and cached by the browser
// (Cache-Control on the server) so the panel's auto-search renders instantly.
//
// What we deliberately do NOT do:
//  - Refetch saved bookings (those are read from Supabase via React Query
//    and are practically free).
//  - Block render on any of this — every fetch is fire-and-forget.
//  - Warm anything when the user is on save-data / 2g (see imageWarmer).

import { useEffect, useRef } from 'react'
import { useProfile } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import { searchAirports } from '@/components/trip/flights/airportSearch'
import { warmImages } from './imageWarmer'

interface PreloadInputs {
  tripId: string
  trip: Pick<Trip, 'id' | 'destination' | 'start_date' | 'end_date'> | null | undefined
  /** Image URLs already known on the overview (explore covers, hero, restaurants). */
  overviewImages?: Iterable<string | null | undefined>
}

function shouldSkipNetwork(): boolean {
  if (typeof navigator === 'undefined') return true
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (!conn) return false
  if (conn.saveData) return true
  if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true
  return false
}

function scheduleIdle(cb: () => void, timeout = 4000): void {
  if (typeof window === 'undefined') return
  const ric = (window as Window & {
    requestIdleCallback?: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number
  }).requestIdleCallback
  if (ric) ric(cb, { timeout })
  else setTimeout(cb, 200)
}

async function fetchJsonSafe<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

interface FlightLeg { airlineLogo?: string | null }
interface FlightResult { airlineLogo?: string | null; legs?: FlightLeg[] }
interface FlightsResponse { flights?: FlightResult[] }
interface HotelResult { images?: string[] }
interface HotelsResponse { hotels?: HotelResult[] }
interface CarRate { images?: string[]; supplier_logo?: string | null }
interface CarsResponse { rates?: CarRate[] }

/**
 * Mounted by the trip overview page. Self-throttling — won't re-fire for the
 * same (tripId, route, dates) tuple even across remounts in the same session.
 */
export function useTripPreload({ tripId, trip, overviewImages }: PreloadInputs): void {
  const { data: profile } = useProfile()
  const firedKeyRef = useRef<string | null>(null)

  const destination = trip?.destination?.trim() ?? ''
  const startDate = trip?.start_date ?? ''
  const endDate = trip?.end_date ?? ''
  const homeAirport = profile?.home_airport ?? ''
  const homeCity = profile?.city ?? ''

  useEffect(() => {
    if (!tripId || !trip || !destination) return
    if (shouldSkipNetwork()) return

    const key = `${tripId}|${destination}|${startDate}|${endDate}|${homeAirport || homeCity}`
    if (firedKeyRef.current === key) return
    firedKeyRef.current = key

    let cancelled = false

    scheduleIdle(() => {
      if (cancelled) return
      void runPreload({
        destination,
        startDate,
        endDate,
        homeAirport,
        homeCity,
        overviewImages,
      })
    })

    return () => {
      cancelled = true
    }
  }, [tripId, trip, destination, startDate, endDate, homeAirport, homeCity, overviewImages])
}

interface RunPreloadOpts {
  destination: string
  startDate: string
  endDate: string
  homeAirport: string
  homeCity: string
  overviewImages?: Iterable<string | null | undefined>
}

async function runPreload(opts: RunPreloadOpts): Promise<void> {
  const { destination, startDate, endDate, homeAirport, homeCity, overviewImages } = opts

  // Warm overview images immediately — these are already known and cost nothing.
  if (overviewImages) warmImages(overviewImages)

  // ── Resolve airports for flights ──
  // Match the same logic FlightsModule uses to derive default From/To, so
  // the URL we hit here matches what the panel will request.
  const [originIata, destIata] = await Promise.all([
    resolveAirport(homeAirport, homeCity),
    resolveAirport('', destination),
  ])

  // ── Hotels: just need destination + dates ──
  if (startDate && endDate) {
    void fetchJsonSafe<HotelsResponse>(
      `/api/hotels/search?destination=${encodeURIComponent(destination)}&check_in=${startDate}&check_out=${endDate}&guests=2&sort=3`,
    ).then((data) => {
      if (!data?.hotels) return
      const urls: string[] = []
      for (const h of data.hotels.slice(0, 24)) {
        // First image of each hotel is what HotelResultCard renders by default.
        if (h.images?.[0]) urls.push(h.images[0])
      }
      warmImages(urls)
    })
  }

  // ── Flights: need both airports + outbound date ──
  if (originIata && destIata && startDate) {
    const params = new URLSearchParams({
      origin: originIata,
      destination: destIata,
      date: startDate,
      passengers: '1',
      class: 'economy',
    })
    if (endDate) params.set('return', endDate)
    void fetchJsonSafe<FlightsResponse>(`/api/flights/search?${params}`).then((data) => {
      if (!data?.flights) return
      const urls = new Set<string>()
      for (const f of data.flights.slice(0, 24)) {
        if (f.airlineLogo) urls.add(f.airlineLogo)
        for (const leg of f.legs ?? []) {
          if (leg.airlineLogo) urls.add(leg.airlineLogo)
        }
      }
      warmImages(urls)
    })
  }

  // ── Cars: pickup at destination, same dates ──
  if (destination && startDate && endDate) {
    void fetchJsonSafe<CarsResponse>(
      `/api/cars/search?pickup_location=${encodeURIComponent(destination)}&pickup_date=${startDate}&dropoff_date=${endDate}`,
    ).then((data) => {
      if (!data?.rates) return
      const urls: string[] = []
      for (const r of data.rates.slice(0, 12)) {
        if (r.images?.[0]) urls.push(r.images[0])
        if (r.supplier_logo) urls.push(r.supplier_logo)
      }
      warmImages(urls)
    })
  }
}

/** Mirror of FlightsModule's airport resolution. */
async function resolveAirport(iataOverride: string, cityOrName: string): Promise<string | null> {
  if (!iataOverride && !cityOrName) return null
  try {
    const query = iataOverride || cityOrName
    const matches = await searchAirports(query)
    if (iataOverride) {
      return matches.find((m) => m.iata === iataOverride)?.iata ?? matches[0]?.iata ?? iataOverride
    }
    const pick = matches.find((m) => m.type === 'airport') ?? matches[0]
    return pick?.iata ?? null
  } catch {
    return iataOverride || null
  }
}
