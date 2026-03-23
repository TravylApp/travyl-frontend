import { NextRequest, NextResponse } from 'next/server'

const DUFFEL_TOKEN = process.env.DUFFEL_API_TOKEN

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.searchParams.get('origin')       // IATA code: JFK
  const destination = req.nextUrl.searchParams.get('destination') // IATA code: BCN
  const date = req.nextUrl.searchParams.get('date')            // YYYY-MM-DD
  const returnDate = req.nextUrl.searchParams.get('return')    // YYYY-MM-DD (optional)
  const passengers = parseInt(req.nextUrl.searchParams.get('passengers') ?? '1')
  const cabin = req.nextUrl.searchParams.get('cabin') ?? 'economy'

  if (!origin || !destination || !date) {
    return NextResponse.json({ error: 'Missing origin, destination, or date' }, { status: 400 })
  }

  if (!DUFFEL_TOKEN) {
    return NextResponse.json({ error: 'Flight search not configured' }, { status: 500 })
  }

  try {
    const slices: { origin: string; destination: string; departure_date: string }[] = [
      { origin, destination, departure_date: date },
    ]
    if (returnDate) {
      slices.push({ origin: destination, destination: origin, departure_date: returnDate })
    }

    const passengerList = Array.from({ length: passengers }, () => ({ type: 'adult' as const }))

    const res = await fetch('https://api.duffel.com/air/offer_requests', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DUFFEL_TOKEN}`,
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
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: 'Flight search failed', detail: err }, { status: res.status })
    }

    const data = await res.json()
    const offers = data.data?.offers ?? []

    // Map to clean format
    const flights = offers.slice(0, 20).map((offer: any) => {
      const outSlice = offer.slices?.[0]
      const retSlice = offer.slices?.[1]

      const mapSlice = (slice: any) => {
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

      return {
        id: offer.id,
        price: parseFloat(offer.total_amount),
        currency: offer.total_currency,
        cabinClass: cabin,
        outbound: mapSlice(outSlice),
        return: mapSlice(retSlice),
        bookingUrl: offer.payment_requirements?.requires_instant_payment ? null : offer.id,
      }
    })

    return NextResponse.json({
      total: offers.length,
      flights,
    })
  } catch {
    return NextResponse.json({ error: 'Flight service unavailable' }, { status: 500 })
  }
}
