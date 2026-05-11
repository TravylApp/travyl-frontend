import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabase, supabaseUrl, supabaseKey, checkOrigin, rateLimit } from '@/lib/api-utils'
import { parseJsonBody } from '@/lib/zod-helpers'
import { z, tripContextDataSchema } from '@travyl/shared'

const updateBodySchema = z.object({
  tripId: z.string().min(1),
  trip_context: tripContextDataSchema.optional(),
})

/**
 * POST /api/trips/update
 * Step 2 of trip creation — receives the heavy payload (trip_context, hotels, flights, itinerary)
 * after the lightweight create has already succeeded. Runs server-side so no CloudFront WAF limit.
 */
export async function POST(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'trip-update', 10, 60_000)
  if (blocked) return blocked

  const supabase = getSupabase()
  const parsed = await parseJsonBody(req, updateBodySchema)
  if (!parsed.ok) return parsed.response
  const { tripId, trip_context } = parsed.data

  // Verify trip exists and check ownership
  const { data: trip, error: fetchErr } = await supabase
    .from('trips')
    .select('id, destination, start_date, end_date, user_id, visibility')
    .eq('id', tripId)
    .single()

  if (fetchErr || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  // Ownership check: must be authenticated and own the trip
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const { data: { user }, error: authErr } = await createClient(
    supabaseUrl, supabaseKey,
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  // Reject if the trip has no owner (legacy anonymous trip) OR the owner
  // is someone else. Previously the `trip.user_id &&` guard let any
  // authenticated user overwrite anon-owned trips' trip_context.
  if (!trip.user_id || trip.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Update trip_context
  if (trip_context) {
    const { error: updateErr } = await supabase
      .from('trips')
      .update({ trip_context })
      .eq('id', tripId)

    if (updateErr) {
    }
  }

  // Hotels are no longer auto-seeded from the AI planner's output —
  // suggestions still live in `trip_context.hotels`, but only user-confirmed
  // selections (search "Add to trip" or manual form) land in the hotels table.

  // Flights are no longer auto-seeded from the AI planner's output —
  // suggestions still live in `trip_context.flights`, but only user-confirmed
  // selections (search "Add to trip" or manual form) land in the flights table.

  // Itinerary is stored in trip_context — no separate tables needed

  return NextResponse.json({ ok: true })
}
