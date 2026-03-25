import { Resource } from 'sst'
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'

interface EntitySearchResult {
  entity_id: string
  entity_type: string
  entity_name: string
  entity_subtitle: string | null
  trip_id: string | null
  trip_title: string | null
  trip_destination: string | null
  image_url: string | null
  score: number
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    const query = event.queryStringParameters?.q
    const typesParam = event.queryStringParameters?.types
    const tripId = event.queryStringParameters?.tripId || null

    if (!query || query.length < 3) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Query must be at least 3 characters' }),
      }
    }

    const entityTypes = typesParam
      ? typesParam.split(',').filter(Boolean)
      : ['hotel', 'flight', 'restaurant', 'activity', 'destination']

    const supabase = createClient(
      Resource.SupabaseUrl.value,
      Resource.SupabaseSecretKey.value,
    )

    const { data, error } = await supabase.rpc('search_entities', {
      query,
      match_user_id: userId,
      entity_types: entityTypes,
      match_trip_id: tripId,
      match_count: 20,
    })

    if (error) {
      console.error('entity-search RPC error:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Search failed' }),
      }
    }

    // Group results by entity_type
    const grouped: Record<string, EntitySearchResult[]> = {}
    for (const row of (data as EntitySearchResult[]) ?? []) {
      if (!grouped[row.entity_type]) grouped[row.entity_type] = []
      grouped[row.entity_type].push(row)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ results: grouped }),
    }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('entity-search error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
