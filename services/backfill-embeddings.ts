// services/backfill-embeddings.ts
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from './lib/embeddings'

export async function backfill() {
  const supabase = createClient(
    Resource.SupabaseUrl.value,
    Resource.SupabaseServiceRoleKey.value,
  )

  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, title, destination, status, start_date, end_date, user_id')

  if (error || !trips) {
    console.error('Failed to fetch trips:', error)
    return
  }

  console.log(`Backfilling ${trips.length} trips...`)

  for (const trip of trips) {
    try {
      const { data: activities } = await supabase
        .from('activity')
        .select('activity_name, activity_type, notes')
        .eq('trip_id', trip.id)

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

      const embedding = await generateEmbedding(textContent)

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
            trip_id: trip.id,
            user_id: trip.user_id,
            embedding: JSON.stringify(embedding),
            text_content: textContent,
            metadata,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'trip_id' },
        )

      if (upsertError) {
        console.error(`Failed to index trip ${trip.id}:`, upsertError)
      } else {
        console.log(`Indexed: ${trip.title} (${trip.id})`)
      }
    } catch (err) {
      console.error(`Error indexing trip ${trip.id}:`, err)
    }
  }

  console.log('Backfill complete.')
}
