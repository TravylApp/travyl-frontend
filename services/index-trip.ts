// services/index-trip.ts
import { Resource } from 'sst'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { generateEmbedding } from './lib/embeddings'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'body required' }) }
    }

    const { tripId } = JSON.parse(event.body)
    if (!tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tripId required' }) }
    }

    const supabase = createClient(
      Resource.SupabaseUrl.value,
      Resource.SupabaseSecretKey.value,
    )

    // Fetch trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, title, destination, status, start_date, end_date, user_id')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Trip not found' }) }
    }

    // Verify ownership
    if (trip.user_id !== userId) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
    }

    // Fetch activities
    const { data: activities } = await supabase
      .from('activity')
      .select('activity_name, activity_type, notes')
      .eq('trip_id', tripId)

    // Build text blob
    const activityText = (activities ?? [])
      .map((a) => {
        const base = `${a.activity_name} (${a.activity_type})`
        return a.notes ? `${base} - ${a.notes}` : base
      })
      .join(', ')

    const textContent = [
      trip.title,
      trip.destination,
      trip.status,
      activityText,
    ].filter(Boolean).join(' | ')

    // Generate embedding
    const embedding = await generateEmbedding(textContent)

    // Upsert to trip_embeddings
    const metadata = {
      title: trip.title,
      destination: trip.destination,
      status: trip.status,
      startDate: trip.start_date,
      endDate: trip.end_date,
      activityCount: activities?.length ?? 0,
    }

    const { error: upsertError } = await supabase
      .from('trip_embeddings')
      .upsert(
        {
          trip_id: tripId,
          user_id: userId,
          embedding: JSON.stringify(embedding),
          text_content: textContent,
          metadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'trip_id' },
      )

    if (upsertError) {
      console.error('upsert error:', upsertError)
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to index trip' }) }
    }

    return { statusCode: 200, body: JSON.stringify({ indexed: true }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('index-trip error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
