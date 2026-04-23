import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY || ''

/** Google Maps local search via SerpAPI. */
export async function GET(req: NextRequest) {
  const query = getOptionalParam(req, 'q', '')
  if (!query) return NextResponse.json([])

  if (!SERPAPI_KEY) {
    return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 503 })
  }

  try {
    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('engine', 'google_maps')
    url.searchParams.set('q', query)
    url.searchParams.set('api_key', SERPAPI_KEY)

    const res = await fetch(url.toString(), CACHE_1H)
    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const results: any[] = []

    // Single place result (exact match — e.g. "Yum Yum Donuts Porterville")
    if (data.place_results) {
      const p = data.place_results
      results.push(mapPlace(p, 0))
    }

    // Multiple local results (e.g. "donuts near porterville")
    if (data.local_results) {
      for (const [i, p] of data.local_results.entries()) {
        results.push(mapPlace(p, i + 1))
      }
    }

    return NextResponse.json(results.slice(0, 20))
  } catch (err) {
    console.error('[/api/search/maps] SerpAPI error:', err)
    return NextResponse.json([])
  }
}

function mapPlace(p: any, idx: number) {
  // Extract hours as a string
  let hoursStr = ''
  if (Array.isArray(p.hours)) {
    const today = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
    const todayEntry = p.hours.find((h: any) => h[today])
    hoursStr = todayEntry ? `Today: ${todayEntry[today]}` : ''
  } else if (typeof p.hours === 'string') {
    hoursStr = p.hours
  }

  // Best image
  const image = p.thumbnail
    || (p.images?.[0]?.image)
    || ''

  // Type → PlaceItem type mapping
  const types = (p.type || []) as string[]
  const typeLower = types.join(' ').toLowerCase()
  let placeType = 'attraction'
  if (/restaurant|food|dining|cafe|coffee|donut|bakery|pizza|sushi|taco|burger/i.test(typeLower)) placeType = 'restaurant'
  else if (/bar|pub|nightlife|club|lounge|brewery/i.test(typeLower)) placeType = 'experience'
  else if (/hotel|hostel|resort|motel|inn/i.test(typeLower)) placeType = 'hotel'

  return {
    id: `gmap_${idx}_${(p.place_id || '').slice(0, 12)}`,
    name: p.title || '',
    image,
    images: (p.images || []).slice(0, 5).map((img: any) => img.image).filter(Boolean),
    type: placeType,
    rating: p.rating || 0,
    reviewCount: p.reviews || 0,
    tagline: types.slice(0, 2).join(' · ') || '',
    category: types[0] || '',
    description: p.description || p.snippet || '',
    tags: types.slice(0, 3),
    latitude: p.gps_coordinates?.latitude || null,
    longitude: p.gps_coordinates?.longitude || null,
    address: p.address || '',
    phone: p.phone || '',
    website: p.website || '',
    hours: hoursStr,
    priceLevel: p.price ? p.price.length : null, // "$" = 1, "$$" = 2, etc.
  }
}
