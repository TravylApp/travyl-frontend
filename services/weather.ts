import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { validateQueryParams, isValidDate } from './lib/validation'

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

interface DailyWeather {
  date: string
  maxTemp: number
  minTemp: number
  avgTemp: number
  maxWind: number
  windDirection: number
  precipitation: number
  precipitationHours: number
  weatherCode: number
  weatherDescription: string
  sunrise: string
  sunset: string
  uvIndex: number
}

interface WeatherResponse {
  location: {
    latitude: number
    longitude: number
    timezone: string
    elevation: number
  }
  daily: DailyWeather[]
}

// WMO Weather interpretation codes
const weatherCodes: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  66: 'Light freezing rain', 67: 'Heavy freezing rain',
  71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Slight thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const { lat, lng, days = '7' } = event.queryStringParameters ?? {}

    const paramsValid = validateQueryParams({ lat, lng }, ['lat', 'lng'])
    if (!paramsValid.success) {
      return paramsValid.error
    }

    const latitude = parseFloat(lat!)
    const longitude = parseFloat(lng!)

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid latitude (-90 to 90)' }) }
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid longitude (-180 to 180)' }) }
    }

    const forecastDays = parseInt(days, 10)
    if (isNaN(forecastDays) || forecastDays < 1 || forecastDays > 16) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Days must be 1-16' }) }
    }

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,temperature_2m_mean,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max',
      timezone: 'auto',
      forecast_days: String(forecastDays),
    })

    const res = await fetch(`${OPEN_METEO_URL}?${params}`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.error('[weather] Open-Meteo error:', res.status, await res.text().catch(() => ''))
      return { statusCode: 502, body: JSON.stringify({ error: 'Weather service unavailable' }) }
    }

    const data = await res.json()

    const daily: DailyWeather[] = []
    const timeArray: string[] = data.daily?.time ?? []

    for (let i = 0; i < timeArray.length; i++) {
      const code = data.daily.weather_code?.[i] ?? 0
      daily.push({
        date: timeArray[i],
        maxTemp: data.daily.temperature_2m_max?.[i] ?? null,
        minTemp: data.daily.temperature_2m_min?.[i] ?? null,
        avgTemp: data.daily.temperature_2m_mean?.[i] ?? null,
        maxWind: data.daily.wind_speed_10m_max?.[i] ?? null,
        windDirection: data.daily.wind_direction_10m_dominant?.[i] ?? null,
        precipitation: data.daily.precipitation_sum?.[i] ?? 0,
        precipitationHours: data.daily.precipitation_hours?.[i] ?? 0,
        weatherCode: code,
        weatherDescription: weatherCodes[code] ?? 'Unknown',
        sunrise: data.daily.sunrise?.[i] ?? null,
        sunset: data.daily.sunset?.[i] ?? null,
        uvIndex: data.daily.uv_index_max?.[i] ?? null,
      })
    }

    const response: WeatherResponse = {
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        elevation: data.elevation,
      },
      daily,
    }

    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Weather service timeout' }) }
    }
    console.error('[weather] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}