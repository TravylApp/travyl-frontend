import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabase, supabaseUrl, supabaseKey, checkOrigin, rateLimit } from '@/lib/api-utils'


export async function POST(req: NextRequest) {
  try {
    const blocked = checkOrigin(req) || rateLimit(req, 'create', 5, 60_000)
    if (blocked) return blocked

    const supabase = getSupabase()
    let body: any; try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
    const { title, destination, start_date, end_date, status, travelers, budget, currency, trip_context, hotels, flights, itinerary } = body

    // Derive user_id from verified session — never trust body.user_id
    let user_id: string | null = null
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      try {
        const { data: { user } } = await createClient(supabaseUrl, supabaseKey,
          { global: { headers: { Authorization: authHeader } } }
        ).auth.getUser()
        user_id = user?.id ?? null
      } catch {}
    }

    if (!user_id) {
      return NextResponse.json({ error: 'Sign in to plan a trip', code: 'AUTH_REQUIRED' }, { status: 401 })
    }

    if (!destination || typeof destination !== 'string' || destination.length > 200) {
      return NextResponse.json({ error: 'Missing or invalid destination' }, { status: 400 })
    }
    // Sanitize inputs
    const safeTravelers = Math.min(Math.max(1, parseInt(travelers) || 1), 50)
    const safeBudget = budget ? Math.min(Math.max(0, parseFloat(budget) || 0), 1000000) : null
    const safeTitle = title ? String(title).slice(0, 200) : `${destination.split(',')[0]} Trip`

    const { data, error } = await supabase
      .from('trips')
      .insert({
        title: safeTitle,
        destination: destination.slice(0, 200),
        start_date: start_date || null,
        end_date: end_date || null,
        status: 'planning',
        user_id,
        travelers: safeTravelers,
        budget: safeBudget,
        currency: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'MXN', 'BRL'].includes(currency) ? currency : 'USD',
        trip_context: trip_context || {},
        visibility: 'private',
        is_generated: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
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
  }

  // Save flights to flights table (best effort)
  if (flights?.length) {
    const flightRows = flights.map((f: any) => ({
      trip_id: tripId,
      data: {
        airline: f.airline,
        flight_number: null,
        origin_iata: f.origin_iata || '',
        origin_name: f.origin_name || null,
        dest_iata: f.dest_iata || '',
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

  return NextResponse.json(data)
  } catch (e) {
    // Don't leak raw error messages (DB constraint names, Postgres internals,
    // network errors) to anonymous callers. Log server-side and return generic.
    console.error('[trips/create] internal error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
