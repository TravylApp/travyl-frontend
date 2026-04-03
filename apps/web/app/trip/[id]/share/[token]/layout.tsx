import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function generateMetadata({ params }: { params: Promise<{ id: string; token: string }> }): Promise<Metadata> {
  const { id, token } = await params

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: trip } = await supabase
      .from('trips')
      .select('title, destination, start_date, end_date, trip_context, share_link_token')
      .eq('id', id)
      .eq('share_link_token', token)
      .single()

    if (!trip) return { title: 'Shared Trip — Travyl' }

    const dest = trip.destination || 'Trip'
    const title = trip.title || `Trip to ${dest}`
    const dates = trip.start_date && trip.end_date
      ? `${new Date(trip.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(trip.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : ''
    const description = `Check out this trip to ${dest}${dates ? ` (${dates})` : ''}. Plan together on Travyl.`
    const heroImage = trip.trip_context?.hero_image_url || null

    return {
      title: `${title} — Travyl`,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        ...(heroImage ? { images: [{ url: heroImage, width: 1200, height: 630 }] } : {}),
      },
      twitter: {
        card: heroImage ? 'summary_large_image' : 'summary',
        title,
        description,
        ...(heroImage ? { images: [heroImage] } : {}),
      },
    }
  } catch {
    return { title: 'Shared Trip — Travyl' }
  }
}

export default function SharedTripLayout({ children }: { children: React.ReactNode }) {
  return children
}
