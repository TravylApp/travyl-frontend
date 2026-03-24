import { NextRequest, NextResponse } from 'next/server'

// OpenChargeMap — EV charging stations worldwide
// Free, unlimited, no API key required (optional key for higher limits)
// Docs: https://openchargemap.org/site/develop/api

const BASE = 'https://api.openchargemap.io/v3/poi'
const API_KEY = process.env.OPENCHARGE_API_KEY || '' // optional

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const lat = sp.get('lat')
  const lng = sp.get('lng')
  const radius = sp.get('radius') || '10' // km
  const limit = parseInt(sp.get('limit') || '10', 10)

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 })
  }

  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      distance: radius,
      distanceunit: 'KM',
      maxresults: String(limit),
      compact: 'true',
      verbose: 'false',
    })
    if (API_KEY) params.set('key', API_KEY)

    const res = await fetch(`${BASE}?${params}`, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('OpenChargeMap fetch failed')

    const data = await res.json()
    const stations = (data || []).map((s: any) => ({
      id: String(s.ID),
      name: s.AddressInfo?.Title || 'Charging Station',
      address: s.AddressInfo?.AddressLine1 || '',
      city: s.AddressInfo?.Town || '',
      lat: s.AddressInfo?.Latitude,
      lng: s.AddressInfo?.Longitude,
      distance: s.AddressInfo?.Distance,
      connectors: (s.Connections || []).map((c: any) => ({
        type: c.ConnectionType?.Title || 'Unknown',
        power: c.PowerKW,
        quantity: c.Quantity,
      })),
      operator: s.OperatorInfo?.Title || null,
      usageCost: s.UsageCost || null,
      isOperational: s.StatusType?.IsOperational ?? true,
    }))

    return NextResponse.json(stations)
  } catch {
    return NextResponse.json({ error: 'Charging station service unavailable' }, { status: 500 })
  }
}
