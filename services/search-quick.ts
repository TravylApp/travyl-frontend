import { Resource } from 'sst'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { generateEmbedding } from './lib/embeddings'
import { parseQueryIntentSync, type ParsedIntent } from './lib/intent-parser'

interface TripResult {
  tripId: string
  title: string
  destination: string
  startDate: string | null
  endDate: string | null
  status: string
  activityCount: number
  imageUrl: string | null
  score: number
}

interface EntityResult {
  entity_id: string
  entity_type: string
  entity_name: string
  entity_subtitle: string | null
  trip_id: string | null
  trip_title: string | null
  trip_destination: string | null
  image_url: string | null
  score: number
  latitude: number | null
  longitude: number | null
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const q = event.queryStringParameters?.q ?? ''

    if (q.length < 2) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          intent: { intent: 'unknown', rawQuery: q } satisfies ParsedIntent,
          results: { trip: [] },
        }),
      }
    }

    const parsedIntent: ParsedIntent = parseQueryIntentSync(q) ?? { intent: 'unknown', rawQuery: q }

    const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)
    const failedSources: string[] = []

    const [textTripRows, vectorTripRows, entityGrouped] = await Promise.all([
      // Branch a: text search on trip_embeddings
      (async (): Promise<Array<{ trip_id: string; metadata: Record<string, any>; score: number }>> => {
        try {
          const { data, error } = await supabase
            .from('trip_embeddings')
            .select('trip_id, metadata')
            .eq('user_id', userId)
            .or(`text_content.ilike.%${q}%`)
            .limit(5)
          if (error) {
            console.error('search-quick text search error:', error)
            failedSources.push('text')
            return []
          }
          return (data ?? []).map((row: any) => ({
            trip_id: row.trip_id,
            metadata: row.metadata,
            score: 0.5,
          }))
        } catch (err) {
          console.error('search-quick text search exception:', err)
          failedSources.push('text')
          return []
        }
      })(),

      // Branch b: vector search
      (async (): Promise<Array<{ trip_id: string; metadata: Record<string, any>; score: number }>> => {
        try {
          const queryEmbedding = await generateEmbedding(q)
          const { data, error } = await supabase.rpc('search_trips', {
            query_embedding: JSON.stringify(queryEmbedding),
            match_user_id: userId,
            match_count: 5,
          })
          if (error) {
            console.error('search-quick vector search error:', error)
            failedSources.push('vector')
            return []
          }
          return data ?? []
        } catch (err) {
          console.error('search-quick vector search exception:', err)
          failedSources.push('vector')
          return []
        }
      })(),

      // Branch c: entity search
      (async (): Promise<Record<string, EntityResult[]>> => {
        try {
          const { data, error } = await supabase.rpc('search_entities', {
            query: q,
            match_user_id: userId,
            entity_types: ['restaurant', 'activity'],
            match_trip_id: null,
            match_count: 20,
          })
          if (error) {
            console.error('search-quick entity search error:', error)
            failedSources.push('entity')
            return {}
          }
          const grouped: Record<string, EntityResult[]> = {}
          for (const row of (data as EntityResult[]) ?? []) {
            if (!grouped[row.entity_type]) grouped[row.entity_type] = []
            grouped[row.entity_type].push(row)
          }
          return grouped
        } catch (err) {
          console.error('search-quick entity search exception:', err)
          failedSources.push('entity')
          return {}
        }
      })(),
    ])

    // Merge trip results: vector takes priority, text fills gaps
    const seen = new Set<string>()
    const mergedTrips: TripResult[] = []

    for (const row of [...vectorTripRows, ...textTripRows]) {
      if (!seen.has(row.trip_id)) {
        seen.add(row.trip_id)
        mergedTrips.push({
          tripId: row.trip_id,
          title: row.metadata.title,
          destination: row.metadata.destination,
          startDate: row.metadata.startDate ?? null,
          endDate: row.metadata.endDate ?? null,
          status: row.metadata.status,
          activityCount: row.metadata.activityCount,
          imageUrl: row.metadata.imageUrl ?? null,
          score: row.score,
        })
      }
    }

    const tripResults = mergedTrips.slice(0, 5)

    const responseBody: Record<string, unknown> = {
      intent: parsedIntent,
      results: {
        trip: tripResults,
        ...entityGrouped,
      },
    }

    if (process.env.SST_STAGE !== 'production') {
      responseBody.debug = { failedSources }
    }

    return { statusCode: 200, body: JSON.stringify(responseBody) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('search-quick error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
