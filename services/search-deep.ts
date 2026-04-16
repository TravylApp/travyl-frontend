import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { searchPlaces } from './lib/serpapi'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EntityType = 'restaurant' | 'hotel' | 'activity' | 'flight' | null
type Intent = 'discover' | 'entity-search' | 'create-trip' | 'route' | 'unknown'

interface ParsedIntent {
  intent: Intent
  location: string | null
  entityType: EntityType
}

interface FsqCategory {
  id: number
  name: string
}

interface FsqSearchResult {
  fsq_id: string
  name: string
  location: {
    address?: string
    locality?: string
    region?: string
    country?: string
    formatted_address?: string
  }
  categories?: FsqCategory[]
  rating?: number
  stats?: { total_ratings?: number }
  price?: number
}

interface FsqApiResponse {
  results?: FsqSearchResult[]
}

export interface FsqResult {
  id: string
  type: 'restaurant' | 'hotel' | 'activity'
  title: string
  subtitle: string
  href: string
  score: number
  metadata: {
    rating?: number
    priceLevel?: number
    source: 'foursquare'
  }
}

export interface DiscoverResult {
  id: string
  type: 'destination'
  title: string
  subtitle: string
  imageUrl?: string
  href: string
  score: number
  metadata: { source: 'serpapi' }
}

export interface CollaboratorResult {
  id: string
  type: 'user'
  title: string
  subtitle: string
  href: string
  score: number
  metadata: { source: 'collaborators' }
}

interface DeepSearchResponse {
  results: {
    restaurant: FsqResult[]
    activity: FsqResult[]
    hotel: FsqResult[]
    destination: DiscoverResult[]
    user: CollaboratorResult[]
  }
  debug?: { failedSources: string[] }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FSQ_FIELDS = 'fsq_id,name,location,categories,rating,stats,price'
const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fisher-Yates shuffle — returns a new array */
function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const HAIKU_PROMPT = `You are a travel search intent parser. Extract structured intent from a search query.
Return ONLY valid JSON — no explanation, no markdown, no code fences.
Schema:
{
  "intent": "discover" | "entity-search" | "create-trip" | "route" | "unknown",
  "location": string | null,
  "entityType": "restaurant" | "hotel" | "activity" | "flight" | null
}
Rules:
- "discover": user wants to explore a destination with no specific entity type
- "entity-search": user wants a specific category of place in a location
- "create-trip": user wants to plan or start a trip
- "route": user mentions two places (origin to destination)
- "unknown": none of the above apply
- location should be in Title Case (e.g. "Bakersfield", "New York")
Query: `

// ---------------------------------------------------------------------------
// Bedrock / Claude Haiku re-parse
// ---------------------------------------------------------------------------

const bedrockClient = new BedrockRuntimeClient({})

async function reParseIntent(q: string): Promise<ParsedIntent | null> {
  try {
    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          messages: [{ role: 'user', content: `${HAIKU_PROMPT}"${q}"` }],
          max_tokens: 100,
          temperature: 0,
        }),
      }),
    )
    const responseBody = new TextDecoder().decode(response.body)
    const bedrockResult = JSON.parse(responseBody)
    const text: string = bedrockResult.content?.[0]?.text?.trim() ?? ''
    return JSON.parse(text) as ParsedIntent
  } catch (err) {
    console.error('[search-deep] haiku re-parse error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// DynamoDB cache (reuse discover cache pattern)
// ---------------------------------------------------------------------------

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))

interface DiscoverCacheEntry {
  pk: string
  sk: string
  data: DiscoverResult[]
  expiresAt: number
}

async function getCachedDiscover(location: string, q: string): Promise<DiscoverResult[] | null> {
  try {
    const result = await dynamoClient.send(
      new GetCommand({
        TableName: Resource.RecommendationCache.name,
        Key: { pk: `discover:${location.toLowerCase()}:${q.toLowerCase()}`, sk: 'results-deep' },
      }),
    )
    if (!result.Item) return null
    const entry = result.Item as DiscoverCacheEntry
    if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
    return entry.data
  } catch (err) {
    console.error('[search-deep] dynamo get error:', err)
    return null
  }
}

