import { rateLimit } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'

const GEONAMES_USER = process.env.GEONAMES_USERNAME || 'demo'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }

  try {
    // Geonames findNearbyAirports — free, no API key needed (just username)
    const url = `https://api.geonames.org/findNearByWeatherJSON?lat=${lat}&lng=${lng}&username=${GEONAMES_USER}`

    // Try Geonames nearby search for airports
    const searchUrl = `https://api.geonames.org/searchJSON?q=airport&lat=${lat}&lng=${lng}&radius=200&maxRows=5&featureCode=AIRP&style=FULL&orderby=distance&username=${GEONAMES_USER}`
    const res = await fetch(searchUrl, { next: { revalidate: 86400 } })

    if (res.ok) {
      const data = await res.json()
      const airports = (data.geonames ?? []) as any[]

      if (airports.length > 0) {
        const nearest = airports[0]
        // Extract IATA from airport name or use first 3 chars of the name
        const iata = extractIata(nearest.name) || nearest.name?.substring(0, 3).toUpperCase()
        return NextResponse.json({
          iata,
          name: nearest.name,
          city: nearest.adminName1,
          lat: parseFloat(nearest.lat),
          lng: parseFloat(nearest.lng),
        })
      }
    }

    // Fallback: reverse geocode to get city, then search Duffel
    const duffelToken = process.env.DUFFEL_API_TOKEN
    if (duffelToken) {
      // Get city name from Geonames reverse geocode
      const reverseUrl = `https://api.geonames.org/findNearbyPlaceNameJSON?lat=${lat}&lng=${lng}&maxRows=1&style=SHORT&username=${GEONAMES_USER}`
      const reverseRes = await fetch(reverseUrl, { next: { revalidate: 86400 } })

      if (reverseRes.ok) {
        const reverseData = await reverseRes.json()
        const cityName = reverseData.geonames?.[0]?.name

        if (cityName) {
          const duffelRes = await fetch(
            `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(cityName)}&types[]=airport`,
            {
  const rl = rateLimit(req, 'airports-nearest', 60, 60000)
  if (rl) return rl
              headers: {
                Authorization: `Bearer ${duffelToken}`,
                'Duffel-Version': 'v2',
                Accept: 'application/json',
              },
            }
          )

          if (duffelRes.ok) {
            const duffelData = await duffelRes.json()
            const airport = (duffelData.data ?? []).find((p: any) => p.iata_code)
            if (airport) {
              return NextResponse.json({
                iata: airport.iata_code,
                name: airport.name,
                city: airport.city_name ?? cityName,
              })
            }
          }
        }
      }
    }

    return NextResponse.json({ iata: null, name: null })
  } catch {
    return NextResponse.json({ iata: null, name: null })
  }
}

/** Extract IATA code from airport names like "Los Angeles International Airport (LAX)" */
function extractIata(name: string): string | null {
  const match = name?.match(/\(([A-Z]{3})\)/)
  return match ? match[1] : null
}
