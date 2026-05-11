import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabase, supabaseUrl, supabaseKey, checkOrigin, rateLimit } from '@/lib/api-utils'
import { parseJsonBody } from '@/lib/zod-helpers'
import { createTripBodySchema } from '@travyl/shared'


export async function POST(req: NextRequest) {
  try {
    const blocked = checkOrigin(req) || rateLimit(req, 'create', 5, 60_000)
    if (blocked) return blocked

    const supabase = getSupabase()
    const parsed = await parseJsonBody(req, createTripBodySchema)
    if (!parsed.ok) return parsed.response
    const { title, destination, start_date, end_date, travelers, budget, currency, trip_context } = parsed.data

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

    // Sanitize inputs — schema enforces destination shape, but `travelers`
    // and `budget` are still accepted as strings or numbers, and we apply
    // domain caps (50 travelers, 1M budget) here.
    const safeTravelers = Math.min(Math.max(1, parseInt(String(travelers ?? '')) || 1), 50)
    const safeBudget = budget != null ? Math.min(Math.max(0, parseFloat(String(budget)) || 0), 1000000) : null
    const safeTitle = title ? String(title).slice(0, 200) : `${destination.split(',')[0]} Trip`
    const safeCurrency = currency && ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'MXN', 'BRL'].includes(currency) ? currency : 'USD'

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
        currency: safeCurrency,
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

  // Hotels are no longer auto-seeded into the hotels table from the AI
  // planner's output — that surfaced as fake "bookings" on the hotels tab.
  // Suggestions still live in `trip_context.hotels` for inspiration; real
  // bookings only land in the table when the user clicks "Add to trip"
  // from search or fills the manual form.

  // Flights are no longer auto-seeded from the AI planner's output —
  // suggestions still live in `trip_context.flights` for inspiration, but
  // only user-confirmed selections (search "Add to trip" or manual form)
  // land in the flights table.

  // Itinerary is stored in trip_context — no separate tables needed

  return NextResponse.json(data)
  } catch (e) {
    // Don't leak raw error messages (DB constraint names, Postgres internals,
    // network errors) to anonymous callers. Log server-side and return generic.
    console.error('[trips/create] internal error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