async function setCachedDiscover(location: string, q: string, data: DiscoverResult[]): Promise<void> {
  try {
    await dynamoClient.send(
      new PutCommand({
        TableName: Resource.RecommendationCache.name,
        Item: {
          pk: `discover:${location.toLowerCase()}:${q.toLowerCase()}`,
          sk: 'results-deep',
          data,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        },
      }),
    )
  } catch (err) {
    console.error('[search-deep] dynamo put error:', err)
  }
}

// ---------------------------------------------------------------------------
// Foursquare helpers
// ---------------------------------------------------------------------------

function inferType(categories: FsqCategory[] = []): 'restaurant' | 'hotel' | 'activity' {
  for (const cat of categories) {
    const name = cat.name.toLowerCase()
    if (/hotel|motel|hostel|inn|lodge|resort/.test(name)) return 'hotel'
    if (/restaurant|cafe|bar|pub|diner|bistro|bakery|food|dining|eatery|drink/.test(name))
      return 'restaurant'
  }
  return 'activity'
}

function buildSubtitle(loc: FsqSearchResult['location']): string {
  return (
    loc.formatted_address ??
    [loc.address, loc.locality, loc.region, loc.country].filter(Boolean).join(', ')
  )
}

async function fetchFoursquare(
  q: string,
  near: string | null,
): Promise<{ restaurant: FsqResult[]; hotel: FsqResult[]; activity: FsqResult[] }> {
  const params = new URLSearchParams({ query: q, fields: FSQ_FIELDS, limit: '10' })
  if (near) params.set('near', near)

  const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
    headers: {
      Authorization: Resource.FoursquareApiKey.value,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[search-deep] foursquare ${res.status}: ${body}`)
    throw new Error(`Foursquare error ${res.status}`)
  }

  const data = (await res.json()) as FsqApiResponse
  const places = shuffleArray(data.results ?? [])

  const grouped: { restaurant: FsqResult[]; hotel: FsqResult[]; activity: FsqResult[] } = {
    restaurant: [],
    hotel: [],
    activity: [],
  }

  places.forEach((place, i) => {
    const type = inferType(place.categories)
    grouped[type].push({
      id: place.fsq_id,
      type,
      title: place.name,
      subtitle: buildSubtitle(place.location),
      href: `https://foursquare.com/v/${place.fsq_id}`,
      score: Math.max(0, 1 - i * 0.05),
      metadata: {
        rating: place.rating,
        priceLevel: place.price,
        source: 'foursquare',
      },
    })
  })

  return grouped
}

// ---------------------------------------------------------------------------
// SerpAPI discover helpers
// ---------------------------------------------------------------------------

async function fetchDiscover(location: string, q: string): Promise<DiscoverResult[]> {
  // Cache check (keyed by both location and query)
  const cached = await getCachedDiscover(location, q)
  if (cached) {
    console.log('[search-deep] discover cache hit for', location, q)
    return shuffleArray(cached)
  }

  console.log('[search-deep] discover cache miss, firing 3 SerpAPI calls for', location, q)

  const [diningResults, sightseeingResults, outdoorResults] = await Promise.all([
    searchPlaces(location, 'dining', { limit: 10 }),
    searchPlaces(location, 'sightseeing', { limit: 10 }),
    searchPlaces(location, 'outdoor', { limit: 10 }),
  ])

  const seen = new Set<string>()
  const discoverResults: DiscoverResult[] = []

  for (const card of [...sightseeingResults, ...diningResults, ...outdoorResults]) {
    const key = card.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    discoverResults.push({
      id: card.id,
      type: 'destination',
      title: card.name,
      subtitle: card.location,
      imageUrl: card.imageUrl || undefined,
      href: `/search?q=${encodeURIComponent(card.name)}`,
      score: card.relevanceScore,
      metadata: { source: 'serpapi' },
    })
    if (discoverResults.length >= 15) break
  }

  if (discoverResults.length > 0) {
    await setCachedDiscover(location, q, discoverResults)
  }

  return shuffleArray(discoverResults)
}

// ---------------------------------------------------------------------------
// Collaborator search
// ---------------------------------------------------------------------------

