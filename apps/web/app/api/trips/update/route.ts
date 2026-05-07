import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabase, supabaseUrl, supabaseKey, checkOrigin, rateLimit } from '@/lib/api-utils'

const CITY_AIRPORTS: Record<string, string> = {
  'Paris': 'CDG', 'London': 'LHR', 'Tokyo': 'NRT', 'Rome': 'FCO',
  'Barcelona': 'BCN', 'New York': 'JFK', 'Dubai': 'DXB', 'Bali': 'DPS',
  'Sydney': 'SYD', 'Istanbul': 'IST', 'Bangkok': 'BKK', 'Lisbon': 'LIS',
  'Prague': 'PRG', 'Marrakech': 'RAK', 'Cape Town': 'CPT', 'Amsterdam': 'AMS',
  'Berlin': 'BER', 'Madrid': 'MAD', 'Athens': 'ATH', 'Seoul': 'ICN',
  'Singapore': 'SIN', 'Hong Kong': 'HKG', 'Mumbai': 'BOM', 'Delhi': 'DEL',
  'Cairo': 'CAI', 'Nairobi': 'NBO', 'Mexico City': 'MEX', 'Rio de Janeiro': 'GIG',
  'Milan': 'MXP', 'Vienna': 'VIE', 'Zurich': 'ZRH', 'Dublin': 'DUB',
  'Cancun': 'CUN', 'Lima': 'LIM', 'Buenos Aires': 'EZE', 'Reykjavik': 'KEF',
  'Oslo': 'OSL', 'Stockholm': 'ARN', 'Copenhagen': 'CPH', 'Helsinki': 'HEL',
  'Kuala Lumpur': 'KUL', 'Jakarta': 'CGK', 'Manila': 'MNL',
  'Taipei': 'TPE', 'Osaka': 'KIX', 'Beijing': 'PEK', 'Shanghai': 'PVG',
}

/**
 * POST /api/trips/update
 * Step 2 of trip creation — receives the heavy payload (trip_context, hotels, flights, itinerary)
 * after the lightweight create has already succeeded. Runs server-side so no CloudFront WAF limit.
 */
export async function POST(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'trip-update', 10, 60_000)
  if (blocked) return blocked

  const supabase = getSupabase()
  let body: any; try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
  const { tripId, trip_context, flights } = body

  if (!tripId || typeof tripId !== 'string') {
    return NextResponse.json({ error: 'Missing tripId' }, { status: 400 })
  }

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

  const city = trip.destination?.split(',')[0]?.trim()

  // Hotels are no longer auto-seeded from the AI planner's output —
  // suggestions still live in `trip_context.hotels`, but only user-confirmed
  // selections (search "Add to trip" or manual form) land in the hotels table.

  // Save flights to flights table
  if (flights?.length) {
    const destIata = CITY_AIRPORTS[city || ''] || ''
    const flightRows = flights.map((f: any) => ({
      trip_id: tripId,
      data: {
        airline: f.airline,
        flight_number: null,
        origin_iata: '',
        origin_name: null,
        dest_iata: destIata,
        dest_name: city,
        departure_at: f.departure_time,
        arrival_at: f.arrival_time,
        price: f.price,
        currency: f.currency || 'USD',
        cabin_class: null,
        booking_ref: null,
        offer_id: null,
      },
    }))
    const { error: flightErr } = await supabase.from('flights').insert(flightRows)
  }

  // Itinerary is stored in trip_context — no separate tables needed

  return NextResponse.json({ ok: true })
}
