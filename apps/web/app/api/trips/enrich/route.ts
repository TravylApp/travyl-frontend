import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key if available (bypasses RLS), otherwise fall back to anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const COUNTRY_CUISINE: Record<string, string> = {
  France: 'French', Spain: 'Spanish', Italy: 'Italian', Japan: 'Japanese',
  Mexico: 'Mexican', India: 'Indian', China: 'Chinese', Thailand: 'Thai',
  Morocco: 'Moroccan', Turkey: 'Turkish', Greece: 'Greek', Vietnam: 'Vietnamese',
  UK: 'British', USA: 'American', Canada: 'Canadian', Ireland: 'Irish',
  Portugal: 'Portuguese', Brazil: 'Brazilian', Egypt: 'Egyptian', Poland: 'Polish',
  Germany: 'German', Netherlands: 'Dutch', Sweden: 'Swedish', Norway: 'Norwegian',
}

export async function POST(req: NextRequest) {
  const { tripId } = await req.json()
  if (!tripId) return NextResponse.json({ error: 'Missing tripId' }, { status: 400 })

  // Fetch the trip
  const { data: trip, error: fetchErr } = await supabase
    .from('trips').select('*').eq('id', tripId).single()

  if (fetchErr || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
  }

  const existing = trip.trip_context ?? {}

  // Skip if fully enriched (has all key fields including explore_items and foursquare_venues)
  if (existing.hero_image_url && existing.wiki && existing.quick_facts && existing.explore_items?.length > 0 && existing.foursquare_venues?.length > 0) {
    return NextResponse.json({ status: 'already_enriched' })
  }

  // Parse destination
  const parts = (trip.destination || '').split(',')
  const city = parts[0]?.trim() || trip.destination
  const country = parts[parts.length - 1]?.trim() || ''
  const cuisineArea = COUNTRY_CUISINE[country] ?? ''

  // Geocode if no lat/lng
  let lat = existing.lat ?? 0
  let lng = existing.lng ?? 0
  if (!lat && !lng) {
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trip.destination)}&format=json&limit=1`)
      const geoData = await geoRes.json()
      if (geoData[0]) { lat = parseFloat(geoData[0].lat); lng = parseFloat(geoData[0].lon) }
    } catch {}
  }

  const durationDays = trip.start_date && trip.end_date
    ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
    : 5

  const baseUrl = req.nextUrl.origin

  // Fetch explore items — try backend, fall back to Foursquare
  let exploreItems: any[] = []
  if (lat && lng) {
    try {
      const cats = ['sightseeing', 'restaurant', 'museum']
      const results = await Promise.all(
        cats.map(async (cat) => {
          const r = await fetch(`${baseUrl}/api/places?lat=${lat}&lng=${lng}&category=${cat}&limit=4`)
          return r.ok ? r.json() : []
        })
      )
      const seen = new Set<string>()
      exploreItems = results.flat().filter((p: any) => {
        if (seen.has(p.id)) return false; seen.add(p.id); return true
      }).map((p: any) => ({ id: p.id, title: p.name, description: p.description || p.category, category: p.category, image: p.image }))
    } catch {}

    // Fallback: Foursquare
    if (exploreItems.length === 0) {
      try {
        const fsCats = ['attraction', 'restaurant', 'museum']
        const results = await Promise.all(
          fsCats.map(async (cat) => {
            const r = await fetch(`${baseUrl}/api/foursquare?lat=${lat}&lng=${lng}&category=${cat}&limit=4`)
            return r.ok ? r.json() : []
          })
        )
        const seen = new Set<string>()
        exploreItems = results.flat().filter((p: any) => {
          if (!p?.id || seen.has(p.id)) return false; seen.add(p.id); return true
        }).map((p: any) => ({ id: p.id, title: p.name, description: p.tip || p.category || 'Popular spot', category: p.category || 'Attraction', image: p.image }))
      } catch {}
    }
  }

  // Fetch all enrichment APIs in parallel
  const countryCode = country.substring(0, 2).toUpperCase()
  const [heroImageUrl, weatherData, hotelData, newsData, landmarkPhotos, countryInfo, wikiData, holidays, cuisineData, sunriseData, fsAttractions, fsRestaurants, fsNightlife] = await Promise.all([
    fetch(`${baseUrl}/api/images?q=${encodeURIComponent(city)}`)
      .then(r => r.ok ? r.json().then((d: any) => d.url) : undefined).catch(() => undefined),
    fetch(`${baseUrl}/api/weather?location=${encodeURIComponent(trip.destination)}&days=${durationDays}`)
      .then(r => r.ok ? r.json() : null).catch(() => null),
    lat ? fetch(`${baseUrl}/api/foursquare?lat=${lat}&lng=${lng}&category=hotel&limit=5`)
      .then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
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
    cuisineArea ? fetch(`${baseUrl}/api/cuisine?area=${encodeURIComponent(cuisineArea)}`)
      .then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
    lat ? fetch(`${baseUrl}/api/sunrise?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
    // Foursquare venues for "What's Going On"
    lat ? fetch(`${baseUrl}/api/foursquare?lat=${lat}&lng=${lng}&category=attraction&limit=6`)
      .then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
    lat ? fetch(`${baseUrl}/api/foursquare?lat=${lat}&lng=${lng}&category=restaurant&limit=4`)
      .then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
    lat ? fetch(`${baseUrl}/api/foursquare?lat=${lat}&lng=${lng}&category=nightlife&limit=4`)
      .then(r => r.ok ? r.json() : []).catch(() => []) : Promise.resolve([]),
  ])

  // Build Foursquare "What's Going On" venues (distinct from explore_items)
  const fsVenues = [...(fsAttractions || []), ...(fsRestaurants || []), ...(fsNightlife || [])]
    .filter((v: any) => v?.id && v?.name)
    .map((v: any) => ({ id: v.id, title: v.name, description: v.tip || v.category || 'Popular spot', category: v.category || 'Venue', image: v.image }))
    .slice(0, 8)

  const fresh: Record<string, any> = {
    hero_image_url: landmarkPhotos?.[0]?.image || exploreItems[0]?.image || heroImageUrl,
    hero_images: (landmarkPhotos?.length > 0
      ? landmarkPhotos.filter((p: any) => p.image).map((p: any) => p.image).slice(0, 8)
      : exploreItems.filter((e) => e.image).map((e) => e.image).slice(0, 6)) || undefined,
    lat, lng,
    lede_text: `A ${durationDays}-day trip to ${city}.`,
    explore_items: exploreItems,
    foursquare_venues: fsVenues.length > 0 ? fsVenues : undefined,
    weather: weatherData ? { current: weatherData.current, forecast: weatherData.forecast } : undefined,
    hotels: hotelData?.length > 0 ? hotelData : undefined,
    news: newsData?.length > 0 ? newsData : undefined,
    country: countryInfo ?? undefined,
    wiki: wikiData ?? undefined,
    holidays: holidays?.length > 0 ? holidays.slice(0, 10) : undefined,
    cuisine: cuisineData?.length > 0 ? cuisineData.slice(0, 6) : undefined,
    sunrise: sunriseData ?? undefined,
    quick_facts: countryInfo ? {
      currency: `${countryInfo.currency?.code} (${countryInfo.currency?.symbol})`,
      language: countryInfo.language,
      timezone: countryInfo.timezone,
      emergency: '112',
    } : undefined,
  }

  // Merge: fill missing fields, replace empty arrays, and fix zero lat/lng
  const merged = { ...existing }
  for (const [key, value] of Object.entries(fresh)) {
    if (value == null) continue
    const current = merged[key]
    const isEmpty = current == null
      || (Array.isArray(current) && current.length === 0 && Array.isArray(value) && value.length > 0)
      || ((key === 'lat' || key === 'lng') && current === 0 && value !== 0)
    if (isEmpty) {
      merged[key] = value
    }
  }

  // Update trip
  const { error: updateErr } = await supabase
    .from('trips').update({ trip_context: merged }).eq('id', tripId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'enriched', keys: Object.keys(merged) })
}
