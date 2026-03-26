import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import type { SuggestionCard } from '@travyl/shared'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const SERPAPI_BASE = 'https://serpapi.com/search.json'

// Each page fetches a different category query for variety
const PAGE_QUERIES = [
  'top things to do',
  'top tourist attractions',
  'best restaurants',
  'best bars and nightlife',
  'museums and cultural sites',
  'outdoor activities',
  'guided tours and excursions',
]

const CATEGORY_QUERIES: Record<string, string> = {
  all: PAGE_QUERIES[0],
  sightseeing: PAGE_QUERIES[1],
  dining: PAGE_QUERIES[2],
  nightlife: PAGE_QUERIES[3],
  cultural: PAGE_QUERIES[4],
  shopping: 'shopping',
  outdoor: PAGE_QUERIES[5],
  tour: PAGE_QUERIES[6],
}

// ─── Internal type with enrichment metadata ───────────────────

type SuggestionCardWithMeta = SuggestionCard & { _dataId?: string }

// ─── Foursquare v3 photo enrichment ──────────────────────────

async function enrichPhotosFromFoursquare(
  name: string,
  lat: number,
  lng: number,
): Promise<string[]> {
  const fsqKey = process.env.FOURSQUARE_API_KEY
  if (!fsqKey) return []
  try {
    const searchUrl = new URL('https://api.foursquare.com/v3/places/search')
    searchUrl.searchParams.set('query', name)
    searchUrl.searchParams.set('ll', `${lat},${lng}`)
    searchUrl.searchParams.set('radius', '200')
    searchUrl.searchParams.set('limit', '1')
    searchUrl.searchParams.set('fields', 'fsq_id')
    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Accept: 'application/json', Authorization: fsqKey },
      signal: AbortSignal.timeout(4000),
    })
    if (!searchRes.ok) return []
    const fsqId = (await searchRes.json()).results?.[0]?.fsq_id
    if (!fsqId) return []

    const photosRes = await fetch(
      `https://api.foursquare.com/v3/places/${fsqId}/photos?limit=5&sort=POPULAR`,
      {
        headers: { Accept: 'application/json', Authorization: fsqKey },
        signal: AbortSignal.timeout(4000),
      },
    )
    if (!photosRes.ok) return []
    return ((await photosRes.json()) as any[])
      .map((p: any) => `${p.prefix}original${p.suffix}`)
      .filter(Boolean)
  } catch {
    return []
  }
}

// ─── SerpAPI google_maps photo enrichment (fallback) ─────────

async function enrichPhotosFromGoogleMaps(
  dataId: string,
  serpApiKey: string,
): Promise<string[]> {
  try {
    const url = new URL(SERPAPI_BASE)
    url.searchParams.set('engine', 'google_maps')
    url.searchParams.set('data_id', dataId)
    url.searchParams.set('api_key', serpApiKey)
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return ((data.place_results?.photos ?? []) as any[])
      .map((p: any) => p.image ?? p.thumbnail ?? '')
      .filter((u: string) => u && !u.includes('encrypted-tbn'))
      .slice(0, 5)
  } catch {
    return []
  }
}

// ─── Cached fetch ─────────────────────────────────────────────

