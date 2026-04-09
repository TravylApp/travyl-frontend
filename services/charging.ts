import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'
import { validateQueryParams } from './lib/validation'

const OCM_URL = 'https://api.openchargemap.io/v3/poi'

interface ChargingStation {
  id: string
  name: string
  operator: string | null
  address: string
  city: string
  state: string | null
  country: string
  latitude: number
  longitude: number
  connections: ChargingConnection[]
  isOperational: boolean
  usageType: string | null
  distance: number
}

interface ChargingConnection {
  type: string
  powerKW: number | null
  currentType: string | null
  voltage: number | null
  quantity: number
}

interface ChargingResponse {
  stations: ChargingStation[]
  total: number
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const { lat, lng, radius = '10' } = event.queryStringParameters ?? {}

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

    const rad = parseFloat(radius)
    if (isNaN(rad) || rad < 1 || rad > 100) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Radius must be 1-100 km' }) }
    }

    const apiKey = Resource.OpenchargeApiKey.value
    // OpenChargeMap works without key but has rate limits
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (apiKey && apiKey !== 'placeholder') {
      headers['X-API-Key'] = apiKey
    }

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      distance: String(rad),
      distanceunit: 'KM',
      maxresults: '20',
      compact: 'true',
      verbose: 'false',
    })

    const res = await fetch(`${OCM_URL}?${params}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.error('[charging] OCM error:', res.status, await res.text().catch(() => ''))
      return { statusCode: 502, body: JSON.stringify({ error: 'Charging station lookup failed' }) }
    }

    const data = await res.json()

    const stations: ChargingStation[] = data.map((p: any) => {
      const addr = p.AddressInfo || {}
      const status = p.StatusType || {}
      const connections = p.Connections || []

      return {
        id: String(p.ID),
        name: addr.Title || 'Unknown Station',
        operator: p.OperatorInfo?.Title || null,
        address: addr.AddressLine1 || '',
        city: addr.Town || '',
        state: addr.StateOrProvince || null,
        country: addr.Country?.ISOCode || '',
        latitude: addr.Latitude,
        longitude: addr.Longitude,
        connections: connections.map((c: any) => ({
          type: c.ConnectionType?.Title || 'Unknown',
          powerKW: c.PowerKW || null,
          currentType: c.CurrentType?.Title || null,
          voltage: c.Voltage || null,
          quantity: c.Quantity || 1,
        })),
        isOperational: status.IsOperational !== false,
        usageType: p.UsageType?.Title || null,
        distance: addr.Distance,
      }
    })

    const response: ChargingResponse = { stations, total: stations.length }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Charging station lookup timeout' }) }
    }
    console.error('[charging] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}