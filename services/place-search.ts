import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'
import type { SuggestionCard } from './lib/types'

const SERPAPI_BASE = 'https://serpapi.com/search.json'

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

function mapPrice(price: string | undefined): number | null {
  if (!price) return null
  const map: Record<string, number> = { '$': 10, '$$': 25, '$$$': 50, '$$$$': 100 }
  return map[price] ?? null
}

function upscaleImage(url: string): string {
  if (!url) return ''
  // Replace Google usercontent size params with high-res — handles:
  //   =w288-h288-k-no  →  =w1200-h800-k-no
  //   =s100-w200-h200  →  =w1200-h800-k-no
  //   w288-h288         →  w1200-h800
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
    source: 'search',
    relevanceScore: Math.max(0, 1 - index * 0.05),
  }
}

/**
 * GET /places/search?q={query}&category={optional}&limit={optional}
 *
 * Natural language place search. Passes the raw query directly to SerpAPI's
 * google_local engine — no geocoding or destination extraction needed.
 * Queries like "hidden gem restaurant in Sedona" or "rooftop bars in Bangkok"
 * work natively.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const q = event.queryStringParameters?.q
    if (!q) {
      return { statusCode: 400, body: JSON.stringify({ error: 'q parameter required' }) }
    }

    const category = event.queryStringParameters?.category
    const limit = Math.min(parseInt(event.queryStringParameters?.limit ?? '20', 10), 40)
    const lat = event.queryStringParameters?.lat
    const lng = event.queryStringParameters?.lng

    // Build the search query — prepend category if provided and not already in the query
    const searchQuery = category && !q.toLowerCase().includes(category.toLowerCase())
      ? `${category} ${q}`
      : q

    const url = new URL(SERPAPI_BASE)
    url.searchParams.set('engine', 'google_local')
    url.searchParams.set('q', searchQuery)
    // Restrict to destination coordinates when available so results are geographically relevant
    if (lat && lng) {
      url.searchParams.set('ll', `@${lat},${lng},14z`)
    }
    url.searchParams.set('api_key', Resource.SerpApiKey.value)

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[place-search] SerpAPI error: ${res.status} ${body}`)
      return { statusCode: 502, body: JSON.stringify({ error: 'Upstream search failed' }) }
    }

    const data = await res.json()
    const results = (data.local_results ?? [])
      .slice(0, limit)
      .map((place: SerpLocalResult, i: number) =>
        toSuggestionCard(place, category ?? 'search', i),
      )

    return {
      statusCode: 200,
      body: JSON.stringify({ results }),
    }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[place-search] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
