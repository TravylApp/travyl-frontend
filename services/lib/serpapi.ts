import { Resource } from 'sst'
import type { SuggestionCard } from './types'

const SERPAPI_BASE = 'https://serpapi.com/search.json'

/** Maps category slugs to natural language search queries */
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

interface SerpLocalResult {
  place_id?: string
  title: string
  thumbnail?: string
  rating?: number
  price?: string
  description?: string
  address?: string
  gps_coordinates?: { latitude: number; longitude: number }
  images?: string[]
}

interface SerpLocalResponse {
  local_results?: SerpLocalResult[]
}

function getApiKey(): string {
  return Resource.SerpApiKey.value
}

function mapPrice(price: string | undefined): number | null {
  if (!price) return null
  const map: Record<string, number> = { '$': 10, '$$': 25, '$$$': 50, '$$$$': 100 }
  return map[price] ?? null
}

/**
 * Upscales a Googleusercontent image URL to a higher resolution.
 * Transforms e.g. =w288-h288-n-k-no → =w1024-h1024-n-k-no
 */
function upscaleImage(url: string): string {
  if (!url) return ''
  return url
    .replace(/=w\d+-h\d+[^&\s]*/, '=w1200-h800-k-no')
    .replace(/=s\d+-w\d+-h\d+[^&\s]*/, '=w1200-h800-k-no')
    .replace(/(?<!=)w\d+-h\d+(?![^&\s]*=)/, 'w1200-h800')
}

function toSuggestionCard(place: SerpLocalResult, category: string, index: number): SuggestionCard {
  return {
    id: `serp-${place.place_id ?? index}`,
    name: place.title,
    category,
    imageUrl: upscaleImage(place.images?.[0] ?? place.thumbnail ?? ''),
    duration: 2,
    price: mapPrice(place.price),
    currency: 'USD',
    rating: place.rating ?? null,
    location: place.address ?? '',
    latitude: place.gps_coordinates?.latitude ?? 0,
    longitude: place.gps_coordinates?.longitude ?? 0,
    description: place.description ?? '',
    source: 'ai',
    relevanceScore: Math.max(0, 1 - index * 0.05),
  }
}

/**
 * Search for places near a destination using SerpAPI Google Local.
 * Category maps to a targeted query (e.g. "dining" → "best restaurants").
 * Returns results mapped to SuggestionCard format.
 */
export async function searchPlaces(
  destination: string,
  category: string,
  options?: { limit?: number },
): Promise<SuggestionCard[]> {
  const query = CATEGORY_QUERIES[category] ?? CATEGORY_QUERIES.all
  const limit = options?.limit ?? 10

  // SerpAPI google_local only accepts simple locations like "Paris, France".
  // Trip destinations are full geocoded strings like "Paris, Ile-de-France, Metropolitan France, France".
  // Take the first and last comma-separated parts to get "City, Country".
  const parts = destination.split(',').map((p) => p.trim())
  const serpLocation = parts.length >= 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : destination

  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_local')
  url.searchParams.set('q', query)
  url.searchParams.set('location', serpLocation)
  url.searchParams.set('api_key', getApiKey())

  console.log('[serpapi] searching:', query, 'in', destination, '(category:', category, ')')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[serpapi] search failed: ${res.status} ${body}`)
      return []
    }

    const data = (await res.json()) as SerpLocalResponse
    const results = (data.local_results ?? []).slice(0, limit)
    console.log('[serpapi] got', results.length, 'results')
    return results.map((place, i) => toSuggestionCard(place, category, i))
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[serpapi] search timeout')
    } else {
      console.error('[serpapi] search error:', err)
    }
    return []
  }
}

interface SerpMapsResult {
  title?: string
  address?: string
  rating?: number
  price?: string    // '$' | '$$' | '$$$$' etc.
  photos?: Array<{ image?: string; thumbnail?: string }>
  hours?: {
    schedule?: Array<{ day: string; opens: string; closes: string }>
  }
}

interface SerpMapsResponse {
  place_results?: SerpMapsResult
}

export interface PlaceDetails {
  name: string
  address: string
  rating: number | null
  priceTier: string | null
  photos: string[]
  openingHours: Array<{ day: string; opens: string; closes: string }> | null
}

/**
 * Fetch place details for a specific location by name + coordinates.
 * Uses SerpAPI google_maps engine (single-place detail, different from google_local).
 * Opening hours are best-effort — absent from many results.
 */
export async function getPlaceDetails(
  name: string,
  lat: number,
  lng: number,
): Promise<PlaceDetails | null> {
  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_maps')
  url.searchParams.set('q', name)
  url.searchParams.set('ll', `@${lat},${lng},14z`)
  url.searchParams.set('api_key', getApiKey())

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as SerpMapsResponse
    const place = data.place_results
    if (!place) return null

    const photos = (place.photos ?? [])
      .slice(0, 3)
      .map((p) => p.image ?? p.thumbnail ?? '')
      .filter(Boolean)

    return {
      name: place.title ?? name,
      address: place.address ?? '',
      rating: place.rating ?? null,
      priceTier: place.price ?? null,
      photos,
      openingHours: place.hours?.schedule ?? null,
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('[serpapi] place details timeout')
    } else {
      console.error('[serpapi] place details error:', err)
    }
    return null
  }
}
