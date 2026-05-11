import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'
import { withCache } from '@/lib/searchCache'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const carsQuerySchema = z.object({
  pickup_location: z.string().min(1).max(200),
  dropoff_location: z.string().max(200).optional(),
  pickup_date: z.string(),
  pickup_time: z.string().regex(/^\d{2}:\d{2}$/).default('10:00'),
  dropoff_date: z.string(),
  dropoff_time: z.string().regex(/^\d{2}:\d{2}$/).default('10:00'),
})

const PCL_HOST = 'priceline-com2.p.rapidapi.com'
const PCL_KEY = process.env.PRICELINE_RAPIDAPI_KEY

// Car rates change least often of the three search providers. 4h is plenty.
const CAR_TTL_SECONDS = 4 * 60 * 60
const CAR_BROWSER_MAX_AGE = 60 * 60

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

  const parsed = parseQuery(req, carsQuerySchema)
  if (!parsed.ok) return parsed.response
  const {
    pickup_location: pickupLocation,
    dropoff_location: dropoffLocationRaw,
    pickup_date: pickupDate,
    pickup_time: pickupTime,
    dropoff_date: dropoffDate,
    dropoff_time: dropoffTime,
  } = parsed.data
  const dropoffLocation = dropoffLocationRaw || pickupLocation

  const cacheKey = `cars:${pickupLocation}:${dropoffLocation ?? pickupLocation}:${pickupDate}:${dropoffDate}:${pickupTime}:${dropoffTime}`

  try {
    const { data: payload, cacheHit } = await withCache(
      cacheKey,
      CAR_TTL_SECONDS,
      () =>
        fetchAndNormalizeCars({
          pickupLocation,
          dropoffLocation: dropoffLocation || pickupLocation,
          pickupDate,
          dropoffDate,
          pickupTime,
          dropoffTime,
        }),
      (v) => !v.error && (v.rates?.length ?? 0) > 0,
    )

    const out = NextResponse.json(payload)
    out.headers.set('Cache-Control', `private, max-age=${CAR_BROWSER_MAX_AGE}`)
    out.headers.set('X-Cache', cacheHit ? 'HIT' : 'MISS')
    return out
  } catch (err) {
    console.error('[cars/search] fetch error', err)
    return NextResponse.json({ error: 'Car search failed', rates: [] })
  }
}

interface CarsCachePayload {
  rates: unknown[]
  total?: number
  error?: string
  upstream_status?: number
}

async function fetchAndNormalizeCars(opts: {
  pickupLocation: string
  dropoffLocation: string
  pickupDate: string
  dropoffDate: string
  pickupTime: string
  dropoffTime: string
}): Promise<CarsCachePayload> {
  const { pickupLocation, dropoffLocation, pickupDate, dropoffDate, pickupTime, dropoffTime } = opts

  const qs = new URLSearchParams({
    pickUpLocation: pickupLocation,
    dropOffLocation: dropoffLocation,
    pickUpDate: toPclDate(pickupDate),
    dropOffDate: toPclDate(dropoffDate),
    pickUpTime: pickupTime,
    dropOffTime: dropoffTime,
  })

  const res = await fetch(`https://${PCL_HOST}/cars/search?${qs}`, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': PCL_HOST,
      'x-rapidapi-key': PCL_KEY!,
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
    return { error: errMsg, rates: [], upstream_status: res.status }
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

  return { rates, total: rates.length }
}
