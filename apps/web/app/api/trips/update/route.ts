import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

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
  const supabase = getSupabase()
  const body = await req.json()
  const { tripId, trip_context, hotels, flights } = body

  if (!tripId) {
    return NextResponse.json({ error: 'Missing tripId' }, { status: 400 })
  }

  // Verify trip exists
  const { data: trip, error: fetchErr } = await supabase
    .from('trips')
    .select('id, destination, start_date, end_date')
    .eq('id', tripId)
    .single()

  if (fetchErr || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  // Update trip_context
  if (trip_context) {
    const { error: updateErr } = await supabase
      .from('trips')
      .update({ trip_context })
      .eq('id', tripId)

    if (updateErr) {
      console.error('[Trip Update] trip_context update failed:', updateErr)
    }
  }

  const city = trip.destination?.split(',')[0]?.trim()

  // Save hotels to hotels table
  if (hotels?.length) {
    const hotelRows = hotels.map((h: any) => ({
      trip_id: tripId,
      data: {
        name: h.name,
        address: h.address || null,
        latitude: h.lat || null,
        longitude: h.lng || null,
        price_per_night: h.price_per_night,
        total_price: h.total_price || null,
        currency: h.currency || 'USD',
        rating: h.rating || null,
        star_rating: h.stars || null,
        image_url: h.photo_url || null,
        check_in: trip.start_date,
        check_out: trip.end_date,
        booking_ref: null,
        offer_id: null,
        amenities: h.amenities || [],
        booking_url: h.booking_url || h.link || null,
      },
    }))
    const { error: hotelErr } = await supabase.from('hotels').insert(hotelRows)
    if (hotelErr) console.error('[Trip Update] Failed to save hotels:', hotelErr.message)
  }

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
    if (flightErr) console.error('[Trip Update] Failed to save flights:', flightErr)
  }

  // Save itinerary days + activities
  const itinerary = trip_context?.itinerary
  if (itinerary?.length) {
    for (const day of itinerary) {
      const { data: dayRow, error: dayErr } = await supabase
        .from('itinerary_days')
        .insert({ trip_id: tripId, day_number: day.day, date: day.date })
        .select('id')
        .single()

      if (dayErr || !dayRow) continue

      if (day.slots?.length) {
        const catMap: Record<string, string> = {
          restaurant: 'food', cafe: 'food', bar: 'food',
          park: 'nature', beach: 'nature', garden: 'nature', hiking: 'nature',
          hotel: 'hotel', hostel: 'hotel', airport: 'airport',
        }
        const activities = day.slots.map((slot: any, i: number) => {
          const poi = slot.poi
          return {
            trip_id: tripId,
            itinerary_day_id: dayRow.id,
            activity_name: poi.name,
            activity_type: catMap[poi.subcategory] || catMap[poi.category] || 'other',
            starting_date: day.date,
            ending_date: day.date,
            starting_time: slot.start_time,
            ending_time: slot.end_time,
            latitude: poi.lat,
            longitude: poi.lng,
            sort_order: i,
            activity_data: {
              category: poi.category,
              subcategory: poi.subcategory,
              location_name: poi.name,
              image_url: poi.photo_url || null,
              rating: poi.rating || null,
              description: poi.description || null,
              tags: poi.tags,
              visit_duration_min: poi.visit_duration_min,
            },
          }
        })
        const { error: actErr } = await supabase.from('activities').insert(activities)
        if (actErr) console.error('[Trip Update] Failed to save activities for day', day.day, actErr)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
