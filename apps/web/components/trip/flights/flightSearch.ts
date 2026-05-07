import type { FlightData } from '@travyl/shared'

export interface SerpFlightLeg {
  flightNumber: string
  airline: string
  airlineLogo: string
  airplane: string
  travelClass: string
  legroom: string
  duration: number
  overnight: boolean
  departure: { airport: string; id: string; time: string }
  arrival:   { airport: string; id: string; time: string }
  extensions: string[]
}

export interface SerpFlight {
  id: string
  tier: 'best' | 'other'
  price: number | null
  type: string
  totalDuration: number
  stops: number
  airlineLogo: string
  carbonEmissions: { this_flight?: number; typical_for_this_route?: number; difference_percent?: number } | null
  legs: SerpFlightLeg[]
  layovers: { duration: number; airport: string; id: string }[]
}

export interface SerpFlightSearchResponse {
  flights: SerpFlight[]
  priceInsights?: unknown
  total: number
  flights_state?: string
  error?: string
}

export interface FlightSearchInput {
  origin: string       // IATA
  destination: string  // IATA
  date: string         // YYYY-MM-DD
  return?: string      // YYYY-MM-DD
  passengers: number
  cabin: 'economy' | 'premium_economy' | 'business' | 'first'
}

export async function searchFlights(input: FlightSearchInput): Promise<SerpFlightSearchResponse> {
  const params = new URLSearchParams({
    origin: input.origin,
    destination: input.destination,
    date: input.date,
    passengers: String(input.passengers),
    class: input.cabin,
  })
  if (input.return) params.set('return', input.return)

  const res = await fetch(`/api/flights/search?${params}`)
  if (!res.ok) {
    return { flights: [], total: 0, error: `Search failed (${res.status})` }
  }
  return res.json()
}

export function mapSerpFlightToFlightData(serp: SerpFlight): FlightData {
  const first = serp.legs[0]
  const last = serp.legs[serp.legs.length - 1]
  const price = serp.price ?? null
  return {
    airline: first?.airline ?? '',
    // Prefer the per-leg logo (more specific for codeshares) and fall back
    // to the itinerary-level logo. Persisted so the saved booking card can
    // render it without re-querying SerpAPI.
    airline_logo: first?.airlineLogo || serp.airlineLogo || null,
    flight_number: first?.flightNumber || null,
    origin_iata: first?.departure.id ?? '',
    origin_name: first?.departure.airport ?? null,
    dest_iata: last?.arrival.id ?? '',
    dest_name: last?.arrival.airport ?? null,
    departure_at: first?.departure.time ?? null,
    arrival_at: last?.arrival.time ?? null,
    price,
    currency: price != null ? 'USD' : null,
    cabin_class: first?.travelClass ?? null,
    booking_ref: null,
    offer_id: serp.id,
  }
}
