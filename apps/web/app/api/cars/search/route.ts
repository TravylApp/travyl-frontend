import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'

const PCL_HOST = 'priceline-com2.p.rapidapi.com'
const PCL_KEY = process.env.PRICELINE_RAPIDAPI_KEY

function toPclDate(d: string): string {
  // Pass through YYYY-MM-DD — API expects ISO format
  return d
}

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'cars', 10, 60_000)
  if (blocked) return blocked

  if (!PCL_KEY) {
    return NextResponse.json({ error: 'Priceline API not configured', rates: [] })
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

  try {
    const qs = new URLSearchParams({
      pickUpLocation: pickupLocation,
      dropOffLocation: dropoffLocation || pickupLocation,
      pickUpDate: toPclDate(pickupDate),
      dropOffDate: toPclDate(dropoffDate),
      pickUpTime: pickupTime,
      dropOffTime: dropoffTime,
    })

    const res = await fetch(`https://${PCL_HOST}/cars/search?${qs}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': PCL_HOST,
        'x-rapidapi-key': PCL_KEY,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    })

    const text = await res.text()
    let json: any = {}
    try { json = JSON.parse(text) } catch {}

    if (!res.ok) {
      const errMsg = json?.message || json?.error || `HTTP ${res.status}`
      console.error('[cars/search] Priceline error', { status: res.status, error: errMsg, full: text.slice(0, 500) })
      return NextResponse.json({ error: errMsg, rates: [], upstream_status: res.status })
    }

    const vehicles = json?.data?.vehicles ?? []

    const rates = vehicles.map((v: any, i: number) => {
      const rate = v.rate?.[0] ?? {}
      const features = v.vehicleFeatures ?? {}
      return {
        id: `pcl-${i}`,
        supplier: v.partner?.name ?? 'Unknown',
        supplier_logo: v.partner?.url?.startsWith('//') ? `https:${v.partner.url}` : (v.partner?.url ?? null),
        vehicle: v.example ?? v.name ?? null,
        category: v.categoryCodes?.[0] ?? null,
        transmission: features.transmission === 'auto' ? 'Automatic' : (features.transmission ?? null),
        fuel: features.fuelType ?? null,
        passengers: features.peopleCapacity ?? null,
        baggage: features.bagCapacity ?? null,
        images: v.imageUrl ? [v.imageUrl] : [],
        total_amount: rate.totalPrice?.toString(),
        total_currency: rate.currencyCode ?? 'USD',
        daily_amount: rate.dailyPrice?.toString(),
        payment_type: rate.isPrepay ? 'prepay' : 'pay_later',
        mileage: features.isUnlimitedMileage ? { type: 'unlimited' } : null,
        pickup_name: v.pickupLocation?.counterDisplayName ?? pickupLocation,
        dropoff_name: v.returnLocation?.counterDisplayName ?? dropoffLocation,
        pickup_time: pickupTime,
        dropoff_time: dropoffTime,
        source: 'priceline',
      }
    })

    return NextResponse.json({ rates, total: rates.length })
  } catch (err) {
    console.error('[cars/search] fetch error', err)
    return NextResponse.json({ error: 'Car search failed', rates: [] })
  }
}
