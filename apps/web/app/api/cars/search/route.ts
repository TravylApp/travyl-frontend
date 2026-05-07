import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'

const DUFFEL_API_KEY = process.env.DUFFEL_API_KEY
const DUFFEL_BASE = 'https://api.duffel.com'

async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'Travyl/1.0 (travel planning app)' } },
    )
    const data = await res.json()
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch {}
  return null
}

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'cars', 10, 60_000)
  if (blocked) return blocked

  if (!DUFFEL_API_KEY) {
    return NextResponse.json({ error: 'Duffel API not configured', rates: [] })
  }

  const pickupLocation = req.nextUrl.searchParams.get('pickup_location')
  const dropoffLocation = req.nextUrl.searchParams.get('dropoff_location') || pickupLocation
  const pickupDate = req.nextUrl.searchParams.get('pickup_date')
  const pickupTime = req.nextUrl.searchParams.get('pickup_time') || '10:00'
  const dropoffDate = req.nextUrl.searchParams.get('dropoff_date')
  const dropoffTime = req.nextUrl.searchParams.get('dropoff_time') || '10:00'

  if (!pickupLocation || !pickupDate || !dropoffDate) {
    return NextResponse.json({ error: 'Missing required params: pickup_location, pickup_date, dropoff_date', rates: [] })
  }

  const pickupLoc: string = pickupLocation
  const dropoffLoc: string = dropoffLocation || pickupLoc
  const pickupCoords = await geocode(pickupLoc)
  const dropoffCoords = dropoffLoc !== pickupLoc ? await geocode(dropoffLoc) : pickupCoords

  if (!pickupCoords || !dropoffCoords) {
    return NextResponse.json({ error: 'Could not geocode location', rates: [] })
  }

  try {
    const body = {
      data: {
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        pickup_location: {
          radius: 10,
          geographic_coordinates: { latitude: pickupCoords.lat, longitude: pickupCoords.lng },
        },
        dropoff_date: dropoffDate,
        dropoff_time: dropoffTime,
        dropoff_location: {
          radius: 10,
          geographic_coordinates: { latitude: dropoffCoords.lat, longitude: dropoffCoords.lng },
        },
        driver: { age: 30, residence_country_code: 'US' },
      },
    }

    const res = await fetch(`${DUFFEL_BASE}/cars/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DUFFEL_API_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let data: any = {}
    try { data = JSON.parse(text) } catch {}

    if (!res.ok) {
      console.error('[cars/search] Duffel error', { status: res.status, error: data?.errors || text.slice(0, 300) })
      return NextResponse.json({ error: data?.errors?.[0]?.title || 'Car search failed', rates: [], upstream_status: res.status })
    }

    const rates = (data.data?.rates ?? []).map((rate: any, i: number) => ({
      id: `duffel-${i}`,
      supplier: rate.supplier?.name ?? 'Unknown',
      supplier_logo: rate.supplier?.logo_url ?? null,
      vehicle: rate.car?.name ?? null,
      category: rate.car?.category ?? null,
      transmission: rate.car?.transmission ?? null,
      fuel: rate.car?.fuel ?? null,
      passengers: rate.car?.max_passengers ?? null,
      baggage: rate.car?.baggage ?? null,
      images: rate.car?.images?.map((img: any) => img.url) ?? [],
      total_amount: rate.total_amount,
      total_currency: rate.total_currency,
      base_amount: rate.base_amount,
      base_currency: rate.base_currency,
      payment_type: rate.payment_type,
      mileage: rate.mileage,
      pickup_name: rate.pickup_location?.name ?? pickupLocation,
      dropoff_name: rate.dropoff_location?.name ?? dropoffLocation,
      source: 'duffel',
    }))

    return NextResponse.json({ rates, total: rates.length })
  } catch (err) {
    console.error('[cars/search] fetch error', err)
    return NextResponse.json({ error: 'Car search failed', rates: [] })
  }
}
