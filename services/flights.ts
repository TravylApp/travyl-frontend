import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'
import { validateQueryParams } from './lib/validation'

const DUFFEL_BASE_URL = 'https://api.duffel.com/air/offer_requests'

interface FlightSlice {
  origin: string
  originCity: string
  destination: string
  destinationCity: string
  departureTime: string
  arrivalTime: string
  duration: string
  stops: number
  airline: string
  airlineCode: string
  flightNumber: string
  aircraft?: string
  segments: FlightSegment[]
}

interface FlightSegment {
  airline: string
  flightNumber: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  duration: string
  aircraft?: string
}

interface Flight {
  id: string
  price: number
  currency: string
  cabinClass: string
  outbound: FlightSlice | null
  return: FlightSlice | null
  bookingUrl: string | null
}

interface FlightsResponse {
  total: number
  flights: Flight[]
}

function mapSlice(slice: any): FlightSlice | null {
  if (!slice) return null
  const segments = slice.segments ?? []
  const first = segments[0]
  const last = segments[segments.length - 1]

  return {
    origin: first?.origin?.iata_code,
    originCity: first?.origin?.city_name,
    destination: last?.destination?.iata_code,
    destinationCity: last?.destination?.city_name,
    departureTime: first?.departing_at,
    arrivalTime: last?.arriving_at,
    duration: slice.duration,
    stops: segments.length - 1,
    airline: first?.operating_carrier?.name ?? first?.marketing_carrier?.name,
    airlineCode: first?.operating_carrier?.iata_code ?? first?.marketing_carrier?.iata_code,
    flightNumber: `${first?.marketing_carrier?.iata_code ?? ''} ${first?.marketing_carrier_flight_number ?? ''}`.trim(),
    aircraft: first?.aircraft?.name,
    segments: segments.map((seg: any) => ({
      airline: seg.operating_carrier?.name,
      flightNumber: `${seg.marketing_carrier?.iata_code ?? ''} ${seg.marketing_carrier_flight_number ?? ''}`.trim(),
      origin: seg.origin?.iata_code,
      destination: seg.destination?.iata_code,
      departureTime: seg.departing_at,
      arrivalTime: seg.arriving_at,
      duration: seg.duration,
      aircraft: seg.aircraft?.name,
    })),
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const { origin, destination, date, return: returnDate, passengers = '1', cabin = 'economy' } = event.queryStringParameters ?? {}

    const paramsValid = validateQueryParams(
      { origin, destination, date },
      ['origin', 'destination', 'date']
    )
    if (!paramsValid.success) {
      return paramsValid.error
    }

    // Validate IATA codes (3 letters)
    const iataRegex = /^[A-Z]{3}$/i
    if (!iataRegex.test(origin!) || !iataRegex.test(destination!)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Origin and destination must be 3-letter IATA codes (e.g., JFK, LHR)' }) }
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date!)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Date must be YYYY-MM-DD format' }) }
    }
    if (returnDate && !dateRegex.test(returnDate)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Return date must be YYYY-MM-DD format' }) }
    }

    const apiKey = Resource.DuffelApiToken.value
    if (!apiKey || apiKey === 'placeholder') {
      return { statusCode: 503, body: JSON.stringify({ error: 'Flight search unavailable - API key not configured' }) }
    }

    const passengerCount = parseInt(passengers, 10)
    if (isNaN(passengerCount) || passengerCount < 1 || passengerCount > 9) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Passengers must be 1-9' }) }
    }

    const validCabins = ['economy', 'premium_economy', 'business', 'first']
    if (!validCabins.includes(cabin)) {
      return { statusCode: 400, body: JSON.stringify({ error: `Cabin must be one of: ${validCabins.join(', ')}` }) }
    }

    // Build slices (outbound + optional return)
    const slices = [{ origin: origin!, destination: destination!, departure_date: date! }]
    if (returnDate) {
      slices.push({ origin: destination!, destination: origin!, departure_date: returnDate })
    }

    const passengerList = Array.from({ length: passengerCount }, () => ({ type: 'adult' as const }))

    const res = await fetch(DUFFEL_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          slices,
          passengers: passengerList,
          cabin_class: cabin,
        },
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout for flight search
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[flights] Duffel error:', res.status, errText)
      return { statusCode: 502, body: JSON.stringify({ error: 'Flight search failed', detail: errText }) }
    }

    const data = await res.json()
    const offers = data.data?.offers ?? []

    const flights: Flight[] = offers.slice(0, 20).map((offer: any) => ({
      id: offer.id,
      price: parseFloat(offer.total_amount),
      currency: offer.total_currency,
      cabinClass: cabin,
      outbound: mapSlice(offer.slices?.[0]),
      return: mapSlice(offer.slices?.[1]),
      bookingUrl: offer.payment_requirements?.requires_instant_payment ? null : `https://app.duffel.com/seller/offers/${offer.id}`,
    }))

    const response: FlightsResponse = { total: offers.length, flights }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Flight search timeout - please try again' }) }
    }
    console.error('[flights] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}