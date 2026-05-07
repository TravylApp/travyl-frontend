import { rateLimit } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'
import {
  BackendPlace,
  mapBackendToPlaceItem,
  isValidImageUrl,
} from '@travyl/shared'
import { filterByRadius } from '@/lib/haversine'
import { createServerClient } from '@supabase/ssr'

// FastAPI backend (EC2, separate from SST API Gateway). The SST APIGW
// exposes `/places/nearby` (no `/api` prefix) and requires auth, whereas
// FastAPI serves `/api/places/nearby` openly — and that's the path this
// route hits. Defaults to staging so local dev works without env config.
const API_URL = process.env.FASTAPI_URL || 'https://api.dev.gotravyl.com'
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
  const rl = rateLimit(req, 'places', 30, 60000)
  if (rl) return rl
  const lat = req.nextUrl.searchParams.get('lat') ?? ''
  const lng = req.nextUrl.searchParams.get('lng') ?? ''
  const category = req.nextUrl.searchParams.get('category') ?? 'sightseeing'
  const limit = req.nextUrl.searchParams.get('limit') ?? '20'
  const q = req.nextUrl.searchParams.get('q')

  if (!API_URL) {
    return NextResponse.json([], { status: 503 })
  }

  // Must have either coordinates or a text query — never silently default to
  // a location. Return a 400 instead of a bare 200 [] so the client can
  // distinguish "you didn't pass enough params" from "we searched and found
  // nothing." Body shape stays an array for backwards-compat with callers
  // that already do `.map()` on the response.
  if (!lat && !lng && !q) {
    return NextResponse.json([], { status: 400 })
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
      // Fall back to nearby search if NLP returned nothing or failed.
      // The previous fallback ran a hand-curated regex over the query to
      // re-classify it into a Foursquare category. That's exactly the kind
      // of hardcoded lookup we want to avoid — every new query phrasing
      // requires a code change. Now we just retry the nearby search with
      // the original `category` param the client sent. If the client
      // didn't pick a category, we fall through to the FOURSQUARE_CAT_MAP
      // alias resolution that fetchNearby already does.
      if (!data || data.length === 0) {
        const nearbyCategory = FOURSQUARE_CAT_MAP[category] ?? category
        data = await fetchNearby(null, lat, lng, nearbyCategory, limit)
      }
    } else {
      data = await fetchNearby(q, lat, lng, category, limit)
    }

    // Filter by geographic radius to avoid returning places from wrong cities
    // (e.g. Universal Studios Orlando in a New Delhi trip). Skip when the
    // caller didn't provide coords — `parseFloat('')` is NaN and every
    // distance check returns NaN, which the filter would treat as out-of-
    // range and silently drop every result for NLP-only queries.
    const searchLat = parseFloat(lat)
    const searchLng = parseFloat(lng)
    if (Number.isFinite(searchLat) && Number.isFinite(searchLng)) {
      data = filterByRadius(data, searchLat, searchLng, 50)
    }

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
