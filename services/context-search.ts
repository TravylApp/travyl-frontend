// services/context-search.ts
import { Resource } from 'sst'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { generateEmbedding } from './lib/embeddings'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const query = event.queryStringParameters?.q

    if (!query || query.length < 3) {
      return { statusCode: 400, body: JSON.stringify({ error: 'q must be at least 3 characters' }) }
    }

    const supabase = createClient(
      Resource.SupabaseUrl.value,
      Resource.SupabaseSecretKey.value,
    )

    // Run vector search and text fallback in parallel
    const [vectorResults, textResults] = await Promise.all([
      // Vector similarity search
      (async () => {
        try {
          const queryEmbedding = await generateEmbedding(query)
          const { data, error } = await supabase.rpc('search_trips', {
            query_embedding: JSON.stringify(queryEmbedding),
            match_user_id: userId,
            match_count: 5,
          })
          if (error) {
            console.error('vector search error:', error)
            return []
          }
          return data ?? []
        } catch (err) {
          console.error('embedding error:', err)
          return []
        }
      })(),

      // Text fallback: ILIKE on title and destination via trip_embeddings metadata
      supabase
        .from('trip_embeddings')
        .select('trip_id, metadata')
        .eq('user_id', userId)
        .or(`text_content.ilike.%${query}%`)
        .limit(5)
        .then(({ data, error }) => {
          if (error) {
            console.error('text search error:', error)
            return []
          }
          return (data ?? []).map((row: any) => ({
            trip_id: row.trip_id,
            metadata: row.metadata,
            score: 0.5, // fixed relevance for text matches
          }))
        }),
    ])

    // Merge and deduplicate — vector results take priority
    const seen = new Set<string>()
    const merged = []
    for (const row of [...vectorResults, ...textResults]) {
      if (!seen.has(row.trip_id)) {
        seen.add(row.trip_id)
        merged.push(row)
      }
    }

    const results = merged.slice(0, 5).map((row: any) => ({
      tripId: row.trip_id,
      title: row.metadata.title,
      destination: row.metadata.destination,
      startDate: row.metadata.startDate,
      endDate: row.metadata.endDate,
      status: row.metadata.status,
      activityCount: row.metadata.activityCount,
      imageUrl: row.metadata.imageUrl ?? null,
      score: row.score,
    }))

    return { statusCode: 200, body: JSON.stringify({ results }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('context-search error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
