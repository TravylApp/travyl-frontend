import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { validateAuth } from './lib/auth'
import type { PlaceItem } from '@travyl/shared/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlacesDiscoverResponse {
  places: PlaceItem[]
  hasMore: boolean
  nextPage: number | null
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

interface SerpEventsResult {
  title?: string
  date?: { start_date?: string; when?: string }
  address?: string
  thumbnail?: string
  description?: string
  link?: string
}

// ---------------------------------------------------------------------------
// Category configuration
// ---------------------------------------------------------------------------

/** All categories to cycle through for discovery */
const ALL_CATEGORIES = [
  'restaurant',
  'attraction',
  'nightlife',
  'shopping',
  'cafe',
  'bar',
  'museum',
  'park',
  'casino',
  'night_club',
  'spa',
  'amusement_park',
  'bowling_alley',
  'movie_theater',
  'zoo',
  'aquarium',
]

/** Maps category to Google Places compatible search query */
const CATEGORY_QUERIES: Record<string, string> = {
  restaurant: 'restaurants',
  attraction: 'tourist attractions',
  nightlife: 'nightlife',
  shopping: 'shopping',
  cafe: 'cafes',
  bar: 'bars',
  museum: 'museums',
  park: 'parks',
  casino: 'casinos',
  night_club: 'night clubs',
  spa: 'spas',
  amusement_park: 'amusement parks',
  bowling_alley: 'bowling alleys',
  movie_theater: 'movie theaters',
  zoo: 'zoos',
  aquarium: 'aquariums',
}

// ---------------------------------------------------------------------------
// DynamoDB cache helpers
// ---------------------------------------------------------------------------

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

interface DiscoverCacheEntry {
  pk: string
  sk: string
  data: PlacesDiscoverResponse
  page: number
  expiresAt: number
}

function getCacheKey(lat: number, lng: number, page: number): string {
  return `places-discover:${lat.toFixed(4)},${lng.toFixed(4)}:page${page}`
}

async function getCachedDiscover(lat: number, lng: number, page: number): Promise<PlacesDiscoverResponse | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: getCacheKey(lat, lng, page), sk: 'results' },
    }),
  )

  if (!result.Item) return null
  const entry = result.Item as DiscoverCacheEntry
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.data
}

async function setCachedDiscover(
  lat: number,
  lng: number,
  page: number,
  data: PlacesDiscoverResponse,
  ttlSeconds: number = 1800, // 30 minutes
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: getCacheKey(lat, lng, page),
        sk: 'results',
        data,
        page,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}

// ---------------------------------------------------------------------------
// SerpAPI helpers
// ---------------------------------------------------------------------------

const SERPAPI_BASE = 'https://serpapi.com/search.json'

function upscaleImage(url: string): string {
  if (!url) return ''
  return url
    .replace(/=w\d+-h\d+[^&\s]*/, '=w1200-h800-k-no')
    .replace(/=s\d+-w\d+-h\d+[^&\s]*/, '=w1200-h800-k-no')
    .replace(/(?<!=)w\d+-h\d+(?![^&\s]*=)/, 'w1200-h800')
}

function mapPrice(price: string | undefined): number | null {
  if (!price) return null
  const map: Record<string, number> = { '$': 10, '$$': 25, '$$$': 50, '$$$$': 100 }
  return map[price] ?? null
}

function toPlaceItem(place: SerpLocalResult, category: string): PlaceItem {
  return {
    id: `serp-${place.place_id ?? place.title}`,
    name: place.title,
    image: upscaleImage(place.images?.[0] ?? place.thumbnail ?? ''),
    images: place.images?.map(upscaleImage) ?? [],
    type: mapCategoryToType(category),
    rating: place.rating ?? 0,
    tagline: place.description ?? '',
    category,
    description: place.description ?? '',
    tags: [category],
    latitude: place.gps_coordinates?.latitude ?? 0,
    longitude: place.gps_coordinates?.longitude ?? 0,
  }
}

function mapCategoryToType(category: string): PlaceItem['type'] {
  switch (category) {
    case 'restaurant':
    case 'cafe':
      return 'restaurant'
    case 'nightlife':
    case 'bar':
    case 'night_club':
    case 'casino':
      return 'experience'
    case 'shopping':
      return 'attraction'
    default:
      return 'attraction'
  }
}

