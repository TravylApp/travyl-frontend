import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'
import { withCache } from '@/lib/searchCache'

const SERPAPI_KEY = process.env.SERPAPI_KEY

// Flight prices are volatile but not minute-by-minute. 1h is the sweet spot:
// long enough that a user re-checking later in the day hits cache, short
// enough that displayed fares aren't stale by the time they book.
const FLIGHT_TTL_SECONDS = 60 * 60
// Browser HTTP cache TTL — shorter than the server cache so users always
// pull fresh from our cache rather than holding a hard fork in their browser.
const FLIGHT_BROWSER_MAX_AGE = 15 * 60

const CABIN_MAP: Record<string, number> = {
  economy: 1,
  premium_economy: 2,
  business: 3,
  first: 4,
}

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'flights-search', 10, 60_000)
  if (blocked) return blocked

  if (!SERPAPI_KEY) {
    return NextResponse.json({ error: 'Flight search not configured' }, { status: 503 })
  }

  const p = req.nextUrl.searchParams
  const origin = p.get('origin')
  const destination = p.get('destination')
  const date = p.get('date')

  if (!origin || !destination || !date) {
    return NextResponse.json({ error: 'Missing origin, destination, or date' }, { status: 400 })
  }

  const returnDate = p.get('return') || ''
  const passengers = p.get('passengers') || '1'
  const cabin = p.get('class') || p.get('cabin') || 'economy'

  const cacheKey = `flights:${origin}:${destination}:${date}:${returnDate}:${passengers}:${cabin}`

  try {
    const { data: payload, cacheHit } = await withCache(
      cacheKey,
      FLIGHT_TTL_SECONDS,
      () => fetchAndNormalizeFlights({ origin, destination, date, returnDate, passengers, cabin }),
      // Don't cache error/empty responses — we want a real retry the next time
      // someone asks, not a cached error pinned for an hour.
      (v) => !v.error && (v.flights?.length ?? 0) > 0,
    )

    if (payload.error) {
      return NextResponse.json(payload, { status: payload.upstream_status ?? 200 })
    }
    const out = NextResponse.json(payload)
    out.headers.set('Cache-Control', `private, max-age=${FLIGHT_BROWSER_MAX_AGE}`)
    out.headers.set('X-Cache', cacheHit ? 'HIT' : 'MISS')
    return out
  } catch (err) {
    console.error('[flights/search] fetch threw', err)
    return NextResponse.json({ error: 'Flight search failed', detail: String(err) }, { status: 500 })
  }
}

interface FlightsCachePayload {
  flights: unknown[]
  priceInsights?: unknown
  total: number
  flights_state?: string
  error?: string
  upstream_status?: number
}

async function fetchAndNormalizeFlights(opts: {
  origin: string
  destination: string
  date: string
  returnDate: string
  passengers: string
  cabin: string
}): Promise<FlightsCachePayload> {
  const { origin, destination, date, returnDate, passengers, cabin } = opts

  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google_flights')
  url.searchParams.set('departure_id', origin)
  url.searchParams.set('arrival_id', destination)
  url.searchParams.set('outbound_date', date)
  if (returnDate) {
    url.searchParams.set('return_date', returnDate)
  } else {
    // SerpAPI defaults to type=1 (round trip), which 400s without
    // return_date. Mark one-way explicitly when the caller didn't supply
    // a return date.
    url.searchParams.set('type', '2')
  }
  url.searchParams.set('adults', passengers)
  url.searchParams.set('travel_class', String(CABIN_MAP[cabin] || 1))
  url.searchParams.set('currency', 'USD')
  url.searchParams.set('hl', 'en')
  url.searchParams.set('api_key', SERPAPI_KEY!)

  const res = await fetch(url.toString())
  const rawText = await res.text()
  let data: any = {}
  try { data = JSON.parse(rawText) } catch {}

  // Surface SerpAPI errors instead of silently returning empty
  if (!res.ok || data.error) {
    console.error('[flights/search] SerpAPI error', {
      status: res.status,
      error: data.error || rawText.slice(0, 300),
    })
    return {
      error: data.error || 'Flight search failed',
      upstream_status: res.status,
      flights: [],
      total: 0,
    }
  }

  const bestFlights = data.best_flights ?? []
  const otherFlights = data.other_flights ?? []
  const priceInsights = data.price_insights ?? {}

  // Log when SerpAPI returns 200 but no flights — helps diagnose key/region issues
  if (bestFlights.length === 0 && otherFlights.length === 0) {
    console.warn('[flights/search] No flights returned', {
      origin, destination, date,
      flights_state: data.search_information?.flights_results_state,
      keys: Object.keys(data).slice(0, 12),
    })
  }

  const normalize = (flights: any[], tier: string) =>
    flights.map((f: any, idx: number) => {
      const legs = f.flights ?? []
      const firstLeg = legs[0] ?? {}
      const lastLeg = legs[legs.length - 1] ?? {}

      // ID needs to be stable across re-searches (so the offer_id we save
      // matches if user re-searches) AND unique within a single response
      // (React key collisions otherwise — same flight number at the same
      // time can appear twice as different fare options or as part of
      // multi-segment itineraries). Include price + total duration + tier
      // index to disambiguate without losing stability for identical offers.
      return {
        id: `serp:${tier}:${idx}:${firstLeg.flight_number ?? ''}:${firstLeg.departure_airport?.id ?? ''}:${firstLeg.departure_airport?.time ?? ''}:${lastLeg.arrival_airport?.id ?? ''}:${f.price ?? 'np'}:${f.total_duration ?? 0}`,
        tier,
        price: f.price ?? null,
        type: f.type ?? 'Round trip',
        totalDuration: f.total_duration ?? 0,
        stops: Math.max(0, legs.length - 1),
        airlineLogo: f.airline_logo ?? firstLeg.airline_logo ?? '',
        carbonEmissions: f.carbon_emissions ?? null,
        legs: legs.map((leg: any) => ({
          flightNumber: leg.flight_number ?? '',
          airline: leg.airline ?? '',
          airlineLogo: leg.airline_logo ?? '',
          airplane: leg.airplane ?? '',
          travelClass: leg.travel_class ?? 'Economy',
          legroom: leg.legroom ?? '',
          duration: leg.duration ?? 0,
          overnight: leg.overnight ?? false,
          departure: {
            airport: leg.departure_airport?.name ?? '',
            id: leg.departure_airport?.id ?? '',
            time: leg.departure_airport?.time ?? '',
          },
          arrival: {
            airport: leg.arrival_airport?.name ?? '',
            id: leg.arrival_airport?.id ?? '',
            time: leg.arrival_airport?.time ?? '',
          },
          extensions: leg.extensions ?? [],
        })),
        layovers: (f.layovers ?? []).map((l: any) => ({
          duration: l.duration ?? 0,
          airport: l.name ?? '',
          id: l.id ?? '',
        })),
      }
    })

  const results = [
    ...normalize(bestFlights, 'best'),
    ...normalize(otherFlights, 'other'),
  ]

  return {
    flights: results,
    priceInsights,
    total: results.length,
    flights_state: data.search_information?.flights_results_state,
  }
}
