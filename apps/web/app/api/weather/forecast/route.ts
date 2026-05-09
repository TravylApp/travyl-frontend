import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const forecastQuerySchema = z.object({
  location: z.string().min(1).max(200),
  days: z.coerce.number().int().min(1).max(16).default(7),
})

// WMO Weather codes → description
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  56: 'Freezing drizzle', 57: 'Heavy freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  66: 'Freezing rain', 67: 'Heavy freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Severe thunderstorm',
}

// WMO codes → simple icon name
function weatherIcon(code: number): string {
  if (code === 0) return 'sun'
  if (code <= 3) return code === 3 ? 'cloud' : 'cloud-sun'
  if (code <= 48) return 'fog'
  if (code <= 57) return 'drizzle'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'shower'
  return 'thunder'
}

async function geocode(location: string): Promise<{ lat: number; lng: number; name: string; timezone: string } | null> {
  // Already lat,lng?
  const match = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/)
  if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]), name: location, timezone: 'auto' }

  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
    { signal: AbortSignal.timeout(5000) },
  )
  if (!res.ok) return null
  const data = await res.json()
  const r = data.results?.[0]
  if (!r) return null
  return { lat: r.latitude, lng: r.longitude, name: r.name, timezone: r.timezone || 'auto' }
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'weather-forecast', 60, 60000)
  if (rl) return rl

  const parsed = parseQuery(req, forecastQuerySchema)
  if (!parsed.ok) return parsed.response
  const { location, days } = parsed.data

  try {
    const geo = await geocode(location)
    if (!geo) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset` +
      `&daily=wind_speed_10m_max` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&timezone=${encodeURIComponent(geo.timezone)}&forecast_days=${days}`,
      { signal: AbortSignal.timeout(10000) },
    )

    if (!forecastRes.ok) {
      return NextResponse.json({ error: 'Forecast unavailable' }, { status: 502 })
    }

    const data = await forecastRes.json()

    const forecast = (data.daily?.time ?? []).map((_: string, i: number) => ({
      date: data.daily.time[i],
      high: data.daily.temperature_2m_max?.[i] ?? 0,
      low: data.daily.temperature_2m_min?.[i] ?? 0,
      conditions: WEATHER_CODES[data.daily.weather_code?.[i]] ?? 'Unknown',
      icon: weatherIcon(data.daily.weather_code?.[i] ?? 0),
      precipprob: (data.daily.precipitation_sum?.[i] ?? 0) > 0 ? 100 : 0,
      sunrise: data.daily.sunrise?.[i] ?? '',
      sunset: data.daily.sunset?.[i] ?? '',
    }))

    const currentCode = data.current?.weather_code ?? 0

    return NextResponse.json({
      location: geo.name,
      timezone: geo.timezone,
      current: {
        temp: data.current?.temperature_2m ?? 0,
        feelslike: data.current?.apparent_temperature ?? 0,
        conditions: WEATHER_CODES[currentCode] ?? 'Unknown',
        icon: weatherIcon(currentCode),
        humidity: data.current?.relative_humidity_2m ?? 0,
        windspeed: data.current?.wind_speed_10m ?? 0,
      },
      forecast,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 502 })
  }
}
