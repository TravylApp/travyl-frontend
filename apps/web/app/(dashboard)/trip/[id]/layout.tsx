import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import TripLayoutInner from "./trip-layout-inner";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: trip } = await supabase
      .from('trips')
      .select('title, destination, start_date, end_date, trip_context')
      .eq('id', id)
      .single()

    if (!trip) return { title: 'Trip — Travyl' }

    const dest = trip.destination || 'Trip'
    const title = trip.title || `Trip to ${dest}`
    const dates = trip.start_date && trip.end_date
      ? `${new Date(trip.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(trip.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : ''
    const description = `Plan your trip to ${dest}${dates ? ` (${dates})` : ''} on Travyl — AI-powered travel planning.`
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
    return { title: 'Trip — Travyl' }
  }
}

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TripLayoutInner tripId={id}>{children}</TripLayoutInner>;
}
