import { NextRequest, NextResponse } from 'next/server'

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
  price_level?: string | null
  description?: string | null
  photo_url?: string | null
  website?: string | null
  address?: string | null
  opening_hours?: Record<string, string>
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
    // If search query provided, geocode it first to get coordinates
    let searchLat = lat
    let searchLng = lng
    if (q) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const geoData = await geoRes.json()
        if (geoData.length > 0) {
          searchLat = geoData[0].lat
          searchLng = geoData[0].lon
        }
      } catch {}
    }

    const res = await fetch(
      `${API_URL}/api/places/nearby?lat=${searchLat}&lng=${searchLng}&category=${category}&limit=${limit}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return NextResponse.json([])

    const data: BackendPlace[] = await res.json()

    // Map to PlaceItem format (categories must match PLACE_COLLECTIONS in shared)
    const places = data.map((p) => ({
      id: p.id,
      name: p.name,
      image: upscaleGoogleImage(p.photo_url) ?? `https://source.unsplash.com/400x300/?${encodeURIComponent(p.name)},travel`,
      type: mapType(p.category),
      rating: p.rating ?? 0,
      tagline: p.description ?? p.category,
      category: mapCategory(p.category, p.subcategory),
      description: p.description ?? '',
      latitude: p.lat,
      longitude: p.lng,
      reviewCount: p.review_count,
      address: p.address,
      website: p.website,
      priceLevel: mapPrice(p.price_level),
      hours: p.opening_hours ? Object.values(p.opening_hours)[0] : undefined,
      tags: mapTags(p.category, p.tags),
    }))

    return NextResponse.json(places)
  } catch {
    return NextResponse.json([])
  }
}

function upscaleGoogleImage(url: string | null | undefined): string | null {
  if (!url) return null
  // Google Places thumbnails use =wNNN-hNNN format — upscale to 800x600
  return url.replace(/=w\d+-h\d+/, '=w800-h600')
}

function mapType(cat: string): string {
  if (['restaurant', 'cafe', 'bar', 'dining'].includes(cat)) return 'restaurant'
  if (['museum', 'attraction', 'landmark', 'monument'].includes(cat)) return 'attraction'
  if (['park', 'garden', 'outdoor', 'beach'].includes(cat)) return 'experience'
  if (['event', 'festival', 'concert'].includes(cat)) return 'event'
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
function mapTags(cat: string, backendTags?: string[]): string[] {
  const tags: string[] = backendTags ?? []
  const c = cat.toLowerCase()
  if (c === 'restaurant' || c === 'cafe' || c === 'dining') tags.push('Food')
  if (c === 'museum' || c === 'attraction' || c === 'sightseeing') tags.push('Culture', 'Landmark')
  if (c === 'park' || c === 'garden') tags.push('Nature')
  if (c === 'bar' || c === 'nightlife') tags.push('Nightlife', 'Bar')
  if (c === 'beach') tags.push('Beach', 'Coast')
  if (c === 'shopping') tags.push('Markets')
  return [...new Set(tags)]
}

function mapPrice(level: string | null | undefined): 1 | 2 | 3 | 4 | undefined {
  if (!level) return undefined
  const len = level.replace(/[^$]/g, '').length
  if (len >= 1 && len <= 4) return len as 1 | 2 | 3 | 4
  return undefined
}
