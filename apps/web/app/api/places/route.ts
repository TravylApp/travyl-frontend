import { rateLimit } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'
import {
  BackendPlace,
  mapBackendToPlaceItem,
  isValidImageUrl,
} from '@travyl/shared'
import { filterByRadius } from '@/lib/haversine'
import { createServerClient } from '@supabase/ssr'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!

// Map category names that Foursquare doesn't recognise to ones it does
const FOURSQUARE_CAT_MAP: Record<string, string> = {
  dining: 'restaurant',
  cultural: 'museum',
  outdoor: 'park',
  tour: 'attraction',
  all: 'sightseeing',
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat') ?? ''
  const lng = req.nextUrl.searchParams.get('lng') ?? ''
  const category = req.nextUrl.searchParams.get('category') ?? 'sightseeing'
  const limit = req.nextUrl.searchParams.get('limit') ?? '20'
  const q = req.nextUrl.searchParams.get('q')

  if (!API_URL) {
    return NextResponse.json([])
  }

  // Must have either coordinates or a text query — never silently default to a location
  if (!lat && !lng && !q) {
    return NextResponse.json([])
  }

  // Extract auth from Supabase cookies so backend Lambdas can validate the user
  let authHeader: string | undefined
  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: { getAll() { return req.cookies.getAll() }, setAll() {} },
    })
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) authHeader = `Bearer ${session.access_token}`
  } catch { /* continue without auth */ }

  try {
    let data: BackendPlace[] = []

    // Natural language queries go through the NLP search endpoint (SerpAPI google_local).
    // Geocode + nearby is the fallback for structured results.
    if (q) {
      const nlpRes = await fetch(
        `${API_URL}/places/search?q=${encodeURIComponent(q)}&category=${category}&limit=${limit}&lat=${lat}&lng=${lng}`,
        { headers: { Accept: 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) } }
  const rl = rateLimit(req, 'places', 30, 60000)
  if (rl) return rl
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
      }
      // Fall back to nearby search if NLP returned nothing or failed
      if (!data || data.length === 0) {
        // Extract a category hint from the NLP query text for better nearby results
        const qLower = q.toLowerCase()
        let nearbyCategory = FOURSQUARE_CAT_MAP[category] ?? category
        if (/restaurant|food|dining|eat/.test(qLower)) nearbyCategory = 'restaurant'
        else if (/nightlife|bar|club|lounge|pub/.test(qLower)) nearbyCategory = 'nightlife'
        else if (/shop|market|mall/.test(qLower)) nearbyCategory = 'shopping'
        else if (/beach|outdoor|park|nature|hike/.test(qLower)) nearbyCategory = 'park'
        else if (/museum|culture|art|gallery/.test(qLower)) nearbyCategory = 'museum'
        else if (/hotel|stay|accommodation/.test(qLower)) nearbyCategory = 'hotel'
        else if (/cafe|coffee/.test(qLower)) nearbyCategory = 'cafe'
        else if (/entertainment|show|theater/.test(qLower)) nearbyCategory = 'attraction'
        data = await fetchNearby(null, lat, lng, nearbyCategory, limit)
      }
    } else {
      data = await fetchNearby(q, lat, lng, category, limit)
    }

    // Filter by geographic radius to avoid returning places from wrong cities
    // (e.g. Universal Studios Orlando in a New Delhi trip)
    const searchLat = parseFloat(lat)
    const searchLng = parseFloat(lng)
    data = filterByRadius(data, searchLat, searchLng, 50)

    // Map to PlaceItem format using the canonical shared mapper — strip items with no valid image
    const requestedCat = category
    const places = data
      .map((p, idx) => mapBackendToPlaceItem(p, idx, requestedCat))
      .filter(p => isValidImageUrl(p.image))

    const res_out = NextResponse.json(places)
    // Cache for 1 hour, revalidate in background for 24h
    res_out.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res_out
  } catch (err) {
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
  // If lat/lng were explicitly provided, use them directly
  const hasExplicitCoords = !!defaultLat && !!defaultLng
  let geocoded = !q || hasExplicitCoords
  if (q && !hasExplicitCoords) {
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
    `${API_URL}/api/places/nearby?lat=${searchLat}&lng=${searchLng}&category=${category}&limit=${limit}&radius_km=50`,
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) return []
  return res.json()
}
