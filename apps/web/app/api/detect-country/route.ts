import { NextRequest, NextResponse } from 'next/server'

// CountryIS — detect user's country from IP
// Free, unlimited, no API key
// Used to auto-set currency and language preferences

export async function GET(req: NextRequest) {
  try {
    // Try to get IP from headers (works behind proxies/Vercel)
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null

    // Use ip-api.com (free, 45 req/min, no key needed for non-commercial)
    const url = ip
      ? `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,timezone,currency,lat,lon`
      : `http://ip-api.com/json/?fields=status,country,countryCode,region,city,timezone,currency,lat,lon`

    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('Geo detection failed')

    const data = await res.json()
    if (data.status !== 'success') {
      return NextResponse.json({ error: 'Could not detect location' }, { status: 404 })
    }

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Country detection unavailable' }, { status: 500 })
  }
}
