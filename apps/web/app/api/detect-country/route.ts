import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, CACHE_1H, rateLimit } from '@/lib/api-utils'

interface DetectCountryResponse {
  country: string
  countryCode: string
  region: string
  city: string
  timezone: string
  currency: string
  lat: number
  lng: number
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'detect-country', 60, 60000)
  if (rl) return rl
  try {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null

    const url = ip
      ? `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,timezone,currency,lat,lon`
      : `http://ip-api.com/json/?fields=status,country,countryCode,region,city,timezone,currency,lat,lon`

    const res = await fetch(url, CACHE_1H)
    if (!res.ok) return errorResponse('Geo detection failed', res.status)

    const data = await res.json()
    if (data.status !== 'success') {
      return errorResponse('Could not detect location', 404)
    }

    return NextResponse.json<DetectCountryResponse>({
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      city: data.city,
      timezone: data.timezone,
      currency: data.currency,
      lat: data.lat,
      lng: data.lon,
    })
  } catch {
    return errorResponse('Country detection unavailable', 500)
  }
}
