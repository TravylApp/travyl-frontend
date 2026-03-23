import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = process.env.FOURSQUARE_CLIENT_ID
const CLIENT_SECRET = process.env.FOURSQUARE_CLIENT_SECRET
const V = '20260323'

// Foursquare v2 category IDs
const CATEGORY_MAP: Record<string, string> = {
  hotel: '4bf58dd8d48988d1fa931735',
  restaurant: '4d4b7105d754a06374d81259',
  nightlife: '4d4b7105d754a06376d81259',
  attraction: '4d4b7104d754a06370d81259',
  cafe: '4bf58dd8d48988d1e0931735',
  museum: '4bf58dd8d48988d181941735',
  park: '4bf58dd8d48988d163941735',
  shopping: '4d4b7105d754a06378d81259',
  airport: '4bf58dd8d48988d1ed931735',
}

interface FoursquareVenue {
  id: string
  name: string
  location: {
    lat: number
    lng: number
    address?: string
    city?: string
    country?: string
    formattedAddress?: string[]
  }
  categories: { name: string; icon: { prefix: string; suffix: string } }[]
  rating?: number
  ratingSignals?: number
  price?: { tier: number }
  url?: string
  hours?: { status?: string }
  bestPhoto?: { prefix: string; suffix: string; width: number; height: number }
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  const query = req.nextUrl.searchParams.get('q')
  const category = req.nextUrl.searchParams.get('category') ?? 'attraction'
  const limit = req.nextUrl.searchParams.get('limit') ?? '10'

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({ error: 'Foursquare not configured' }, { status: 500 })
  }

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 })
  }

  try {
    const categoryId = CATEGORY_MAP[category] ?? ''
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      v: V,
      ll: `${lat},${lng}`,
      limit,
      ...(categoryId ? { categoryId } : {}),
      ...(query ? { query } : {}),
    })

    const res = await fetch(
      `https://api.foursquare.com/v2/venues/explore?${params}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Foursquare fetch failed' }, { status: res.status })
    }

    const data = await res.json()
    const items = data.response?.groups?.[0]?.items ?? []

    const venues = items.map((item: { venue: FoursquareVenue; tips?: { text: string }[] }) => {
      const v = item.venue
      const cat = v.categories?.[0]
      const photo = v.bestPhoto
        ? `${v.bestPhoto.prefix}300x200${v.bestPhoto.suffix}`
        : cat?.icon
          ? `${cat.icon.prefix}bg_88${cat.icon.suffix}`
          : null

      return {
        id: v.id,
        name: v.name,
        lat: v.location.lat,
        lng: v.location.lng,
        address: v.location.formattedAddress?.join(', ') ?? v.location.address,
        category: cat?.name ?? category,
        rating: v.rating,
        ratingCount: v.ratingSignals,
        price: v.price?.tier,
        image: photo,
        url: v.url,
        hours: v.hours?.status,
        tip: item.tips?.[0]?.text,
      }
    })

    return NextResponse.json(venues)
  } catch {
    return NextResponse.json({ error: 'Foursquare service unavailable' }, { status: 500 })
  }
}
