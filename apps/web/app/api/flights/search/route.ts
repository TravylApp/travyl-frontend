import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY

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

  // Build SerpAPI Google Flights URL
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
  url.searchParams.set('api_key', SERPAPI_KEY)

  try {
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
      return NextResponse.json({
        error: data.error || 'Flight search failed',
        upstream_status: res.status,
        flights: [],
        total: 0,
      }, { status: res.ok ? 200 : res.status })
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

    // Normalize flights into a consistent shape
    const normalize = (flights: any[], tier: string) =>
      flights.map((f: any) => {
        const legs = f.flights ?? []
        const firstLeg = legs[0] ?? {}
        const lastLeg = legs[legs.length - 1] ?? {}

        return {
          // Content-derived stable ID so the same itinerary keeps the same offer_id across re-searches.
          id: `serp:${tier}:${firstLeg.flight_number ?? ''}:${firstLeg.departure_airport?.id ?? ''}:${firstLeg.departure_airport?.time ?? ''}:${lastLeg.arrival_airport?.id ?? ''}`,
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

    return NextResponse.json({
      flights: results,
      priceInsights,
      total: results.length,
      flights_state: data.search_information?.flights_results_state,
    })
  } catch (err) {
    console.error('[flights/search] fetch threw', err)
    return NextResponse.json({ error: 'Flight search failed', detail: String(err) }, { status: 500 })
  }
}
