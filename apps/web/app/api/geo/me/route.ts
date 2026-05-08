import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, CACHE_1H } from '@/lib/api-utils'

interface GeoResult {
  city: string | null
  country: string | null
  countryCode: string | null
  region: string | null
  lat: number | null
  lng: number | null
}

const EMPTY: GeoResult = {
  city: null,
  country: null,
  countryCode: null,
  region: null,
  lat: null,
  lng: null,
}

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || null
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'geo-me', 30, 60_000)
  if (rl) return rl

  const ip = clientIp(req)
  // ipapi.co supports both /{ip}/json/ and /json/ (uses caller IP).
  // Server-side fetch from a hosted env will hit our server's IP, so pass it explicitly.
  const lookup = ip && ip !== '::1' && ip !== '127.0.0.1'
    ? `https://ipapi.co/${ip}/json/`
    : `https://ipapi.co/json/`

  try {
    const res = await fetch(lookup, {
      ...CACHE_1H,
      headers: { 'User-Agent': 'Travyl/1.0 (gotravyl.com)' },
    })
    if (!res.ok) return NextResponse.json(EMPTY)
    const data = await res.json()
    if (data?.error) return NextResponse.json(EMPTY)
    return NextResponse.json({
      city: data.city ?? null,
      country: data.country_name ?? null,
      countryCode: data.country_code ?? null,
      region: data.region ?? null,
      lat: typeof data.latitude === 'number' ? data.latitude : null,
      lng: typeof data.longitude === 'number' ? data.longitude : null,
    } satisfies GeoResult)
  } catch {
    return NextResponse.json(EMPTY)
  }
}
