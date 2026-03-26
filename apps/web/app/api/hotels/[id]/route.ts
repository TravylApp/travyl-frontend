import { NextRequest, NextResponse } from 'next/server'

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY

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
  width?: number
  height?: number
}

interface FsqHours {
  display?: string
  is_local_holiday?: boolean
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
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!FSQ_API_KEY) {
    return NextResponse.json({ error: 'Foursquare not configured' }, { status: 500 })
  }

  try {
    const headers = { Authorization: FSQ_API_KEY }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    const [detailRes, photosRes] = await Promise.all([
      fetch(
        `https://api.foursquare.com/v3/places/${encodeURIComponent(id)}?fields=fsq_id,name,geocodes,location,categories,rating,stats,price,tel,website,description,hours`,
        { headers, signal: controller.signal }
      ),
      fetch(
        `https://api.foursquare.com/v3/places/${encodeURIComponent(id)}/photos?limit=10`,
        { headers, signal: controller.signal }
      ),
    ])
    clearTimeout(timer)

    if (detailRes.status === 404) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
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

    const hotel = {
      id: venue.fsq_id ?? id,
      name: venue.name,
      address: loc.formatted_address ?? loc.address ?? null,
      city: loc.locality ?? null,
      region: loc.region ?? null,
      country: loc.country ?? null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      rating,
      starRating: null, // Foursquare v3 does not provide star ratings
      phone: venue.tel ?? null,
      website: venue.website ?? null,
      description: venue.description ?? null,
      images,
      image_url: images[0] ?? null,
      categories: (venue.categories ?? []).map((c) => c.name),
      hours: venue.hours?.display ?? null,
      price: venue.price ?? null,
      reviewCount: venue.stats?.total_ratings ?? null,
    }

    return NextResponse.json(hotel, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Foursquare service unavailable' }, { status: 500 })
  }
}
