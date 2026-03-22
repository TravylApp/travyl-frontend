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

function toSuggestionCard(place: SerpLocalResult, category: string, index: number): SuggestionCard {
  return {
    id: `serp-${place.place_id ?? index}`,
    name: place.title,
    category,
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

  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_local')
  url.searchParams.set('q', query)
  url.searchParams.set('location', destination)
  url.searchParams.set('api_key', getApiKey())

  console.log('[serpapi] searching:', query, 'in', destination, '(category:', category, ')')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
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
    console.error('[serpapi] search error:', err)
    return []
  }
}
