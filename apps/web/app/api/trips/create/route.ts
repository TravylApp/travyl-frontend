import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
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

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await req.json()
    const { title, destination, start_date, end_date, status, user_id, travelers, budget, currency, trip_context, hotels, flights, itinerary } = body

    if (!destination) {
      return NextResponse.json({ error: 'Missing destination' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('trips')
      .insert({
        title: title || `${destination.split(',')[0]} Trip`,
        destination,
        start_date,
        end_date,
        status: status || 'planning',
        user_id: user_id || null,
        travelers: travelers || 1,
        budget: budget || null,
        currency: currency || 'USD',
        trip_context: trip_context || {},
        visibility: user_id ? 'private' : 'public',
        is_generated: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Trip Create] Supabase error:', error.message, error.code)
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

  const tripId = data.id
  const city = destination.split(',')[0]?.trim()

  // Fetch destination hero image if not already set — ensures every trip has a photo
  if (!trip_context?.hero_image_url && city) {
    try {
      const imgUrl = new URL('/api/images', req.url)
      imgUrl.searchParams.set('q', city)
      imgUrl.searchParams.set('per_page', '3')
      const imgRes = await fetch(imgUrl.toString())
      if (imgRes.ok) {
        const imgData = await imgRes.json()
        const heroUrl = imgData.url || imgData.images?.[0]?.url
        const allUrls = (imgData.images || []).map((i: any) => i.url).filter(Boolean)
        if (heroUrl) {
          const updatedContext = {
            ...(data.trip_context || {}),
            hero_image_url: heroUrl,
            hero_images: allUrls.length > 0 ? allUrls : [heroUrl],
          }
          await supabase.from('trips').update({ trip_context: updatedContext }).eq('id', tripId)
          data.trip_context = updatedContext
        }
      }
    } catch (e) {
      // Non-blocking — trip still works without hero image
      console.error('Failed to fetch hero image:', e)
    }
  }

  // Save hotels to hotels table (best effort)
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
        check_in: start_date,
        check_out: end_date,
        booking_ref: null,
        offer_id: null,
        amenities: h.amenities || [],
        booking_url: h.booking_url || h.link || null,
      },
    }))
    const { error: hotelErr } = await supabase.from('hotels').insert(hotelRows)
    if (hotelErr) console.error('Failed to save hotels:', hotelErr.message, hotelErr.code, hotelErr.details)
  }

  // Save flights to flights table (best effort)
  if (flights?.length) {
    const destIata = CITY_AIRPORTS[city] || ''
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
    if (flightErr) console.error('Failed to save flights:', flightErr)
  }

  // Itinerary is stored in trip_context — no separate tables needed

  return NextResponse.json(data)
  } catch (e) {
    console.error('[Trip Create] Unhandled error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 })
  }
}
