import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabase, supabaseUrl, supabaseKey, rateLimit } from '@/lib/api-utils'
import { upscaleGoogleImage } from '@travyl/shared'
import { filterByRadius } from '@/lib/haversine'

const BACKEND_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL || ''


export async function POST(req: NextRequest) {
  const blocked = rateLimit(req, 'enrich', 3, 60_000)
  if (blocked) return blocked

  // Origin check — only accept requests from our own domain
  const originHeader = req.headers.get('origin') || req.headers.get('referer') || ''
  const host = req.headers.get('host') || ''
  const IS_DEV = process.env.NODE_ENV === 'development'
  if (!IS_DEV && originHeader && !originHeader.includes(host) && !['gotravyl.com', 'deeviaje.com', 'amplifyapp.com'].some(d => originHeader.includes(d))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { tripId } = await req.json()
  if (!tripId || typeof tripId !== 'string') return NextResponse.json({ error: 'Missing tripId' }, { status: 400 })

  // Use caller's auth token when available so RLS allows reading private trips (mobile sends Bearer token)
  const authHeader = req.headers.get('authorization')
  const supabase = authHeader
    ? createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } })
    : getSupabase()

  // Fetch the trip
  const { data: trip, error: fetchErr } = await supabase
    .from('trips').select('*').eq('id', tripId).single()

  if (fetchErr || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  // Ownership check: anonymous can only enrich public unowned trips
  if (!authHeader && (trip.user_id || trip.visibility !== 'public')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const existing = trip.trip_context ?? {}

  // Skip if fully enriched (has all key fields including newer APIs)
  if (existing.hero_image_url && existing.wiki && existing.quick_facts && existing.explore_items?.length > 0
    && existing.phrases && existing.nearby_cities && existing.cost_of_living && existing.safety && existing.timezone_info) {
    return NextResponse.json({ status: 'already_enriched' })
  }

  // Parse destination
  const parts = (trip.destination || '').split(',')
  const city = parts[0]?.trim() || trip.destination
  const country = parts[parts.length - 1]?.trim() || ''
  const cuisineCountry = country

  // Geocode if no lat/lng
  let lat = existing.lat ?? 0
  let lng = existing.lng ?? 0
  if (!lat && !lng) {
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trip.destination)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'Travyl/1.0 (travel planning app)' },
      })
      const geoData = await geoRes.json()
      if (geoData[0]) { lat = parseFloat(geoData[0].lat); lng = parseFloat(geoData[0].lon) }
    } catch {}
  }

  const durationDays = trip.start_date && trip.end_date
    ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
    : 5

  // req.nextUrl.origin returns "https://localhost:3000" on Amplify SSR Lambda.
  // Use the Host header or known domain to build the correct self-referencing URL.
  const selfHost = req.headers.get('host') || req.headers.get('x-forwarded-host') || ''
  const selfProto = req.headers.get('x-forwarded-proto') || 'https'
  const baseUrl = selfHost ? `${selfProto}://${selfHost}` : req.nextUrl.origin

  // Fetch explore items — multiple broad NLP queries for diversity, categories come from the API
  let exploreItems: any[] = []
  if (lat && lng) {
    const cityName = city || trip.destination?.split(',')[0]?.trim() || ''
    // Broad queries — the API returns items with their own categories, we don't impose ours
    const queries = [
      `${cityName} things to do`,
      `${cityName} nightlife bars clubs`,
      `${cityName} beaches outdoors`,
      `${cityName} shopping markets`,
    ]
    try {
      const results = await Promise.all(
        queries.map(async (q) => {
          const r = await fetch(`${baseUrl}/api/places?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}&limit=15`)
          return r.ok ? r.json().catch(() => []) : []
        })
      )
      const seen = new Set<string>()
      exploreItems = results.flat().filter((p: any) => {
        const key = p.id || p.name
        if (!p.name || !key || seen.has(key)) return false; seen.add(key); return true
      }).map((p: any) => ({ id: p.id, title: p.name, description: p.description || p.category, category: p.category, image: upscaleGoogleImage(p.image) ?? p.image, lat: p.latitude, lng: p.longitude, rating: p.rating, address: p.address }))
    } catch {}

    // Fallback 1: Foursquare (via backend /api/places/nearby) — broad "all" query
    if (exploreItems.length === 0 && BACKEND_URL) {
      try {
        const fsCats = ['attraction', 'restaurant', 'museum']
        const results = await Promise.all(
          fsCats.map(async (cat) => {
            const r = await fetch(`${BACKEND_URL}/api/places/nearby?lat=${lat}&lng=${lng}&category=${cat}&limit=4&radius_km=50`)
            return r.ok ? r.json() : []
          })
        )
        const seen = new Set<string>()
        exploreItems = results.flat().filter((p: any) => {
          if (!p?.id || seen.has(p.id)) return false; seen.add(p.id); return true
        }).map((p: any) => ({ id: p.id, title: p.name, description: p.tip || p.category || 'Popular spot', category: p.category || 'Attraction', image: upscaleGoogleImage(p.image) ?? p.image }))
      } catch {}
    }

    // Fallback 2: OpenTripMap (free, no key, Wikipedia-enriched descriptions)
    if (exploreItems.length === 0) {
      try {
        const r = await fetch(`${baseUrl}/api/opentripmap?lat=${lat}&lng=${lng}&limit=40`)
        if (r.ok) {
          const items = await r.json()
          const seen = new Set<string>()
          exploreItems = (Array.isArray(items) ? items : []).filter((p: any) => {
            if (!p?.id || !p?.name || seen.has(p.id)) return false; seen.add(p.id); return true
          }).map((p: any) => ({ id: p.id, title: p.name, description: p.description || p.category || 'Attraction', category: p.category || 'attraction', image: upscaleGoogleImage(p.image) ?? p.image }))
        }
      } catch {}
    }
  }

  // Filter explore items by geographic radius to prevent wrong-city results
  if (lat && lng && exploreItems.length > 0) {
    exploreItems = filterByRadius(exploreItems, lat, lng, 50) as typeof exploreItems
  }

  // Fetch all enrichment APIs in parallel with 15s timeout
  const countryCode = country.substring(0, 2).toUpperCase()
  const startParam = trip.start_date || ''
  const endParam = trip.end_date || ''
  const enrichAbort = new AbortController()
  const enrichTimeout = setTimeout(() => enrichAbort.abort(), 15_000)
  const [heroImageUrl, weatherData, hotelData, newsData, landmarkPhotos, countryInfo, wikiData, holidays, cuisineData, sunriseData, eventsData, safetyData, nearbyCities, timezoneData, phrasesData, aqiData, costData, taRestaurants, taAttractions] = await Promise.all([
    (BACKEND_URL
      ? fetch(`${BACKEND_URL}/api/images/search?q=${encodeURIComponent(city)}`)
          .then(r => r.ok ? r.json().then((d: any) => d.url) : undefined).catch(() => undefined)
      : Promise.resolve(undefined)),
    (BACKEND_URL
      ? fetch(`${BACKEND_URL}/api/weather/forecast?location=${encodeURIComponent(trip.destination)}&days=${durationDays}`)
          .then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null)),
    (lat && BACKEND_URL
      ? fetch(`${BACKEND_URL}/api/places/nearby?lat=${lat}&lng=${lng}&category=hotel&limit=5&radius_km=50`)
          .then(r => r.ok ? r.json() : []).catch(() => [])
      : Promise.resolve([])),
    fetch(`${baseUrl}/api/news?destination=${encodeURIComponent(city)}&limit=8`)
      .then(r => r.ok ? r.json() : []).catch(() => []),
    lat ? fetch(`${baseUrl}/api/places?lat=${lat}&lng=${lng}&category=sightseeing&limit=8`)
      .then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
    fetch(`${baseUrl}/api/country?name=${encodeURIComponent(country)}`)
      .then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${baseUrl}/api/wiki?q=${encodeURIComponent(city)}`)
      .then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${baseUrl}/api/holidays?country=${encodeURIComponent(countryCode)}&year=${new Date().getFullYear()}`)
      .then(r => r.ok ? r.json() : []).catch(() => []),
    cuisineCountry ? fetch(`${baseUrl}/api/cuisine?country=${encodeURIComponent(cuisineCountry)}`)
      .then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
    lat ? fetch(`${baseUrl}/api/sunrise?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
    // Real events (Eventbrite + PredictHQ — via backend)
    (BACKEND_URL
      ? fetch(`${BACKEND_URL}/api/events/search?city=${encodeURIComponent(city)}${startParam ? `&start_date=${startParam}` : ''}${endParam ? `&end_date=${endParam}` : ''}`)
          .then(r => r.ok ? r.json() : []).catch(() => [])
      : Promise.resolve([])),
    // Travel safety advisory
    countryCode ? fetch(`${baseUrl}/api/safety?country=${encodeURIComponent(countryCode)}`)
      .then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
    // Nearby cities (Geonames) — "Also consider visiting..."
    lat ? fetch(`${baseUrl}/api/geonames?lat=${lat}&lng=${lng}&mode=cities&radius=100&limit=5`)
      .then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
    // Timezone data
    lat ? fetch(`${baseUrl}/api/timezone?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
    // Essential phrases translated to local language
    country ? fetch(`${baseUrl}/api/translate?lang=${encodeURIComponent(country)}`)
      .then(r => r.ok ? r.json().then((d: any) => d.phrases) : null).catch(() => null) : Promise.resolve(null),
    // Air quality index
    lat ? fetch(`${baseUrl}/api/aqi?lat=${lat}&lon=${lng}`)
      .then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
    // Cost of living estimates
    fetch(`${baseUrl}/api/costliving?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`)
      .then(r => r.ok ? r.json() : null).catch(() => null),
    // TripAdvisor restaurants — real photos + ratings (via backend)
    (lat && BACKEND_URL
      ? fetch(`${BACKEND_URL}/api/places/nearby?lat=${lat}&lng=${lng}&category=restaurants&limit=6&radius_km=50`)
          .then(r => r.ok ? r.json() : []).catch(() => [])
      : Promise.resolve([])),
    // TripAdvisor attractions — supplement explore items (via backend)
    (lat && BACKEND_URL
      ? fetch(`${BACKEND_URL}/api/places/nearby?lat=${lat}&lng=${lng}&category=attractions&limit=6&radius_km=50`)
          .then(r => r.ok ? r.json() : []).catch(() => [])
      : Promise.resolve([])),
  ])
  clearTimeout(enrichTimeout)

  // Supplement explore_items with TripAdvisor attractions (better photos, more data)
  if (taAttractions?.length > 0) {
    // Filter by radius to avoid wrong-city results
    const filteredAttractions = lat && lng
      ? filterByRadius(taAttractions, lat, lng, 50)
      : taAttractions
    const existingIds = new Set(exploreItems.map((e) => e.title?.toLowerCase()))
    for (const ta of filteredAttractions) {
      if (!ta.name || existingIds.has(ta.name.toLowerCase())) continue
      existingIds.add(ta.name.toLowerCase())
      exploreItems.push({
        id: ta.id,
        title: ta.name,
        description: ta.tip || ta.category || 'Attraction',
        category: ta.category || 'Attraction',
        image: ta.image,
      })
    }
  }

  const fresh: Record<string, any> = {
    hero_image_url: upscaleGoogleImage(landmarkPhotos?.[0]?.image || exploreItems[0]?.image || heroImageUrl) ?? (landmarkPhotos?.[0]?.image || exploreItems[0]?.image || heroImageUrl),
    hero_images: (landmarkPhotos?.length > 0
      ? landmarkPhotos.filter((p: any) => p.image).map((p: any) => upscaleGoogleImage(p.image) ?? p.image).slice(0, 8)
      : exploreItems.filter((e) => e.image).map((e) => upscaleGoogleImage(e.image) ?? e.image).slice(0, 6)) || undefined,
    lat, lng,
    lede_text: `A ${durationDays}-day trip to ${city}.`,
    explore_items: exploreItems,
    events: eventsData?.length > 0 ? eventsData : undefined,
    weather: weatherData ? { current: weatherData.current, forecast: weatherData.forecast } : undefined,
    hotels: hotelData?.length > 0 ? hotelData.map((h: any) => ({ ...h, photo_url: upscaleGoogleImage(h.photo_url) ?? h.photo_url })) : undefined,
    news: newsData?.length > 0 ? newsData : undefined,
    country: countryInfo ?? undefined,
    wiki: wikiData ?? undefined,
    holidays: holidays?.length > 0 ? holidays.slice(0, 10) : undefined,
    cuisine: cuisineData?.length > 0 ? cuisineData.slice(0, 6) : undefined,
    sunrise: sunriseData ?? undefined,
    safety: safetyData ?? undefined,
    nearby_cities: nearbyCities?.length > 0
      ? nearbyCities.filter((c: any) => c.name?.toLowerCase() !== city.toLowerCase()).slice(0, 4)
      : undefined,
    timezone_info: timezoneData ?? undefined,
    restaurants: taRestaurants?.length > 0 ? taRestaurants.map((r: any) => ({ ...r, photo_url: upscaleGoogleImage(r.photo_url) ?? r.photo_url })) : undefined,
    phrases: phrasesData ?? undefined,
    aqi: aqiData ?? undefined,
    cost_of_living: costData ?? undefined,
    quick_facts: countryInfo ? {
      currency: countryInfo.currency?.code || 'USD',
      currency_symbol: countryInfo.currency?.symbol || '$',
      language: countryInfo.language,
      timezone: timezoneData?.timezone || countryInfo.timezone,
      emergency: countryInfo.emergency || '112',
    } : undefined,
  }

  // Supplement hero_images with Unsplash/Pexels for better mosaic quality
  if (fresh.hero_images && fresh.hero_images.length < 6 && BACKEND_URL) {
    try {
      const imgRes = await fetch(`${BACKEND_URL}/api/images/search?q=${encodeURIComponent(city + ' travel')}&type=hero`)
      if (imgRes.ok) {
        const imgData = await imgRes.json()
        if (imgData.url && !fresh.hero_images.includes(imgData.url)) {
          fresh.hero_images.push(imgData.url)
        }
      }
    } catch {}
  }

  // Fill missing images for explore items and venues using Pexels/Unsplash
  const itemsMissingImages = [
    ...exploreItems.filter((e) => !e.image).map((e) => ({ ref: e, type: /restaurant|food|culinary|dining/i.test(e.category) ? 'restaurant' : 'activity' })),
  ].slice(0, 6) // Limit to 6 image fetches to avoid rate limits

  if (itemsMissingImages.length > 0 && BACKEND_URL) {
    const imageResults = await Promise.all(
      itemsMissingImages.map(async ({ ref, type }) => {
        try {
          const name = ref.title || ref.name || ''
          const r = await fetch(`${BACKEND_URL}/api/images/search?q=${encodeURIComponent(name + ' ' + city)}&type=${type}`)
          if (r.ok) {
            const d = await r.json()
            return { ref, url: d.url }
          }
        } catch {}
        return { ref, url: null }
      })
    )
    for (const { ref, url } of imageResults) {
      if (url) ref.image = url
    }
  }

  // Ensure all images are high-res before saving to Supabase
  const hiRes = (url: string | undefined | null) => upscaleGoogleImage(url) || url || undefined
  if (fresh.hero_image_url) fresh.hero_image_url = hiRes(fresh.hero_image_url)
  if (fresh.hero_images) fresh.hero_images = fresh.hero_images.map((u: string) => hiRes(u)).filter(Boolean)
  if (fresh.explore_items) fresh.explore_items = fresh.explore_items.map((e: any) => ({ ...e, image: hiRes(e.image) }))
  if (fresh.restaurants) fresh.restaurants = fresh.restaurants.map((r: any) => ({ ...r, image: hiRes(r.image) }))
  if (fresh.hotels) fresh.hotels = fresh.hotels.map((h: any) => ({ ...h, image: hiRes(h.image) }))

  // Merge: fill missing fields, replace empty arrays, and fix zero lat/lng
  const merged = { ...existing }
  for (const [key, value] of Object.entries(fresh)) {
    if (value == null) continue
    const current = merged[key]
    const shouldOverwrite = current == null
      || (Array.isArray(current) && current.length === 0)
      || ((key === 'lat' || key === 'lng') && current === 0 && value !== 0)
    if (shouldOverwrite) {
      merged[key] = value
    }
  }

  // Auto-generate packing suggestions if none exist yet
  try {
    const { count: existingSuggestions } = await supabase
      .from('packing_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId)

    if ((existingSuggestions ?? 0) === 0) {
      const { generatePackingSuggestions } = await import('@travyl/shared')
      const userId = trip.user_id ?? ''
      const suggestions = generatePackingSuggestions(
        {
          destination: trip.destination ?? '',
          country: country,
          startDate: trip.start_date ?? undefined,
          endDate: trip.end_date ?? undefined,
          durationDays,
          weather: weatherData ? {
            current: weatherData.current ? { temp_f: weatherData.current.temp_f, conditions: weatherData.current.conditions } : undefined,
            forecast: weatherData.forecast?.map((d: any) => ({ high: d.high, low: d.low, conditions: d.conditions })),
          } : undefined,
          travelers: trip.trip_context?.travelers ?? undefined,
        },
        userId,
      )

      if (suggestions.length > 0) {
        const rows = suggestions.map((s) => ({ ...s, trip_id: tripId }))
        await supabase.from('packing_suggestions').insert(rows)
      }
    }
  } catch {
    // Non-critical — don't fail enrichment if packing generation fails
  }

  // Update trip
  const { error: updateErr } = await supabase
    .from('trips').update({ trip_context: merged }).eq('id', tripId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Auto-generate packing suggestions via SST (fire-and-forget)
  if (BACKEND_URL) {
    const { data: existingSuggestions } = await supabase
      .from('packing_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId)

    if ((existingSuggestions ?? []).length === 0) {
      // Get auth token to forward to the packing-suggest SST function
      const authHeader = req.headers.get('authorization')
      const body = JSON.stringify({ tripId })
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authHeader) headers['Authorization'] = authHeader

      fetch(`${BACKEND_URL}/packing-suggest`, { method: 'POST', headers, body })
        .catch((err) => console.error('[enrich] packing-suggest failed:', err))
    }
  }

  return NextResponse.json({ status: 'enriched', keys: Object.keys(merged) })
}
