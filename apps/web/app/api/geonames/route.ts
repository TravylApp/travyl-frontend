import { NextRequest, NextResponse } from 'next/server'

// Geonames — nearby cities, landmarks, postal codes, elevation
// Free: 20,000 calls/day with free account
// Docs: https://www.geonames.org/export/web-services.html

const USERNAME = process.env.GEONAMES_USERNAME || 'demo'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const mode = sp.get('mode') || 'nearby' // nearby | landmarks | cities
  const radius = sp.get('radius') || '50' // km
  const limit = parseInt(sp.get('limit') || '8', 10)

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 })
  }

  try {
    if (mode === 'cities') {
      // Nearby cities — great for "Also consider visiting..."
      const res = await fetch(
        `https://api.geonames.org/findNearbyPlaceNameJSON?lat=${lat}&lng=${lng}&radius=${radius}&maxRows=${limit}&cities=cities5000&style=MEDIUM&username=${USERNAME}`,
        { next: { revalidate: 86400 } }
      )
      if (!res.ok) throw new Error('Geonames fetch failed')
      const data = await res.json()
      const places = (data.geonames || []).map((g: any) => ({
        id: String(g.geonameId),
        name: g.name,
        country: g.countryName,
        countryCode: g.countryCode,
        population: g.population,
        lat: parseFloat(g.lat),
        lng: parseFloat(g.lng),
        distance: parseFloat(g.distance), // km from query point
      }))
      return NextResponse.json(places)
    }

    if (mode === 'landmarks') {
      // Wikipedia articles nearby — landmarks, historic sites, POIs
      const res = await fetch(
        `https://api.geonames.org/findNearbyWikipediaJSON?lat=${lat}&lng=${lng}&radius=${Math.min(parseInt(radius), 20)}&maxRows=${limit}&username=${USERNAME}`,
        { next: { revalidate: 86400 } }
      )
      if (!res.ok) throw new Error('Geonames fetch failed')
      const data = await res.json()
      const landmarks = (data.geonames || []).map((g: any) => ({
        id: String(g.geonameId || g.wikipediaUrl),
        name: g.title,
        summary: g.summary,
        lat: parseFloat(g.lat),
        lng: parseFloat(g.lng),
        distance: parseFloat(g.distance),
        thumbnail: g.thumbnailImg || null,
        wikipedia: g.wikipediaUrl ? `https://${g.wikipediaUrl}` : null,
        feature: g.feature || null,
      }))
      return NextResponse.json(landmarks)
    }

    // Default: nearby places (general)
    const res = await fetch(
      `https://api.geonames.org/findNearbyPlaceNameJSON?lat=${lat}&lng=${lng}&radius=${radius}&maxRows=${limit}&style=FULL&username=${USERNAME}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) throw new Error('Geonames fetch failed')
    const data = await res.json()
    const places = (data.geonames || []).map((g: any) => ({
      id: String(g.geonameId),
      name: g.name,
      country: g.countryName,
      countryCode: g.countryCode,
      lat: parseFloat(g.lat),
      lng: parseFloat(g.lng),
      distance: parseFloat(g.distance),
      elevation: g.elevation || null,
      timezone: g.timezone?.timeZoneId || null,
      population: g.population,
    }))
    return NextResponse.json(places)
  } catch {
    return NextResponse.json({ error: 'Geonames service unavailable' }, { status: 500 })
  }
}
