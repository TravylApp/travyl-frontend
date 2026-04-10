import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { validateQueryParams } from './lib/validation'

const GEO_TZ_URL = 'https://api.geo-tz.com/v1/timezone'

interface TimezoneInfo {
  timezone: string
  offset: string
  offsetSeconds: number
  currentTime: string
  currentDate: string
  isDST: boolean
  dstOffset?: number
}

interface TimezoneResponse {
  location: {
    latitude: number
    longitude: number
  }
  timezone: TimezoneInfo
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const { lat, lng } = event.queryStringParameters ?? {}

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

    // Use geo-tz API (free, no key required)
    const res = await fetch(`${GEO_TZ_URL}?lat=${latitude}&lng=${longitude}`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error('[timezone] geo-tz error:', res.status)
      return { statusCode: 502, body: JSON.stringify({ error: 'Timezone lookup failed' }) }
    }

    const data = await res.json()
    const tzName = data.timezone

    if (!tzName) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Timezone not found for coordinates' }) }
    }

    // Get current time in that timezone using native Intl API
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tzName,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'shortOffset',
    })

    const parts = formatter.formatToParts(now)
    const getPart = (type: string) => parts.find(p => p.type === type)?.value

    // Parse offset from GMT (e.g., "GMT-5" -> -5 hours)
    const tzNamePart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+0'
    const offsetMatch = tzNamePart.match(/GMT([+-]\d+)/)
    const offsetHours = offsetMatch ? parseInt(offsetMatch[1]) : 0
    const offsetSeconds = offsetHours * 3600

    // Check if DST is active by comparing January and July offsets
    const janDate = new Date(now.getFullYear(), 0, 1)
    const julDate = new Date(now.getFullYear(), 6, 1)
    const janOffset = new Intl.DateTimeFormat('en-US', { timeZone: tzName, timeZoneName: 'shortOffset' }).formatToParts(janDate).find(p => p.type === 'timeZoneName')?.value
    const julOffset = new Intl.DateTimeFormat('en-US', { timeZone: tzName, timeZoneName: 'shortOffset' }).formatToParts(julDate).find(p => p.type === 'timeZoneName')?.value
    const isDST = janOffset !== julOffset && tzNamePart !== janOffset

    const response: TimezoneResponse = {
      location: { latitude, longitude },
      timezone: {
        timezone: tzName,
        offset: `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`,
        offsetSeconds,
        currentTime: `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`,
        currentDate: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
        isDST,
        dstOffset: isDST ? offsetSeconds : undefined,
      },
    }

    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Timezone lookup timeout' }) }
    }
    console.error('[timezone] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}