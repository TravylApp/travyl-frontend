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

    // Embed the query
    const queryEmbedding = await generateEmbedding(query)

    // Search via RPC
    const { data, error } = await supabase.rpc('search_trips', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_user_id: userId,
      match_count: 5,
    })

    if (error) {
      console.error('search error:', error)
      return { statusCode: 500, body: JSON.stringify({ error: 'Search failed' }) }
    }

    const tripIds = (data ?? []).map((row: any) => row.trip_id)
    const { data: tripRows } = tripIds.length
      ? await supabase.from('trips').select('id, cover_image_url').in('id', tripIds)
      : { data: [] }
    const coverImages = Object.fromEntries((tripRows ?? []).map((t: any) => [t.id, t.cover_image_url]))

    const results = (data ?? []).map((row: any) => ({
      tripId: row.trip_id,
      title: row.metadata.title,
      destination: row.metadata.destination,
      startDate: row.metadata.startDate,
      endDate: row.metadata.endDate,
      status: row.metadata.status,
      activityCount: row.metadata.activityCount,
      imageUrl: coverImages[row.trip_id] ?? row.metadata.imageUrl ?? null,
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
