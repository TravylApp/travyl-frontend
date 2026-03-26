import { NextRequest, NextResponse } from 'next/server'

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY
const SERPAPI_KEY = process.env.SERPAPI_KEY
const SERPAPI_BASE = 'https://serpapi.com/search.json'

function mapPriceToTier(price: string | undefined): number | null {
  if (!price) return null
  return ({ '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 } as Record<string, number>)[price] ?? null
}

function extractSerpImages(place: any): string[] {
  const seen = new Set<string>()
  const urls: string[] = []
  const push = (url: string) => {
    if (!url || url.includes('encrypted-tbn') || seen.has(url)) return
    seen.add(url)
    urls.push(url)
  }
  if (place.thumbnail) push(place.thumbnail)
  for (const p of (place.photos ?? [])) push(p.original ?? p.url ?? p.thumbnail ?? p.image ?? '')
  return urls
}

async function fetchFromSerpAPI(placeId: string) {
  if (!SERPAPI_KEY) return null
  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_maps')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('api_key', SERPAPI_KEY)
  try {
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    const place = data.place_results
    if (!place) return null
    const images = extractSerpImages(place)
    return {
      id: `serp-${placeId}`,
      name: place.title ?? '',
      address: place.address ?? null,
      city: null as string | null,
      region: null as string | null,
      country: null as string | null,
      latitude: place.gps_coordinates?.latitude ?? null,
      longitude: place.gps_coordinates?.longitude ?? null,
      rating: place.rating ?? null,
      phone: place.phone ?? null,
      website: place.website ?? null,
      menuUrl: null as string | null,
      description: place.description ?? null,
      images,
      image_url: images[0] ?? null,
      categories: place.type ? [place.type] : [],
      hours: place.hours?.schedule
        ? place.hours.schedule.slice(0, 2).map((h: any) => `${h.day}: ${h.opens}–${h.closes}`).join(', ')
        : null,
      openNow: place.hours?.open_now ?? null,
      price: mapPriceToTier(place.price),
      reviewCount: place.reviews ?? null,
    }
  } catch {
    return null
  }
}

interface FsqCategory {
  name: string
}

interface FsqLocation {
  address?: string
  locality?: string
  region?: string
  country?: string
  formatted_address?: string
}

interface FsqPhoto {
  prefix: string
  suffix: string
}

interface FsqHours {
  display?: string
  open_now?: boolean
}

interface FsqVenueDetail {
  fsq_id: string
  name: string
  geocodes?: {
    main?: { latitude: number; longitude: number }
  }
  location?: FsqLocation
  categories?: FsqCategory[]
  rating?: number
  stats?: { total_ratings?: number }
  price?: number
  tel?: string
  website?: string
  description?: string
  hours?: FsqHours
  menu?: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Discover results use Google Maps place IDs prefixed with "serp-"
  if (id.startsWith('serp-')) {
    const restaurant = await fetchFromSerpAPI(id.slice(5))
    if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    return NextResponse.json(restaurant, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  }

  if (!FSQ_API_KEY) {
    return NextResponse.json({ error: 'Foursquare not configured' }, { status: 500 })
  }

  try {
    const headers = { Authorization: FSQ_API_KEY }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    const [detailRes, photosRes] = await Promise.all([
      fetch(
        `https://api.foursquare.com/v3/places/${encodeURIComponent(id)}?fields=fsq_id,name,geocodes,location,categories,rating,stats,price,tel,website,description,hours,menu`,
        { headers, signal: controller.signal }
      ),
      fetch(
        `https://api.foursquare.com/v3/places/${encodeURIComponent(id)}/photos?limit=10`,
        { headers, signal: controller.signal }
      ),
    ])
    clearTimeout(timer)

    if (detailRes.status === 404) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }

    if (!detailRes.ok) {
      return NextResponse.json({ error: 'Foursquare fetch failed' }, { status: detailRes.status })
    }

    const venue: FsqVenueDetail = await detailRes.json()
    const photosData: FsqPhoto[] = photosRes.ok ? await photosRes.json() : []

    const images = photosData.map((p) => `${p.prefix}original${p.suffix}`)

    // Normalize rating 0–10 → 0–5
    const rawRating = venue.rating ?? null
    const rating = rawRating != null ? Math.round((rawRating / 10) * 5 * 10) / 10 : null

    const loc = venue.location ?? {}
    const coords = venue.geocodes?.main ?? null

    const restaurant = {
      id: venue.fsq_id ?? id,
      name: venue.name,
      address: loc.formatted_address ?? loc.address ?? null,
      city: loc.locality ?? null,
      region: loc.region ?? null,
      country: loc.country ?? null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      rating,
      phone: venue.tel ?? null,
      website: venue.website ?? null,
      menuUrl: venue.menu ?? null,
      description: venue.description ?? null,
      images,
      image_url: images[0] ?? null,
      categories: (venue.categories ?? []).map((c) => c.name),
      hours: venue.hours?.display ?? null,
      openNow: venue.hours?.open_now ?? null,
      price: venue.price ?? null,
      reviewCount: venue.stats?.total_ratings ?? null,
    }

    return NextResponse.json(restaurant, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Foursquare service unavailable' }, { status: 500 })
  }
}
