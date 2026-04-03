import { NextRequest, NextResponse } from 'next/server'
import {
  BackendPlace,
  mapBackendToPlaceItem,
} from '@travyl/shared'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL


export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat') ?? '48.8566'
  const lng = req.nextUrl.searchParams.get('lng') ?? '2.3522'
  const category = req.nextUrl.searchParams.get('category') ?? 'sightseeing'
  const limit = req.nextUrl.searchParams.get('limit') ?? '20'
  const q = req.nextUrl.searchParams.get('q')

  if (!API_URL) {
    return NextResponse.json([])
  }

  try {
    let data: BackendPlace[]

    // Natural language queries go through the NLP search endpoint (SerpAPI google_local).
    // Geocode + nearby is the fallback for structured results.
    if (q) {
      const nlpRes = await fetch(
        `${API_URL}/places/search?q=${encodeURIComponent(q)}&category=${category}&limit=${limit}`,
        { headers: { Accept: 'application/json' } }
      )
      if (nlpRes.ok) {
        const nlpData = await nlpRes.json()
        data = (nlpData.results ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          lat: r.latitude,
          lng: r.longitude,
          category: r.category,
          rating: r.rating ?? 0,
          description: r.description,
          photo_url: r.imageUrl,
          address: r.location,
          price_level: r.price != null
            ? (r.price <= 15 ? '$' : r.price <= 35 ? '$$' : r.price <= 60 ? '$$$' : '$$$$')
            : null,
        }))
      } else {
        data = await fetchNearby(q, lat, lng, category, limit)
      }
    } else {
      data = await fetchNearby(q, lat, lng, category, limit)
    }

    // Map to PlaceItem format using the canonical shared mapper
    const requestedCat = category
    const places = data.map((p, idx) => mapBackendToPlaceItem(p, idx, requestedCat))

    const res_out = NextResponse.json(places)
    // Cache for 1 hour, revalidate in background for 24h
    res_out.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res_out
  } catch (err) {
    console.error('[places] Route error:', err)
    return NextResponse.json([])
  }
}

async function fetchNearby(
  q: string | null,
  defaultLat: string,
  defaultLng: string,
  category: string,
  limit: string,
): Promise<BackendPlace[]> {
  let searchLat = defaultLat
  let searchLng = defaultLng
  let geocoded = !q // If no query, lat/lng were provided directly
  if (q) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'Travyl/1.0 (travel planning app)' },
          signal: AbortSignal.timeout(5000),
        }
      )
      const geoData = await geoRes.json()
      if (geoData.length > 0) {
        searchLat = geoData[0].lat
        searchLng = geoData[0].lon
        geocoded = true
      }
    } catch {}
  }
  // Don't silently fall back to default coords — return empty if location not found
  if (!geocoded) return []
  const res = await fetch(
    `${API_URL}/api/places/nearby?lat=${searchLat}&lng=${searchLng}&category=${category}&limit=${limit}`,
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) return []
  return res.json()
}
