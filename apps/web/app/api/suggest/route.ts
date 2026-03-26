import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import type { SuggestionCard } from '@travyl/shared'

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

// ─── Cached fetch ─────────────────────────────────────────────
// Results are cached per (serpLocation, city, query) for 24 hours server-side.
// All users loading the same destination within that window share the same
// cached result — no repeat SerpAPI credits.

const fetchSuggestionsForDestination = unstable_cache(
  async (serpLocation: string, city: string, query: string): Promise<SuggestionCard[]> => {
    const apiKey = process.env.SERPAPI_KEY
    if (!apiKey) return []

    const url = new URL(SERPAPI_BASE)
    url.searchParams.set('engine', 'google_local')
    url.searchParams.set('q', query)
    url.searchParams.set('location', serpLocation)
    url.searchParams.set('api_key', apiKey)

    console.log('[suggest] fetching (cache miss):', query, 'in', serpLocation)

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      console.error('[suggest] SerpAPI error:', res.status)
      return []
    }

    const data = await res.json()
    const results = (data.local_results ?? []).slice(0, 20)

    // Enrich top 10 results with extra photos from google_images in parallel
    const ENRICH_LIMIT = 10
    const extraImagesList = await Promise.all(
      results.slice(0, ENRICH_LIMIT).map((place: any) =>
        fetchExtraImages(place.title, city, apiKey)
      )
    )

    return results.map((place: any, i: number) => {
      const imageUrls = extractImageUrls(place, extraImagesList[i] ?? [])
      return {
        id: `serp-${place.place_id ?? i}`,
        name: place.title,
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
        source: 'ai' as const,
        relevanceScore: Math.max(0, 1 - i * 0.05),
      }
    })
  },
  ['suggestions'],
  { revalidate: 60 * 60 * 24 }, // 24 hours
)

// ─── Route handler ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const destination = searchParams.get('destination')
  const category = searchParams.get('category') ?? 'all'
  const q = searchParams.get('q')
  const start = parseInt(searchParams.get('start') ?? '0', 10)

  if (!destination) {
    return NextResponse.json({ error: 'destination required' }, { status: 400 })
  }

  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })
  }

  const query = q ? q : (CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.all)

  // Normalise destination to "City, Country" for SerpAPI
  const parts = destination.split(',').map((p) => p.trim())
  const serpLocation = parts.length >= 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : destination
  const city = parts[0]

  let suggestions = await fetchSuggestionsForDestination(serpLocation, city, query)

  // Apply pagination after cache (start offset is rare; avoid splitting the cache)
  if (start > 0) suggestions = suggestions.slice(start)

  return NextResponse.json(
    { suggestions, source: 'ok' },
    {
      headers: {
        // Browser + CDN: serve fresh for 1 hour, stale-while-revalidating for up to 24h
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
}

// ─── Image helpers ────────────────────────────────────────────

/**
 * Fetch extra images for a place using google_images engine.
 * Returns up to 5 `original` source URLs — real web images, not encrypted-tbn thumbnails.
 * Fails silently: if the call errors or returns nothing, the card just shows fewer photos.
 */
async function fetchExtraImages(name: string, city: string, apiKey: string): Promise<string[]> {
  try {
    const url = new URL(SERPAPI_BASE)
    url.searchParams.set('engine', 'google_images')
    url.searchParams.set('q', `${name} ${city}`)
    url.searchParams.set('num', '6')
    url.searchParams.set('api_key', apiKey)

    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) return []

    const data = await res.json()
    return (data.images_results ?? [])
      .slice(0, 5)
      .map((img: any) => img.original ?? '')
      .filter((u: string) => !!u)
  } catch {
    return []
  }
}

/**
 * Google CDN URLs (lh*.googleusercontent.com) include size params like =w100-h80-n-k-no.
 * The actual photo is full-res — we can request a larger version by replacing those params.
 * encrypted-tbn* URLs are Google's search-crawled micro-thumbnails that can't be upscaled.
 */
function upscaleThumbnail(url: string): string {
  if (!url) return url
  if (/lh\d*\.googleusercontent\.com/.test(url)) {
    return url.replace(/=([whs]\d+(-[a-zA-Z0-9]+)*)$/, '=w800-h600')
  }
  return url
}

/**
 * Collect all usable image URLs for a place result, deduplicated and upscaled.
 */
function extractImageUrls(place: any, extraImages: string[] = []): string[] {
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

  // Extra images from google_images — already `original` URLs, skip the encrypted-tbn filter
  for (const u of extraImages) {
    if (u && !seen.has(u)) {
      seen.add(u)
      urls.push(u)
    }
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