const fetchSuggestionsForQuery = unstable_cache(
  async (serpLocation: string, query: string): Promise<SuggestionCard[]> => {
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

    // SerpAPI search_metadata contains the resolved GPS for the location query
    const centerLat = data.search_information?.local_map?.gps_coordinates?.latitude
    const centerLng = data.search_information?.local_map?.gps_coordinates?.longitude

    // Filter out results too far from the destination (> ~80 km)
    const MAX_KM = 80
    const nearby = (data.local_results ?? []).filter((place: any) => {
      const lat = place.gps_coordinates?.latitude
      const lng = place.gps_coordinates?.longitude
      if (!lat || !lng || !centerLat || !centerLng) return true // keep if no coords to compare
      return haversineKm(centerLat, centerLng, lat, lng) <= MAX_KM
    }).slice(0, 20)

    // Map to initial cards, preserving place_id for enrichment
    const initial: SuggestionCardWithMeta[] = nearby.map((place: any, i: number) => {
      const imageUrls = extractImageUrls(place)
      return {
        id: `serp-${place.place_id ?? i}`,
        _dataId: place.place_id as string | undefined,
        name: place.title as string,
        category: inferCategory(place.type, 'sightseeing'),
        imageUrl: imageUrls[0] ?? '',
        imageUrls,
        duration: 2,
        price: mapPrice(place.price),
        currency: 'USD',
        rating: place.rating ?? null,
        location: place.address ?? '',
        latitude: (place.gps_coordinates?.latitude ?? 0) as number,
        longitude: (place.gps_coordinates?.longitude ?? 0) as number,
        description: (place.description ?? '') as string,
        source: 'ai' as const,
        relevanceScore: Math.max(0, 1 - i * 0.05),
      }
    })

    // Enrich cards that only have low-quality encrypted-tbn thumbnails
    const needsEnrichment = initial.filter(
      (s: SuggestionCardWithMeta) =>
        !s.imageUrls?.length || s.imageUrls.every((u: string) => u.includes('encrypted-tbn')),
    )

    if (needsEnrichment.length > 0) {
      console.log(`[suggest] enriching ${needsEnrichment.length} cards`)
      const enrichMap = new Map<string, string[]>()

      await Promise.all(
        needsEnrichment.slice(0, 10).map(async (s: SuggestionCardWithMeta) => {
          // Prefer Foursquare v3 (real venue photos)
          let photos = await enrichPhotosFromFoursquare(s.name, s.latitude, s.longitude)
          // Fall back to SerpAPI google_maps
          if (!photos.length && s._dataId) {
            photos = await enrichPhotosFromGoogleMaps(s._dataId, apiKey)
          }
          if (photos.length) enrichMap.set(s.id, photos)
        }),
      )

      return initial.map((s: SuggestionCardWithMeta) => {
        const { _dataId: _d, ...rest } = s
        const photos = enrichMap.get(s.id)
        if (!photos) return rest as SuggestionCard
        return { ...rest, imageUrl: photos[0], imageUrls: photos } as SuggestionCard
      })
    }

    return initial.map((s: SuggestionCardWithMeta) => {
      const { _dataId: _d, ...rest } = s
      return rest as SuggestionCard
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
  const page = parseInt(searchParams.get('page') ?? '0', 10)

  if (!destination) {
    return NextResponse.json({ error: 'destination required' }, { status: 400 })
  }

  if (!process.env.SERPAPI_KEY) {
    return NextResponse.json({ suggestions: [], source: 'unconfigured' })
  }

  const parts = destination.split(',').map((p) => p.trim())
  const serpLocation = parts.length >= 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : destination

  // Custom search query — single page, no pagination
  if (q) {
    const suggestions = await fetchSuggestionsForQuery(serpLocation, q)
    return NextResponse.json(
      { suggestions, hasMore: false, nextPage: null, source: 'ok' },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  }

  // Category-specific — single page
  if (category !== 'all') {
    const query = CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.all
    const suggestions = await fetchSuggestionsForQuery(serpLocation, query)
    return NextResponse.json(
      { suggestions, hasMore: false, nextPage: null, source: 'ok' },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  }

  // Default browse: rotate through category queries per page
  const query = PAGE_QUERIES[page] ?? null
  if (!query) {
    return NextResponse.json(
      { suggestions: [], hasMore: false, nextPage: null, source: 'ok' },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  }

  const suggestions = await fetchSuggestionsForQuery(serpLocation, query)
  const hasMore = page + 1 < PAGE_QUERIES.length

  return NextResponse.json(
    { suggestions, hasMore, nextPage: hasMore ? page + 1 : null, source: 'ok' },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  )
}

// ─── Image helpers ────────────────────────────────────────────

function upscaleThumbnail(url: string): string {
  if (!url) return url
  if (/lh\d*\.googleusercontent\.com/.test(url)) {
    return url.replace(/=([whs]\d+(-[a-zA-Z0-9]+)*)$/, '=w1200-h800')
  }
  return url
}

function extractImageUrls(place: any): string[] {
  const seen = new Set<string>()
  const urls: string[] = []
  const fallbacks: string[] = []

  const push = (raw: string) => {
    if (!raw) return
    // Prefer non-encrypted-tbn URLs but keep them as fallback
    if (raw.includes('encrypted-tbn')) {
      if (!seen.has(raw)) { seen.add(raw); fallbacks.push(raw) }
      return
    }
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

  // Use encrypted-tbn thumbnails as last resort so cards always have an image
  return urls.length > 0 ? urls : fallbacks
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

