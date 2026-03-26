import { NextRequest, NextResponse } from 'next/server'
import type { ActivityDetail } from '@travyl/shared'

const SERPAPI_BASE = 'https://serpapi.com/search.json'

// ─── Route handler ────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params
  const apiKey = process.env.SERPAPI_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })
  }

  // Strip serp- prefix if present
  const placeId = rawId.startsWith('serp-') ? rawId.slice(5) : rawId

  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_maps')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('api_key', apiKey)

  let data: any
  try {
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      console.error('[activities] SerpAPI error:', res.status)
      return NextResponse.json({ error: 'Failed to fetch activity details' }, { status: 500 })
    }
    data = await res.json()
  } catch (err) {
    console.error('[activities] fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch activity details' }, { status: 500 })
  }

  const place = data.place_results
  if (!place) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
  }

  const imageUrls = extractImageUrls(place)

  const activity: ActivityDetail = {
    id: rawId,
    name: place.title ?? '',
    category: inferCategory(place.type, 'sightseeing'),
    imageUrl: imageUrls[0] ?? '',
    imageUrls,
    duration: 2,
    price: mapPrice(place.price),
    currency: 'USD',
    rating: place.rating ?? null,
    location: place.address ?? '',
    latitude: place.gps_coordinates?.latitude ?? 0,
    longitude: place.gps_coordinates?.longitude ?? 0,
    description: place.description ?? '',
    source: 'ai',
    relevanceScore: 1,
    address: place.address ?? undefined,
    phone: place.phone ?? undefined,
    website: place.website ?? undefined,
  }

  return NextResponse.json(
    { activity },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
}

// ─── Image helpers ────────────────────────────────────────────

function upscaleThumbnail(url: string): string {
  if (!url) return url
  if (/lh\d*\.googleusercontent\.com/.test(url)) {
    return url.replace(/=([whs]\d+(-[a-zA-Z0-9]+)*)$/, '=w800-h600')
  }
  return url
}

function extractImageUrls(place: any): string[] {
  const seen = new Set<string>()
  const urls: string[] = []

  const push = (raw: string) => {
    if (!raw) return
    if (raw.includes('encrypted-tbn')) return
    const upscaled = upscaleThumbnail(raw)
    if (upscaled && !seen.has(upscaled)) {
      seen.add(upscaled)
      urls.push(upscaled)
    }
  }

  if (place.thumbnail) push(place.thumbnail)

  for (const p of (place.photos ?? [])) {
    push(p.original ?? p.url ?? p.thumbnail ?? p.image ?? '')
  }

  return urls
}

// ─── Classifiers ─────────────────────────────────────────────

function inferCategory(placeType: string | undefined, fallback: string): string {
  if (!placeType) return fallback
  const t = placeType.toLowerCase()
  if (t.includes('restaurant') || t.includes('cafe') || t.includes('bakery') || t.includes('food') || t.includes('bar')) return 'dining'
  if (t.includes('museum') || t.includes('gallery') || t.includes('theater') || t.includes('theatre') || t.includes('library')) return 'cultural'
  if (t.includes('park') || t.includes('garden') || t.includes('beach') || t.includes('trail') || t.includes('nature')) return 'outdoor'
  if (t.includes('shop') || t.includes('store') || t.includes('mall') || t.includes('market')) return 'shopping'
  if (t.includes('club') || t.includes('lounge') || t.includes('nightlife')) return 'nightlife'
  if (t.includes('tour') || t.includes('agency')) return 'tour'
  if (t.includes('church') || t.includes('temple') || t.includes('monument') || t.includes('landmark') || t.includes('attraction')) return 'sightseeing'
  return fallback
}

function mapPrice(price: string | undefined): number | null {
  if (!price) return null
  const map: Record<string, number> = { '$': 10, '$$': 25, '$$$': 50, '$$$$': 100 }
  return map[price] ?? null
}
