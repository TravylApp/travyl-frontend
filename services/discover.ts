import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { validateAuth } from './lib/auth'
import { searchPlaces } from './lib/serpapi'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiscoverPlace {
  id: string
  name: string
  category: string
  imageUrl: string
  rating: number | null
  priceLevel: string | null
  location: string
  latitude: number
  longitude: number
  description: string
}

interface DiscoverDestination {
  name: string
  imageUrl: string
}

interface DiscoverRoute {
  origin: string
  destination: string
}

interface DiscoverResponse {
  destination: DiscoverDestination
  places: DiscoverPlace[]
  route?: DiscoverRoute
}

// ---------------------------------------------------------------------------
// DynamoDB cache helpers (discover-specific, stores full response shape)
// ---------------------------------------------------------------------------

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

interface DiscoverCacheEntry {
  pk: string
  sk: string
  data: DiscoverResponse
  expiresAt: number
}

async function getCachedDiscover(destination: string): Promise<DiscoverResponse | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: `discover:${destination.toLowerCase()}`, sk: 'results' },
    }),
  )

  if (!result.Item) return null
  const entry = result.Item as DiscoverCacheEntry
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.data
}

async function setCachedDiscover(
  destination: string,
  data: DiscoverResponse,
  ttlSeconds: number = 3600, // 1 hour
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: `discover:${destination.toLowerCase()}`,
        sk: 'results',
        data,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}

// ---------------------------------------------------------------------------
// Route pattern detection
// ---------------------------------------------------------------------------

const ROUTE_PATTERN = /^(.+?)\s+to\s+(.+)$/i

function parseQuery(q: string): { destination: string; route?: DiscoverRoute } {
  const match = q.match(ROUTE_PATTERN)
  if (match) {
    const origin = match[1].trim()
    const destination = match[2].trim()
    return { destination, route: { origin, destination } }
  }
  return { destination: q.trim() }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const q = event.queryStringParameters?.q

    if (!q || q.trim().length < 2) {
      return { statusCode: 400, body: JSON.stringify({ error: 'q parameter required (min 2 chars)' }) }
    }

    const { destination, route } = parseQuery(q)

    console.log('[discover] query:', q, 'destination:', destination, 'userId:', userId)

    // Check cache
    const cached = await getCachedDiscover(destination)
    if (cached) {
      console.log('[discover] cache hit for', destination)
      const response: DiscoverResponse = { ...cached, route }
      return { statusCode: 200, body: JSON.stringify(response) }
    }

    console.log('[discover] cache miss, firing 3 parallel SerpAPI calls')

    // Fire 3 parallel searches by category
    const [diningResults, sightseeingResults, outdoorResults] = await Promise.all([
      searchPlaces(destination, 'dining', { limit: 10 }),
      searchPlaces(destination, 'sightseeing', { limit: 10 }),
      searchPlaces(destination, 'outdoor', { limit: 10 }),
    ])

    // Merge and deduplicate by name, take top 12
    const seen = new Set<string>()
    const merged: DiscoverPlace[] = []

    for (const card of [...diningResults, ...sightseeingResults, ...outdoorResults]) {
      const key = card.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({
        id: card.id,
        name: card.name,
        category: card.category,
        imageUrl: card.imageUrl,
        rating: card.rating,
        priceLevel: card.price != null ? '$'.repeat(Math.max(1, Math.round(card.price / 25))) : null,
        location: card.location,
        latitude: card.latitude,
        longitude: card.longitude,
        description: card.description,
      })
      if (merged.length >= 12) break
    }

    console.log('[discover] merged', merged.length, 'unique places')

    // Build destination metadata from first result with coordinates
    const firstWithImage = merged.find((p) => p.imageUrl) ?? merged[0]
    const discoverDestination: DiscoverDestination = {
      name: destination,
      imageUrl: firstWithImage?.imageUrl ?? '',
    }

    const responseData: DiscoverResponse = {
      destination: discoverDestination,
      places: merged,
    }

    // Cache the full response (1-hour TTL)
    if (merged.length > 0) {
      await setCachedDiscover(destination, responseData)
    }

    // Attach route info if present (not cached — derived from query)
    const response: DiscoverResponse = { ...responseData, route }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('discover error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
