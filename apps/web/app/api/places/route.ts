import { NextRequest, NextResponse } from 'next/server'
import { KNOWN_CITIES } from '@travyl/shared'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

interface BackendPlace {
  id: string
  name: string
  lat: number
  lng: number
  category: string
  subcategory?: string
  rating: number
  review_count?: number
  price_level?: string | number | null
  description?: string | null
  photo_url?: string | null
  website?: string | null
  address?: string | null
  opening_hours?: Record<string, string>
  visit_duration_min?: number | null
  cuisine?: string | null
  tags?: string[]
}

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
    // Known city names still use geocode + nearby for structured backend results.
    const isNlpQuery = q && !KNOWN_CITIES[q.toLowerCase()]

    if (isNlpQuery) {
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

    // Map to PlaceItem format (categories must match PLACE_COLLECTIONS in shared)
    const requestedCat = category
    const places = data.map((p, idx) => ({
      id: p.id,
      name: p.name,
      image: upscaleGoogleImage(p.photo_url) ?? getFallbackImage(p.name, idx),
      type: mapType(p.category, requestedCat),
      rating: p.rating ?? 0,
      tagline: p.description?.split('.')[0] ?? p.category,
      category: mapCategory(p.category, p.subcategory),
      description: p.description ?? '',
      latitude: p.lat,
      longitude: p.lng,
      reviewCount: p.review_count,
      address: p.address,
      website: p.website,
      priceLevel: mapPrice(p.price_level),
      hours: formatHours(p.opening_hours),
      duration: formatDuration(p.visit_duration_min),
      tags: mapTags(p.category, p.tags, p.cuisine),
    }))

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
  if (q) {
    const knownCity = KNOWN_CITIES[q.toLowerCase()]
    if (knownCity) {
      searchLat = knownCity.lat
      searchLng = knownCity.lng
    } else {
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
        }
      } catch {}
    }
  }
  const res = await fetch(
    `${API_URL}/api/places/nearby?lat=${searchLat}&lng=${searchLng}&category=${category}&limit=${limit}`,
    { headers: { Accept: 'application/json' } }
  )
  if (!res.ok) return []
  return res.json()
}

function upscaleGoogleImage(url: string | null | undefined): string | null {
  if (!url) return null
  // Google Places thumbnails use =wNNN-hNNN or =wNNN-hNNN-k-no format — 600x400 is plenty for cards
  return url.replace(/=w\d+-h\d+(-k-no)?/, '=w600-h400-k-no')
}

// Varied Unsplash fallbacks by category hash so each place gets a unique photo
const FALLBACK_PHOTOS = [
  'photo-1488646953014-85cb44e25828', 'photo-1507525428034-b723cf961d3e',
  'photo-1476514525535-07fb3b4ae5f1', 'photo-1469854523086-cc02fe5d8800',
  'photo-1530789253388-582c481c54b0', 'photo-1502602898657-3e91760cbb34',
  'photo-1493976040374-85c8e12f0c0e', 'photo-1504150558240-0b4fd8946624',
  'photo-1528127269322-539801943592', 'photo-1558642452-9d2a7deb7f62',
  'photo-1506929562872-bb421503ef21', 'photo-1501785888041-af3ef285b470',
  'photo-1523906834658-6e24ef2386f9', 'photo-1504598318550-17eba1008a68',
  'photo-1516483638261-f4dbaf036963', 'photo-1526129318478-62ed807ebdf9',
]

function getFallbackImage(name: string, idx: number): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  const photoIdx = (Math.abs(hash) + idx) % FALLBACK_PHOTOS.length
  return `https://images.unsplash.com/${FALLBACK_PHOTOS[photoIdx]}?w=500&fit=crop&q=75&fm=webp`
}

