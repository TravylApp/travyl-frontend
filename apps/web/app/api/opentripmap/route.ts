import { NextRequest, NextResponse } from 'next/server'

// OpenTripMap — tourist attractions with descriptions and ratings
// Free: 500 calls/day, no API key required for basic access
// Docs: https://opentripmap.io/docs

const BASE = 'https://api.opentripmap.com/0.1/en/places'
const API_KEY = process.env.OPENTRIPMAP_API_KEY || '5ae2e3f221c38a28845f05b6' // public demo key

// Category mapping for common travel queries
const CATEGORY_MAP: Record<string, string> = {
  attraction: 'interesting_places',
  museum: 'cultural~museums',
  historic: 'cultural~historic',
  architecture: 'architecture',
  nature: 'natural',
  religion: 'religion',
  park: 'natural~parks',
  beach: 'beaches',
  sport: 'sport',
  shop: 'shops',
}

interface OTMPlace {
  xid: string
  name: string
  dist?: number
  rate?: number
  kinds: string
  point: { lat: number; lon: number }
  wikipedia?: string
  image?: string
  preview?: { source: string }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const category = sp.get('category') || 'interesting_places'
  const radius = sp.get('radius') || '5000' // meters
  const limit = parseInt(sp.get('limit') || '10', 10)

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 })
  }

  const kinds = CATEGORY_MAP[category] || category

  try {
    // Step 1: Get places within radius
    const listRes = await fetch(
      `${BASE}/radius?radius=${radius}&lon=${lng}&lat=${lat}&kinds=${kinds}&rate=2&limit=${limit}&format=json&apikey=${API_KEY}`,
      { next: { revalidate: 3600 } }
    )

    if (!listRes.ok) {
      return NextResponse.json({ error: 'OpenTripMap fetch failed' }, { status: listRes.status })
    }

    const places: OTMPlace[] = await listRes.json()

    // Step 2: Fetch details for top results (in parallel, max 6 to stay under rate limits)
    const detailed = await Promise.all(
      places.filter(p => p.name).slice(0, Math.min(limit, 6)).map(async (place) => {
        try {
          const detailRes = await fetch(
            `${BASE}/xid/${place.xid}?apikey=${API_KEY}`,
            { next: { revalidate: 3600 } }
          )
          if (!detailRes.ok) return null
          const detail = await detailRes.json()
          return {
            id: place.xid,
            name: detail.name || place.name,
            description: detail.wikipedia_extracts?.text?.slice(0, 200) || detail.info?.descr?.slice(0, 200) || '',
            category: place.kinds.split(',')[0]?.replace(/_/g, ' ') || 'attraction',
            rating: place.rate ?? 0,
            image: detail.preview?.source || detail.image || null,
            lat: place.point.lat,
            lng: place.point.lon,
            wikipedia: detail.wikipedia || null,
          }
        } catch {
          return null
        }
      })
    )

    return NextResponse.json(detailed.filter(Boolean))
  } catch {
    return NextResponse.json({ error: 'OpenTripMap service unavailable' }, { status: 500 })
  }
}
