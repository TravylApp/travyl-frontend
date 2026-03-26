import { NextRequest, NextResponse } from 'next/server'
import { getRequiredParams, errorResponse, CACHE_1H } from '@/lib/api-utils'

type AqiLevel =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous'

interface AqiResponse {
  aqi: number
  level: AqiLevel
  pm25: number
  pm10: number
}

function getUsAqiLevel(aqi: number): AqiLevel {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy for Sensitive'
  if (aqi <= 200) return 'Unhealthy'
  if (aqi <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'lat', 'lon')
  if (params instanceof NextResponse) return params

  const latitude = parseFloat(params.lat)
  const longitude = parseFloat(params.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return errorResponse('Invalid lat or lon values', 400)
  }

  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm10,pm2_5`,
      CACHE_1H,
    )

    if (!res.ok) return errorResponse('Air quality fetch failed', res.status)

    const data = await res.json()
    const aqi = data.current?.us_aqi ?? 0
    const pm25 = data.current?.pm2_5 ?? 0
    const pm10 = data.current?.pm10 ?? 0

    return NextResponse.json<AqiResponse>({ aqi, level: getUsAqiLevel(aqi), pm25, pm10 })
  } catch {
    return errorResponse('Air quality service unavailable', 500)
  }
}
