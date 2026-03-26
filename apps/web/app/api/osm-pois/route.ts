import { NextRequest, NextResponse } from 'next/server'

// Overpass API (OpenStreetMap) — POI data, free, unlimited, no key
// Docs: https://wiki.openstreetmap.org/wiki/Overpass_API

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Common POI queries mapped to Overpass tags
const POI_QUERIES: Record<string, string> = {
  restaurant: '["amenity"="restaurant"]',
  cafe: '["amenity"="cafe"]',
  bar: '["amenity"="bar"]',
  hotel: '["tourism"="hotel"]',
  hostel: '["tourism"="hostel"]',
  museum: '["tourism"="museum"]',
  gallery: '["tourism"="gallery"]',
  monument: '["historic"="monument"]',
  viewpoint: '["tourism"="viewpoint"]',
  park: '["leisure"="park"]',
  beach: '["natural"="beach"]',
  pharmacy: '["amenity"="pharmacy"]',
  hospital: '["amenity"="hospital"]',
  atm: '["amenity"="atm"]',
  supermarket: '["shop"="supermarket"]',
  cinema: '["amenity"="cinema"]',
  theatre: '["amenity"="theatre"]',
  nightclub: '["amenity"="nightclub"]',
  worship: '["amenity"="place_of_worship"]',
  parking: '["amenity"="parking"]',
  fuel: '["amenity"="fuel"]',
  transit: '["public_transport"="station"]',
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const category = sp.get('category') || 'restaurant'
  const radius = sp.get('radius') || '2000' // meters
  const limit = parseInt(sp.get('limit') || '15', 10)

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 })
  }

  const tag = POI_QUERIES[category]
  if (!tag) {
    return NextResponse.json({ error: `Unknown category. Available: ${Object.keys(POI_QUERIES).join(', ')}` }, { status: 400 })
  }

  try {
    // Build Overpass QL query
    const query = `
      [out:json][timeout:10];
      (
        node${tag}(around:${radius},${lat},${lng});
        way${tag}(around:${radius},${lat},${lng});
      );
      out center ${limit};
    `.trim()

    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      next: { revalidate: 3600 },
    })

    if (!res.ok) throw new Error('Overpass query failed')

    const data = await res.json()
    const pois = (data.elements || [])
      .filter((el: any) => el.tags?.name)
      .map((el: any) => ({
        id: String(el.id),
        name: el.tags.name,
        category: el.tags.amenity || el.tags.tourism || el.tags.shop || el.tags.historic || el.tags.leisure || el.tags.natural || category,
        lat: el.lat || el.center?.lat,
        lng: el.lon || el.center?.lon,
        address: [el.tags['addr:street'], el.tags['addr:housenumber'], el.tags['addr:city']].filter(Boolean).join(', ') || null,
        phone: el.tags.phone || el.tags['contact:phone'] || null,
        website: el.tags.website || el.tags['contact:website'] || null,
        openingHours: el.tags.opening_hours || null,
        cuisine: el.tags.cuisine || null,
        wheelchair: el.tags.wheelchair || null,
      }))
      .slice(0, limit)

    return NextResponse.json(pois)
  } catch {
    return NextResponse.json({ error: 'OSM POI service unavailable' }, { status: 500 })
  }
}
