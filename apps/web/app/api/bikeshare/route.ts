import { NextRequest, NextResponse } from 'next/server'

// GBFS (General Bikeshare Feed Specification) — bike share stations worldwide
// Free, unlimited, no API key
// Discovery feed: https://github.com/MobilityData/gbfs/blob/master/systems.csv

// Known GBFS system URLs for major cities
const SYSTEMS: Record<string, string> = {
  paris: 'https://velib-metropole-opendata.smoove.pro/opendata/Velib_Metropole/gbfs.json',
  london: 'https://gbfs.tfl.gov.uk/gbfs/2.3/gbfs.json',
  nyc: 'https://gbfs.citibikenyc.com/gbfs/en/gbfs.json',
  chicago: 'https://gbfs.divvybikes.com/gbfs/en/gbfs.json',
  dc: 'https://gbfs.capitalbikeshare.com/gbfs/en/gbfs.json',
  sf: 'https://gbfs.baywheels.com/gbfs/en/gbfs.json',
  toronto: 'https://tor.publicbikesystem.net/ube/gbfs/v1/en/gbfs.json',
  barcelona: 'https://api.bsmsa.eu/ext/api/bsm/gbfs/v2/en/gbfs.json',
  berlin: 'https://gbfs.nextbike.net/maps/gbfs/v2/nextbike_bn/en/gbfs.json',
  amsterdam: 'https://gbfs.urbansharing.com/donkey.bike/gbfs.json',
  rome: 'https://gbfs.ecobici.gba.gob.ar/gbfs/en/gbfs.json',
  tokyo: 'https://api-public.odpt.org/api/v4/gbfs/docomo-cycle-tokyo/gbfs.json',
  mexico: 'https://gbfs.mibici.net/gbfs/en/gbfs.json',
  montreal: 'https://gbfs.velobixi.com/gbfs/en/gbfs.json',
  boston: 'https://gbfs.bluebikes.com/gbfs/en/gbfs.json',
}

async function findStationInfoUrl(gbfsUrl: string): Promise<string | null> {
  try {
    const res = await fetch(gbfsUrl, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const data = await res.json()
    const feeds = data?.data?.en?.feeds || data?.data?.feeds || []
    const stationInfo = feeds.find((f: any) => f.name === 'station_information')
    return stationInfo?.url || null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const city = sp.get('city')?.toLowerCase()
  const lat = parseFloat(sp.get('lat') || '0')
  const lng = parseFloat(sp.get('lng') || '0')
  const limit = parseInt(sp.get('limit') || '10', 10)

  if (!city && (!lat || !lng)) {
    return NextResponse.json({ error: 'Missing city or lat/lng' }, { status: 400 })
  }

  // Find matching GBFS system
  const systemUrl = city
    ? SYSTEMS[city] || Object.entries(SYSTEMS).find(([k]) => city.includes(k))?.[1]
    : null

  if (!systemUrl) {
    return NextResponse.json({ available: false, message: 'No bike share system found for this city', stations: [] })
  }

  try {
    const stationInfoUrl = await findStationInfoUrl(systemUrl)
    if (!stationInfoUrl) {
      return NextResponse.json({ available: false, message: 'Could not load station data', stations: [] })
    }

    const res = await fetch(stationInfoUrl, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('Station info fetch failed')

    const data = await res.json()
    let stations = (data?.data?.stations || []).map((s: any) => ({
      id: s.station_id,
      name: s.name,
      lat: s.lat,
      lng: s.lon,
      capacity: s.capacity || null,
      address: s.address || null,
    }))

    // If we have lat/lng, sort by distance and limit
    if (lat && lng) {
      stations = stations
        .map((s: any) => ({
          ...s,
          distance: Math.sqrt((s.lat - lat) ** 2 + (s.lng - lng) ** 2) * 111, // rough km
        }))
        .sort((a: any, b: any) => a.distance - b.distance)
        .slice(0, limit)
    } else {
      stations = stations.slice(0, limit)
    }

    return NextResponse.json({ available: true, system: city, stations })
  } catch {
    return NextResponse.json({ error: 'Bike share service unavailable' }, { status: 500 })
  }
}
