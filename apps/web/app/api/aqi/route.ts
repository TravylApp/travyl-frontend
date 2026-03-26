import { NextRequest, NextResponse } from 'next/server'

type AqiLevel =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous'

function getUsAqiLevel(aqi: number): AqiLevel {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy for Sensitive'
  if (aqi <= 200) return 'Unhealthy'
  if (aqi <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lon = req.nextUrl.searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat and lon parameters' }, { status: 400 })
  }

  const latitude = parseFloat(lat)
  const longitude = parseFloat(lon)

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json({ error: 'Invalid lat or lon values' }, { status: 400 })
  }

  try {
    // Use Open-Meteo Air Quality API (free, no key required)
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm10,pm2_5`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Air quality fetch failed' }, { status: res.status })
    }

    const data = await res.json()

    const aqi = data.current?.us_aqi ?? 0
    const pm25 = data.current?.pm2_5 ?? 0
    const pm10 = data.current?.pm10 ?? 0

    return NextResponse.json({
      aqi,
      level: getUsAqiLevel(aqi),
      pm25,
      pm10,
    })
  } catch {
    return NextResponse.json({ error: 'Air quality service unavailable' }, { status: 500 })
  }
}
