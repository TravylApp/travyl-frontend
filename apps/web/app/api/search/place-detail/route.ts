import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY || ''

/**
 * Enriched place detail via SerpAPI.
 * Searches Google Maps by name, returns full details + reviews + photos + menu.
 * ?q=Nobu+Los+Angeles — place name (natural language)
 */
export async function GET(req: NextRequest) {
  const query = getOptionalParam(req, 'q', '')
  if (!query) return NextResponse.json({ error: 'q is required' }, { status: 400 })
  if (!SERPAPI_KEY) return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 503 })

  try {
    // Step 1: Google Maps search to get place details + data_id
    const mapsUrl = new URL('https://serpapi.com/search.json')
    mapsUrl.searchParams.set('engine', 'google_maps')
    mapsUrl.searchParams.set('q', query)
    mapsUrl.searchParams.set('api_key', SERPAPI_KEY)

    const mapsRes = await fetch(mapsUrl.toString(), CACHE_1H)
    if (!mapsRes.ok) return NextResponse.json({})
    const mapsData = await mapsRes.json()

    // Get place_results (exact match) or first local_result
    const place = mapsData.place_results
      ?? mapsData.local_results?.[0]
      ?? {}

    const dataId = place.data_id || ''
    const gps = place.gps_coordinates || {}

    // Extract hours
    let hoursStr = ''
    if (Array.isArray(place.hours)) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const today = days[new Date().getDay()]
      const todayEntry = place.hours.find((h: any) => h[today])
      hoursStr = todayEntry ? `Today: ${todayEntry[today]}` : ''
      // Also build full hours
    } else if (typeof place.hours === 'string') {
      hoursStr = place.hours
    }

    // Build result with everything we have from place_results
    const result: any = {
      name: place.title || query,
      description: place.description || '',
      address: place.address || '',
      phone: place.phone || '',
      website: place.website || '',
      hours: hoursStr,
      allHours: Array.isArray(place.hours) ? place.hours : [],
      rating: place.rating || 0,
      reviewCount: place.reviews || 0,
      latitude: gps.latitude || null,
      longitude: gps.longitude || null,
      type: Array.isArray(place.type) ? place.type : typeof place.type === 'string' ? [place.type] : [],
      priceLevel: place.price ? Math.min((place.price.replace(/[^$]/g, '').length) || 1, 4) : null,
      menuLink: place.menu?.link || null,
      reservationLink: place.reservation?.link || null,
      orderOnlineLink: typeof place.order_online === 'string' ? place.order_online : null,
      reviews: [],
      photos: [],
    }

    // Step 2: Fetch reviews + photos in parallel (if we have data_id)
    if (dataId) {
      const [reviewsRes, photosRes] = await Promise.all([
        fetch(`https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${encodeURIComponent(dataId)}&api_key=${SERPAPI_KEY}`, CACHE_1H)
          .then(r => r.ok ? r.json() : {})
          .catch(() => ({})),
        fetch(`https://serpapi.com/search.json?engine=google_maps_photos&data_id=${encodeURIComponent(dataId)}&api_key=${SERPAPI_KEY}`, CACHE_1H)
          .then(r => r.ok ? r.json() : {})
          .catch(() => ({})),
      ])

      result.reviews = (reviewsRes.reviews || []).slice(0, 10).map((r: any) => ({
        rating: r.rating || 0,
        text: r.snippet || r.extracted_snippet?.original || '',
        author: r.user?.name || '',
        date: r.date || '',
        likes: r.likes || 0,
        authorPhoto: r.user?.thumbnail || '',
      }))

      result.photos = (photosRes.photos || []).slice(0, 15).map((p: any) => p.image).filter(Boolean)
    }

    // Also grab user_reviews from the place_results if available
    if (!result.reviews.length && place.user_reviews?.most_relevant) {
      result.reviews = place.user_reviews.most_relevant.slice(0, 8).map((r: any) => ({
        rating: r.rating || 0,
        text: r.description || r.extracted_snippet?.original || '',
        author: r.username || '',
        date: r.date || '',
        likes: r.likes || 0,
        authorPhoto: r.thumbnail || '',
      }))
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/search/place-detail] error:', err)
    return NextResponse.json({})
  }
}
