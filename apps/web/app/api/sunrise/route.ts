import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  const date =
    req.nextUrl.searchParams.get('date') ??
    new Date().toISOString().split('T')[0]

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing lat or lng parameter' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&date=${encodeURIComponent(date)}&formatted=0`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Sunrise-sunset fetch failed' },
        { status: res.status }
      )
    }

    const data = await res.json()

    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: `Sunrise-sunset API returned status: ${data.status}` },
        { status: 502 }
      )
    }

    const results = data.results
    const sunsetDate = new Date(results.sunset)
    const goldenHour = new Date(sunsetDate.getTime() - 60 * 60 * 1000)

    return NextResponse.json({
      sunrise: results.sunrise,
      sunset: results.sunset,
      golden_hour: goldenHour.toISOString(),
      day_length: String(results.day_length),
      solar_noon: results.solar_noon,
    })
  } catch {
    return NextResponse.json(
      { error: 'Sunrise-sunset service unavailable' },
      { status: 500 }
    )
  }
}