async function fetchCollaborators(
  q: string,
  userId: string,
): Promise<CollaboratorResult[]> {
  const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)

  // Step 1: get trip_ids for the current user
  const { data: myTrips, error: tripsError } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', userId)

  if (tripsError || !myTrips || myTrips.length === 0) return []

  const tripIds = myTrips.map((t: { trip_id: string }) => t.trip_id)

  // Step 2: get all collaborator user_ids on those trips (excluding self)
  const { data: collaboratorRows, error: collabError } = await supabase
    .from('trip_collaborators')
    .select('user_id')
    .in('trip_id', tripIds)
    .neq('user_id', userId)

  if (collabError || !collaboratorRows || collaboratorRows.length === 0) return []

  const collaboratorIds = [...new Set(collaboratorRows.map((r: { user_id: string }) => r.user_id))]

  // Step 3: query profiles matching the search query
  const pattern = `%${q}%`
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .in('id', collaboratorIds)
    .or(`display_name.ilike.${pattern},email.ilike.${pattern}`)
    .limit(5)

  if (profilesError || !profiles) return []

  return profiles.map(
    (p: { id: string; display_name: string | null; email: string | null }, i: number) => ({
      id: p.id,
      type: 'user' as const,
      title: p.display_name ?? p.email ?? 'Unknown',
      subtitle: p.email ?? '',
      href: `/profile/${p.id}`,
      score: Math.max(0, 1 - i * 0.1),
      metadata: { source: 'collaborators' as const },
    }),
  )
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    const params = event.queryStringParameters ?? {}
    const q = params.q?.trim() ?? ''
    let intent = (params.intent as Intent) ?? 'unknown'
    let location = params.location ?? null
    let entityType = (params.entityType as EntityType) ?? null

    if (!q || q.length < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'q parameter required (min 2 chars)' }),
      }
    }

    console.log('[search-deep] q:', q, 'intent:', intent, 'location:', location, 'userId:', userId)

    // Step 3: re-parse unknown intent via Claude Haiku
    if (intent === 'unknown') {
      const reparsed = await reParseIntent(q)
      if (reparsed) {
        intent = reparsed.intent
        location = reparsed.location ?? location
        entityType = reparsed.entityType ?? entityType
        console.log('[search-deep] haiku re-parsed intent:', intent, 'location:', location)
      }
    }

    // Step 4: parallel fan-out
    const failedSources: string[] = []

    const fsqPromise: Promise<{ restaurant: FsqResult[]; hotel: FsqResult[]; activity: FsqResult[] }> =
      intent === 'entity-search' || intent === 'discover' || intent === 'unknown'
        ? fetchFoursquare(q, location).catch((err) => {
            console.error('[search-deep] foursquare failed:', err)
            failedSources.push('foursquare')
            return { restaurant: [], hotel: [], activity: [] }
          })
        : Promise.resolve({ restaurant: [], hotel: [], activity: [] })

    const discoverPromise: Promise<DiscoverResult[]> =
      (intent === 'discover' || intent === 'route') && location
        ? fetchDiscover(location, q).catch((err) => {
            console.error('[search-deep] discover failed:', err)
            failedSources.push('serpapi')
            return []
          })
        : Promise.resolve([])

    const collaboratorsPromise: Promise<CollaboratorResult[]> =
      q.length >= 2
        ? fetchCollaborators(q, userId).catch((err) => {
            console.error('[search-deep] collaborators failed:', err)
            failedSources.push('collaborators')
            return []
          })
        : Promise.resolve([])

    const [fsqResults, discoverResults, collaboratorResults] = await Promise.all([
      fsqPromise,
      discoverPromise,
      collaboratorsPromise,
    ])

    // Step 5+6: merge and return
    const response: DeepSearchResponse = {
      results: {
        restaurant: fsqResults.restaurant,
        activity: fsqResults.activity,
        hotel: fsqResults.hotel,
        destination: discoverResults,
        user: collaboratorResults,
      },
    }

    if (process.env.SST_STAGE !== 'production' && failedSources.length > 0) {
      response.debug = { failedSources }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'Invalid token' || message.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[search-deep] unhandled error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