function formatHours(hours?: Record<string, string>): string | undefined {
  if (!hours) return undefined
  const days = Object.entries(hours)
  if (days.length === 0) return undefined
  // Find today's hours
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const today = dayNames[new Date().getDay()]
  if (hours[today]) return `Today: ${hours[today]}`
  // Fall back to first available
  return days[0][1]
}

function formatDuration(minutes?: number | null): string | undefined {
  if (!minutes) return undefined
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`
}

function mapType(backendCat: string, requestedCat?: string): string {
  // Use the requested category as a hint when the backend returns a generic type
  const cat = backendCat.toLowerCase()
  const req = requestedCat?.toLowerCase()

  if (['restaurant', 'cafe', 'bar', 'dining'].includes(cat)) return 'restaurant'
  if (['museum', 'attraction', 'landmark', 'monument'].includes(cat)) {
    // Backend often returns generic 'attraction' — trust the requested category instead
    if (req && ['restaurant', 'cafe', 'bar', 'dining', 'nightlife'].includes(req)) return 'restaurant'
    if (req && ['park', 'garden', 'beach'].includes(req)) return 'experience'
    return 'attraction'
  }
  if (['park', 'garden', 'outdoor', 'beach'].includes(cat)) return 'experience'
  if (['event', 'festival', 'concert'].includes(cat)) return 'event'

  // Fallback: use requested category as hint
  if (req) {
    if (['restaurant', 'cafe', 'bar', 'dining', 'nightlife'].includes(req)) return 'restaurant'
    if (['museum', 'landmark', 'sightseeing'].includes(req)) return 'attraction'
    if (['park', 'garden', 'beach'].includes(req)) return 'experience'
    if (['shopping', 'market'].includes(req)) return 'destination'
  }
  return 'destination'
}

// Map backend categories to PLACE_COLLECTIONS-compatible categories
function mapCategory(cat: string, sub?: string): string {
  const c = (sub ?? cat).toLowerCase()
  if (['restaurant', 'dining'].includes(c)) return 'Culinary'
  if (c === 'cafe') return 'Culinary'
  if (c === 'bar' || c === 'nightlife') return 'Music Festival'
  if (c === 'museum') return 'Historical'
  if (['attraction', 'landmark', 'monument', 'sightseeing'].includes(c)) return 'Landmark'
  if (['park', 'garden'].includes(c)) return 'Nature'
  if (c === 'beach') return 'Coastal'
  if (c === 'shopping') return 'Market'
  return 'Cultural'
}

// Generate tags that match PLACE_COLLECTIONS match criteria
function titleCase(s: string): string {
  return s.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

function mapTags(cat: string, backendTags?: string[], cuisine?: string | null): string[] {
  const tags: string[] = (backendTags ?? []).map(titleCase)
  const c = cat.toLowerCase()
  if (c === 'restaurant' || c === 'cafe' || c === 'dining') tags.push('Food')
  if (c === 'museum' || c === 'attraction' || c === 'sightseeing') tags.push('Culture', 'Landmark')
  if (c === 'park' || c === 'garden') tags.push('Nature')
  if (c === 'bar' || c === 'nightlife') tags.push('Nightlife', 'Bar')
  if (c === 'beach') tags.push('Beach', 'Coast')
  if (c === 'shopping') tags.push('Markets')
  if (cuisine) tags.push(titleCase(cuisine))
  return [...new Set(tags)]
}

function mapPrice(level: string | number | null | undefined): 1 | 2 | 3 | 4 | undefined {
  if (level == null) return undefined
  // Backend sends either a number (1-4) or a string like "$$"
  if (typeof level === 'number') {
    return level >= 1 && level <= 4 ? (level as 1 | 2 | 3 | 4) : undefined
  }
  const len = level.replace(/[^$]/g, '').length
  if (len >= 1 && len <= 4) return len as 1 | 2 | 3 | 4
  // Try parsing as number
  const num = parseInt(level, 10)
  if (num >= 1 && num <= 4) return num as 1 | 2 | 3 | 4
  return undefined
}
