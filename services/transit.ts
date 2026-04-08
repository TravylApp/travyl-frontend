import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'
import { validateQueryParams } from './lib/validation'

const GRAPHHOPPER_URL = 'https://graphhopper.com/api/1/route'

interface RouteInstruction {
  text: string
  distance: number
  time: number
  streetName: string
  sign: number
  exitNumber?: string
}

interface TransitRoute {
  distance: number
  duration: number
  ascent: number
  descent: number
  points: Array<{ lat: number; lng: number }>
  instructions: RouteInstruction[]
  vehicle?: string
}

interface TransitResponse {
  routes: TransitRoute[]
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const { originLat, originLng, destLat, destLng, vehicle = 'car' } = event.queryStringParameters ?? {}

    const paramsValid = validateQueryParams(
      { originLat, originLng, destLat, destLng },
      ['originLat', 'originLng', 'destLat', 'destLng']
    )
    if (!paramsValid.success) {
      return paramsValid.error
    }

    const olat = parseFloat(originLat!)
    const olng = parseFloat(originLng!)
    const dlat = parseFloat(destLat!)
    const dlng = parseFloat(destLng!)

    if ([olat, olng, dlat, dlng].some(c => isNaN(c))) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid coordinates' }) }
    }

    const validVehicles = ['car', 'foot', 'bike', 'mtb', 'racingbike', 'scooter', 'truck']
    if (!validVehicles.includes(vehicle)) {
      return { statusCode: 400, body: JSON.stringify({ error: `Vehicle must be: ${validVehicles.join(', ')}` }) }
    }

    const apiKey = Resource.GraphhopperApiKey.value
    if (!apiKey || apiKey === 'placeholder') {
      return { statusCode: 503, body: JSON.stringify({ error: 'Transit directions unavailable - API key not configured' }) }
    }

    const params = new URLSearchParams({
      point: [`${olat},${olng}`, `${dlat},${dlng}`],
      vehicle,
      locale: 'en',
      instructions: 'true',
      calc_points: 'true',
      points_encoded: 'false',
      key: apiKey,
    })

    const url = `${GRAPHHOPPER_URL}?${params.toString().replace(/point=/g, '&point=').replace('&', '')}`

    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error('[transit] GraphHopper error:', res.status, err)
      return { statusCode: 502, body: JSON.stringify({ error: 'Routing service unavailable' }) }
    }

    const data = await res.json()

    if (!data.paths || data.paths.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No route found' }) }
    }

    const routes: TransitRoute[] = data.paths.map((path: any) => ({
      distance: path.distance,
      duration: path.time,
      ascent: path.ascend,
      descent: path.descend,
      points: path.points?.coordinates?.map((c: number[]) => ({ lat: c[1], lng: c[0] })) ?? [],
      instructions: path.instructions?.map((i: any) => ({
        text: i.text,
        distance: i.distance,
        time: i.time,
        streetName: i.street_name,
        sign: i.sign,
        exitNumber: i.exit_number,
      })) ?? [],
      vehicle,
    }))

    const response: TransitResponse = {
      routes,
      origin: { lat: olat, lng: olng },
      destination: { lat: dlat, lng: dlng },
    }

    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Routing timeout' }) }
    }
    console.error('[transit] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}