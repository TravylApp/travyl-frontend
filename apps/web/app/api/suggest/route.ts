import { NextRequest, NextResponse } from 'next/server'

const SERPAPI_BASE = 'https://serpapi.com/search.json'

const CATEGORY_QUERIES: Record<string, string> = {
  all: 'top things to do',
  sightseeing: 'top tourist attractions',
  dining: 'best restaurants',
  nightlife: 'best bars and nightlife',
  cultural: 'museums and cultural sites',
  shopping: 'shopping',
  outdoor: 'outdoor activities',
  tour: 'guided tours and excursions',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const destination = searchParams.get('destination')
  const category = searchParams.get('category') ?? 'all'
  const start = parseInt(searchParams.get('start') ?? '0', 10)

  if (!destination) {
    return NextResponse.json({ error: 'destination required' }, { status: 400 })
  }

  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })
  }

  const query = CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.all

  // SerpAPI google_local only accepts simple locations like "Paris, France".
  // Trip destinations are full geocoded strings like "Paris, Ile-de-France, Metropolitan France, France".
  // Take the first and last comma-separated parts to get "City, Country".
  const parts = destination.split(',').map((p) => p.trim())
  const serpLocation = parts.length >= 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : destination

  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_local')
  url.searchParams.set('q', query)
  url.searchParams.set('location', serpLocation)
  if (start > 0) url.searchParams.set('start', String(start))
  url.searchParams.set('api_key', apiKey)

  console.log('[suggest] searching:', query, 'in', serpLocation, '(raw:', destination, ')')

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[suggest] SerpAPI error:', res.status, body)
    return NextResponse.json({ error: 'SerpAPI request failed', status: res.status, detail: body }, { status: 502 })
  }

  const data = await res.json()
  const results = (data.local_results ?? []).slice(0, 20)

  const suggestions = results.map((place: any, i: number) => ({
    id: `serp-${place.place_id ?? i}`,
    name: place.title,
    category: inferCategory(place.type, category),
    imageUrl: place.thumbnail ?? '',
    duration: 2,
    price: mapPrice(place.price),
    currency: 'USD',
    rating: place.rating ?? null,
    location: place.address ?? '',
    latitude: place.gps_coordinates?.latitude ?? 0,
    longitude: place.gps_coordinates?.longitude ?? 0,
    description: place.description ?? '',
    source: 'ai',
    relevanceScore: Math.max(0, 1 - i * 0.05),
  }))

  return NextResponse.json({ suggestions, source: 'fresh' })
}

/** Map SerpAPI place type to a category slug that matches the filter chips */
function inferCategory(placeType: string | undefined, fallback: string): string {
  if (!placeType) return fallback === 'all' ? 'sightseeing' : fallback
  const t = placeType.toLowerCase()
  if (t.includes('restaurant') || t.includes('cafe') || t.includes('bakery') || t.includes('food') || t.includes('bar')) return 'dining'
  if (t.includes('museum') || t.includes('gallery') || t.includes('theater') || t.includes('theatre') || t.includes('library')) return 'cultural'
  if (t.includes('park') || t.includes('garden') || t.includes('beach') || t.includes('trail') || t.includes('nature')) return 'outdoor'
  if (t.includes('shop') || t.includes('store') || t.includes('mall') || t.includes('market')) return 'shopping'
  if (t.includes('club') || t.includes('lounge') || t.includes('nightlife')) return 'nightlife'
  if (t.includes('tour') || t.includes('agency')) return 'tour'
  if (t.includes('church') || t.includes('temple') || t.includes('monument') || t.includes('landmark') || t.includes('attraction')) return 'sightseeing'
  return fallback === 'all' ? 'sightseeing' : fallback
}

function mapPrice(price: string | undefined): number | null {
  if (!price) return null
  const map: Record<string, number> = { '$': 10, '$$': 25, '$$$': 50, '$$$$': 100 }
  return map[price] ?? null
}
