// services/backfill-embeddings.ts
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from './lib/embeddings'
import { fetchPexelsImage } from './lib/pexels'

export async function backfill() {
  const supabase = createClient(
    Resource.SupabaseUrl.value,
    Resource.SupabaseSecretKey.value,
  )

  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, title, destination, status, start_date, end_date, user_id, trip_context')

  if (error || !trips) {
    console.error('Failed to fetch trips:', error)
    return
  }

  console.log(`Backfilling ${trips.length} trips...`)

  interface TripContextJson { hero_images?: string[] }

  for (const trip of trips) {
    try {
      const { data: activities } = await supabase
        .from('activity')
        .select('activity_name, activity_type, notes, starting_date, ending_date, activity_data')
        .eq('trip_id', trip.id)

      interface ActivityData { category?: string; location_name?: string }

      const activityText = (activities ?? [])
        .map((a) => {
          const activityData = a.activity_data as ActivityData | null
          const type = activityData?.category ?? a.activity_type
          let text = `${a.activity_name} (${type})`
          if (activityData?.location_name) text += ` at ${activityData.location_name}`
          if (a.starting_date) {
            text += ` on ${a.starting_date}`
            if (a.ending_date && a.ending_date !== a.starting_date) {
              text += ` to ${a.ending_date}`
            }
          }
          if (a.notes) text += ` - ${a.notes}`
          return text
        })
        .join(', ')

      const dateRange = trip.start_date && trip.end_date
        ? `${trip.start_date} to ${trip.end_date}`
        : null

      const textContent = [
        trip.title,
        trip.destination,
        trip.status,
        dateRange,
        activityText,
      ].filter(Boolean).join(' | ')

      const embedding = await generateEmbedding(textContent)

      const tripContext = trip.trip_context as TripContextJson | null
      let heroImages = tripContext?.hero_images ?? []

      if (heroImages.length === 0 && trip.destination) {
        const pexelsUrl = await fetchPexelsImage(trip.destination)
        if (pexelsUrl) {
          heroImages = [pexelsUrl]
          await supabase
            .from('trips')
            .update({
              trip_context: {
                ...((trip.trip_context as object) ?? {}),
                hero_images: heroImages,
              },
            })
            .eq('id', trip.id)
        }
      }

      const activityList = activities ?? []
      const activityNames = [...new Set(activityList.map((a) => a.activity_name).filter(Boolean))]
      const activityLocations = [...new Set(
        activityList
          .map((a) => (a.activity_data as ActivityData | null)?.location_name)
          .filter((loc): loc is string => Boolean(loc)),
      )]
      const activityTypes = [...new Set(
        activityList
          .map((a) => (a.activity_data as ActivityData | null)?.category ?? a.activity_type)
          .filter(Boolean),
      )]

      const metadata = {
        title: trip.title,
        destination: trip.destination,
        status: trip.status,
        startDate: trip.start_date,
        endDate: trip.end_date,
        activityCount: activityList.length,
        imageUrl: heroImages[0] ?? null,
        activityNames,
        activityLocations,
        activityTypes,
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

backfill().catch((err) => { console.error(err); process.exit(1) })
