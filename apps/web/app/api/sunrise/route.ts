import { NextRequest, NextResponse } from 'next/server'
import { getRequiredParams, getOptionalParam, errorResponse, CACHE_1H } from '@/lib/api-utils'

interface SunriseResponse {
  sunrise: string
  sunset: string
  golden_hour: string
  day_length: string
  solar_noon: string
}

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'lat', 'lng')
  if (params instanceof NextResponse) return params

  const date = getOptionalParam(req, 'date', new Date().toISOString().split('T')[0])

  try {
    const res = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${encodeURIComponent(params.lat)}&lng=${encodeURIComponent(params.lng)}&date=${encodeURIComponent(date)}&formatted=0`,
      CACHE_1H,
    )

    if (!res.ok) return errorResponse('Sunrise-sunset fetch failed', res.status)

    const data = await res.json()
    if (data.status !== 'OK') {
      return errorResponse(`Sunrise-sunset API returned status: ${data.status}`, 502)
    }

    const { results } = data
    const sunsetDate = new Date(results.sunset)
    const goldenHour = new Date(sunsetDate.getTime() - 60 * 60 * 1000)

    return NextResponse.json<SunriseResponse>({
      sunrise: results.sunrise,
      sunset: results.sunset,
      golden_hour: goldenHour.toISOString(),
      day_length: String(results.day_length),
      solar_noon: results.solar_noon,
    })
  } catch {
    return errorResponse('Sunrise-sunset service unavailable', 500)
  }
}