async function searchPlacesByCategory(
  lat: number,
  lng: number,
  category: string,
  page: number,
): Promise<PlaceItem[]> {
  const query = CATEGORY_QUERIES[category] ?? category
  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_local')
  url.searchParams.set('q', query)
  url.searchParams.set('ll', `@${lat},${lng},14z`)
  url.searchParams.set('start', (page * 20).toString()) // Pagination
  url.searchParams.set('api_key', Resource.SerpApiKey.value)

  console.log('[places-discover] searching:', query, 'at', lat, lng, 'page', page)

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[places-discover] SerpAPI error: ${res.status} ${body}`)
      return []
    }

    const data = await res.json()
    const results = (data.local_results ?? []) as SerpLocalResult[]
    console.log('[places-discover] got', results.length, 'results for', category)
    return results.map((place) => toPlaceItem(place, category))
  } catch (err) {
    console.error('[places-discover] search error:', err)
    return []
  }
}

async function fetchEvents(lat: number, lng: number): Promise<PlaceItem[]> {
  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_events')
  url.searchParams.set('q', 'events')
  url.searchParams.set('ll', `@${lat},${lng},14z`)
  url.searchParams.set('api_key', Resource.SerpApiKey.value)

  console.log('[places-discover] fetching events at', lat, lng)

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      console.error('[places-discover] events fetch error:', res.status)
      return []
    }

    const data = await res.json()
    const events = (data.events_results ?? []) as SerpEventsResult[]
    console.log('[places-discover] got', events.length, 'events')

    return events.slice(0, 5).map((event, i): PlaceItem => ({
      id: `event-${i}-${event.title ?? ''}`,
      name: event.title ?? 'Unknown Event',
      image: event.thumbnail ?? '',
      type: 'event',
      rating: 0,
      tagline: event.date?.when ?? '',
      category: 'event',
      description: event.description ?? '',
      tags: ['event'],
    }))
  } catch (err) {
    console.error('[places-discover] events error:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const latParam = event.queryStringParameters?.lat
    const lngParam = event.queryStringParameters?.lng
    const pageParam = event.queryStringParameters?.page ?? '0'

    if (!latParam || !lngParam) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'lat and lng parameters are required' }),
      }
    }

    const lat = parseFloat(latParam)
    const lng = parseFloat(lngParam)
    const page = parseInt(pageParam, 10)

    if (isNaN(lat) || isNaN(lng) || isNaN(page)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid lat, lng, or page parameter' }),
      }
    }

    console.log('[places-discover] request:', { lat, lng, page })

    // Check cache first
    const cached = await getCachedDiscover(lat, lng, page)
    if (cached) {
      console.log('[places-discover] cache hit')
      return { statusCode: 200, body: JSON.stringify(cached) }
    }

    // For pagination, we cycle through categories
    // Page 0: categories 0-5 + events
    // Page 1: categories 6-11
    // Page 2: categories 12+ (or loop back)
    const categoriesPerPage = 6
    const startIndex = (page * categoriesPerPage) % ALL_CATEGORIES.length
    const categoriesToFetch = ALL_CATEGORIES.slice(startIndex, startIndex + categoriesPerPage)
    
    // If we wrapped around, add more from beginning
    if (categoriesToFetch.length < categoriesPerPage && ALL_CATEGORIES.length >= categoriesPerPage) {
      const remaining = categoriesPerPage - categoriesToFetch.length
      categoriesToFetch.push(...ALL_CATEGORIES.slice(0, remaining))
    }

    // Fetch places for selected categories in parallel
    const categoryResults = await Promise.all(
      categoriesToFetch.map((category) => searchPlacesByCategory(lat, lng, category, page)),
    )

    // Flatten and deduplicate by name
    const seen = new Set<string>()
    let allPlaces: PlaceItem[] = []

    for (const results of categoryResults) {
      for (const place of results) {
        const key = place.name.toLowerCase().trim()
        if (seen.has(key)) continue
        seen.add(key)
        allPlaces.push(place)
      }
    }

    // On page 0, also fetch events
    if (page === 0) {
      const events = await fetchEvents(lat, lng)
      // Prepend events to the list
      allPlaces = [...events, ...allPlaces]
    }

    // Limit to 20 results per page
    const places = allPlaces.slice(0, 20)
    
    // Determine if there are more pages
    // We have more if:
    // 1. We got a full page of results (there might be more)
    // 2. There are more categories we haven't cycled through
    const hasMore = allPlaces.length >= 20 || 
      ((page + 1) * categoriesPerPage) % ALL_CATEGORIES.length !== 0 ||
      (page === 0 && ALL_CATEGORIES.length > categoriesPerPage)

    const response: PlacesDiscoverResponse = {
      places,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
    }

    // Cache the response
    await setCachedDiscover(lat, lng, page, response)

    console.log('[places-discover] returning', places.length, 'places, hasMore:', hasMore)

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[places-discover] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
