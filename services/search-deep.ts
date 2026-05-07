import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { searchPlaces } from './lib/serpapi'
import type { SuggestionCard } from './lib/types'

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
    source: 'serpapi'
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

const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// SerpAPI Google-local helpers (replaces deprecated Foursquare)
// ---------------------------------------------------------------------------

/**
 * Map a SuggestionCard from SerpAPI's google_local engine into FsqResult
 * so downstream consumers don't break.
 */
function cardToFsqResult(card: SuggestionCard, type: 'restaurant' | 'hotel' | 'activity', score: number): FsqResult {
  return {
    id: card.id,
    type,
    title: card.name,
    subtitle: card.location,
    href: `/search?q=${encodeURIComponent(card.name)}`,
    score,
    metadata: {
      rating: card.rating ?? undefined,
      priceLevel: card.price ?? undefined,
      source: 'serpapi',
    },
  }
}

/**
 * Search for places using SerpAPI's google_local engine.
 * Makes targeted calls per entity type rather than one catch-all call.
 */
async function fetchPlaces(
  q: string,
  location: string | null,
  entityType: EntityType,
): Promise<{ restaurant: FsqResult[]; hotel: FsqResult[]; activity: FsqResult[] }> {
  if (!location) return { restaurant: [], hotel: [], activity: [] }

  const results: { restaurant: FsqResult[]; hotel: FsqResult[]; activity: FsqResult[] } = {
    restaurant: [],
    hotel: [],
    activity: [],
  }

  // Determine which SerpAPI categories to hit based on requested entity type
  const searches: Array<{ category: string; targetType: 'restaurant' | 'activity' }> = []

  if (entityType === 'restaurant') {
    searches.push({ category: 'dining', targetType: 'restaurant' })
  } else if (entityType === 'activity') {
    searches.push({ category: 'sightseeing', targetType: 'activity' })
    searches.push({ category: 'outdoor', targetType: 'activity' })
  } else {
    // entityType === null (discover/unknown) — try a broad mix
    searches.push(
      { category: 'dining', targetType: 'restaurant' },
      { category: 'sightseeing', targetType: 'activity' },
      { category: 'outdoor', targetType: 'activity' },
    )
  }

  let globalIndex = 0
  const seenNames = new Set<string>()

  for (const { category, targetType } of searches) {
    const cards = await searchPlaces(location, category, { queryModifier: q, limit: 5 }).catch((err) => {
      console.error(`[search-deep] serpapi ${category} failed:`, err)
      return [] as SuggestionCard[]
    })

    for (const card of cards) {
      const key = card.name.toLowerCase()
      if (seenNames.has(key)) continue
      seenNames.add(key)

      results[targetType].push(cardToFsqResult(card, targetType, Math.max(0, 1 - globalIndex * 0.05)))
      globalIndex++
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// SerpAPI discover helpers
// ---------------------------------------------------------------------------

async function fetchDiscover(location: string, q: string): Promise<DiscoverResult[]> {
  // Cache check (keyed by both location and query)
  const cached = await getCachedDiscover(location, q)
  if (cached) {
    console.log('[search-deep] discover cache hit for', location, q)
    return cached
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

  return discoverResults
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

    const placePromise: Promise<{ restaurant: FsqResult[]; hotel: FsqResult[]; activity: FsqResult[] }> =
      intent === 'entity-search' || intent === 'discover' || intent === 'unknown'
        ? fetchPlaces(q, location, entityType).catch((err) => {
            console.error('[search-deep] serpapi places failed:', err)
            failedSources.push('serpapi-places')
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

    const [placeResults, discoverResults, collaboratorResults] = await Promise.all([
      placePromise,
      discoverPromise,
      collaboratorsPromise,
    ])

    // Step 5+6: merge and return
    const response: DeepSearchResponse = {
      results: {
        restaurant: placeResults.restaurant,
        activity: placeResults.activity,
        hotel: placeResults.hotel,
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
