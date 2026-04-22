import { Resource } from 'sst'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import type { Restaurant, RestaurantsResponse } from './lib/types'
import { getCache, setCache } from './lib/cache'

interface SerpLocalResult {
  place_id?: string
  title?: string
  rating?: string
  reviews?: string
  price?: string
  type?: string
  address?: string
  phone?: string
  website?: string
  thumbnail?: string
  gps_coordinates?: {
    latitude: number
    longitude: number
  }
  hours?: string
  service_options?: Record<string, boolean>
}

interface SerpLocalResponse {
  local_results?: SerpLocalResult[]
  local_map?: {
    link?: string
  }
}

const SERP_API_BASE = 'https://serpapi.com/search.json'
const CACHE_TTL_SECONDS = 3600 // 1 hour

function normalizePriceLevel(price?: string): Restaurant['priceLevel'] {
  if (!price) return undefined
  const count = price.split('$').length - 1
  if (count >= 1 && count <= 4) return count as 1 | 2 | 3 | 4
  return undefined
}

function extractCuisine(type?: string): string | undefined {
  if (!type) return undefined
  // Parse cuisine types from SerpAPI format: "restaurant, italian, ..."
  const types = type.split(',').map(t => t.trim())
  const cuisines = types.filter(t =>
    !t.includes('restaurant') &&
    !t.includes('food') &&
    t.length > 2
  )
  return cuisines[0] || undefined
}

function mapSerpResult(result: SerpLocalResult): Restaurant {
  return {
    id: result.place_id || `serp_${Math.random().toString(36).slice(2)}`,
    name: result.title || 'Unknown Restaurant',
    cuisine: extractCuisine(result.type),
    priceLevel: normalizePriceLevel(result.price),
    rating: result.rating ? parseFloat(result.rating) : undefined,
    reviewCount: result.reviews ? parseInt(result.reviews.replace(/[^0-9]/g, ''), 10) : undefined,
    address: result.address || 'Address unavailable',
    phone: result.phone,
    website: result.website,
    imageUrl: result.thumbnail,
    coordinates: result.gps_coordinates ? {
      lat: result.gps_coordinates.latitude,
      lng: result.gps_coordinates.longitude,
    } : undefined,
    hours: result.hours,
  }
}

function buildReserveUrl(name: string, address: string): string | undefined {
  if (!Resource.OpenTableAffiliateKey?.value) return undefined
  // OpenTable partner reservation link
  const encodedName = encodeURIComponent(name)
  const encodedAddress = encodeURIComponent(address)
  return `https://www.opentable.com/s/?term=${encodedName}&latitude=&longitude=&ref=${Resource.OpenTableAffiliateKey.value}`
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2<RestaurantsResponse>> {
  const query = event.queryStringParameters || {}
  const location = query.location
  const lat = query.lat
  const lng = query.lng
  const cuisine = query.cuisine
  const priceLevel = query.price_level
  const limit = Math.min(parseInt(query.limit || '10', 10), 20)

  // Validate location
  if (!location && (!lat || !lng)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required parameter: location or lat+lng' }),
    }
  }

  // Build cache key
  const cacheKeyParts = ['restaurants', location || `${lat},${lng}`, cuisine || 'any', priceLevel || 'any']
  const cacheKey = cacheKeyParts.join(':')

  // Check cache first
  try {
    const cached = await getCache(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached) as Restaurant[]
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurants: parsed.slice(0, limit),
          total: parsed.length,
          source: 'cache',
        }),
      }
    }
  } catch (err) {
    console.error('[restaurant-search] Cache read error:', err)
  }

  const apiKey = Resource.SerpApiKey?.value
  if (!apiKey) {
    console.error('[restaurant-search] SerpAPI key not configured')
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Search service temporarily unavailable' }),
    }
  }

  // Build SerpAPI query
  const queryParams = new URLSearchParams()
  queryParams.set('engine', 'google_maps')
  queryParams.set('type', 'search')
  queryParams.set('api_key', apiKey)

  if (lat && lng) {
    queryParams.set('ll', `@${lat},${lng},15z`)
  } else if (location) {
    queryParams.set('q', `restaurants in ${location}`)
  }

  try {
    const res = await fetch(`${SERP_API_BASE}?${queryParams.toString()}`, {
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error('[restaurant-search] SerpAPI error:', res.status, await res.text())
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Search service error' }),
      }
    }

    const data = (await res.json()) as SerpLocalResponse
    let restaurants = (data.local_results || []).map(mapSerpResult)

    // Filter by cuisine if specified
    if (cuisine) {
      const cuisineLower = cuisine.toLowerCase()
      restaurants = restaurants.filter(r =>
        r.cuisine?.toLowerCase().includes(cuisineLower) ||
        r.name.toLowerCase().includes(cuisineLower)
      )
    }

    // Filter by price level if specified
    if (priceLevel) {
      const targetLevel = parseInt(priceLevel, 10)
      if (!isNaN(targetLevel) && targetLevel >= 1 && targetLevel <= 4) {
        restaurants = restaurants.filter(r => r.priceLevel === targetLevel)
      }
    }

    // Add OpenTable reservation links if affiliate key is configured
    if (Resource.OpenTableAffiliateKey?.value) {
      restaurants = restaurants.map(r => ({
        ...r,
        reserveUrl: buildReserveUrl(r.name, r.address),
      }))
    }

    // Cache results
    try {
      await setCache(cacheKey, JSON.stringify(restaurants), CACHE_TTL_SECONDS)
    } catch (err) {
      console.error('[restaurant-search] Cache write error:', err)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurants: restaurants.slice(0, limit),
        total: restaurants.length,
        source: 'fresh',
      }),
    }
  } catch (err) {
    console.error('[restaurant-search] Error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
