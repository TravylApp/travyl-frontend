import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, CACHE_1H } from '@/lib/api-utils'

/**
 * Geocoding proxy for Nominatim (OpenStreetMap).
 *
 * Nominatim doesn't send CORS headers, so direct browser fetches fail in
 * production. All client-side geocoding/reverse-geocoding goes through this
 * route — we proxy the call server-side and cache for 1h.
 *
 * Forward geocode:
 *   GET /api/geocode?q=Atlanta
 *   GET /api/geocode?q=Atlanta&limit=5
 *   GET /api/geocode?q=Atlanta&bbox=-85,33,-83,34   (viewbox + bounded)
 *
 * Reverse geocode:
 *   GET /api/geocode?lat=37.77&lng=-122.42
 *   GET /api/geocode?lat=37.77&lng=-122.42&zoom=10
 *
 * Returns the Nominatim payload as-is so callers don't need to remap.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'geocode', 60, 60000)
  if (rl) return rl

  const params = req.nextUrl.searchParams
  const q = params.get('q')
  const lat = params.get('lat')
  const lng = params.get('lng')

  let upstreamUrl: string

  if (lat && lng) {
    const zoom = params.get('zoom') ?? '10'
    upstreamUrl = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&zoom=${encodeURIComponent(zoom)}`
  } else if (q) {
    const limit = params.get('limit') ?? '1'
    const bbox = params.get('bbox')
    const viewbox = bbox ? `&viewbox=${encodeURIComponent(bbox)}&bounded=1` : ''
    upstreamUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=${encodeURIComponent(limit)}${viewbox}`
  } else {
    return NextResponse.json([], { status: 400 })
  }

  try {
    const res = await fetch(upstreamUrl, {
      ...CACHE_1H,
      headers: {
        // Nominatim requires a real User-Agent on every request
        'User-Agent': 'Travyl/1.0 (travel planning app)',
        'Accept-Language': params.get('lang') ?? 'en',
      },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json([], { status: res.status })
    const data = await res.json()
    const out = NextResponse.json(data)
    out.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return out
  } catch {
    return NextResponse.json([], { status: 502 })
  }
}
