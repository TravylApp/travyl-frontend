import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'
import { validateQueryParams, safeParseBody } from './lib/validation'

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

// ─── POST /transit/optimize-route ─────────────────────────────

interface OptimizeRequest {
  waypoints: Array<{ lat: number; lng: number; name?: string }>
  vehicle?: string
  optimize?: boolean
}

interface OptimizedRoute {
  optimizedOrder: number[]
  totalDistance: number
  totalDuration: number
  legs: TransitRoute[]
}

export const optimizeHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const parseResult = safeParseBody<OptimizeRequest>(event)
    if (!parseResult.success) {
      return parseResult.error
    }

    const { waypoints, vehicle = 'car', optimize = true } = parseResult.data

    if (!waypoints || waypoints.length < 2) {
      return { statusCode: 400, body: JSON.stringify({ error: 'At least 2 waypoints required' }) }
    }
    if (waypoints.length > 20) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Maximum 20 waypoints allowed' }) }
    }

    const validVehicles = ['car', 'foot', 'bike', 'mtb', 'racingbike', 'scooter']
    if (!validVehicles.includes(vehicle)) {
      return { statusCode: 400, body: JSON.stringify({ error: `Vehicle must be: ${validVehicles.join(', ')}` }) }
    }

    const apiKey = Resource.GraphhopperApiKey.value
    if (!apiKey || apiKey === 'placeholder') {
      return { statusCode: 503, body: JSON.stringify({ error: 'Route optimization unavailable' }) }
    }

    // Build points string for GraphHopper
    const points = waypoints.map(w => `${w.lat},${w.lng}`).join('&point=')

    const params = new URLSearchParams({
      vehicle,
      locale: 'en',
      instructions: 'true',
      calc_points: 'true',
      points_encoded: 'false',
      'ch.disable': optimize ? 'true' : 'false',
      optimize: optimize ? 'true' : 'false',
      key: apiKey,
    })

    const url = `https://graphhopper.com/api/1/route?point=${points}&${params.toString()}`

    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      console.error('[transit/optimize] GraphHopper error:', res.status, err)
      return { statusCode: 502, body: JSON.stringify({ error: 'Route optimization failed' }) }
    }

    const data = await res.json()

    if (!data.paths || data.paths.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No valid route found' }) }
    }

    const bestPath = data.paths[0]

    // Extract leg information from instructions if available
    const legs: TransitRoute[] = [{
      distance: bestPath.distance,
      duration: bestPath.time,
      ascent: bestPath.ascend,
      descent: bestPath.descend,
      points: bestPath.points?.coordinates?.map((c: number[]) => ({ lat: c[1], lng: c[0] })) ?? [],
      instructions: bestPath.instructions?.map((i: any) => ({
        text: i.text,
        distance: i.distance,
        time: i.time,
        streetName: i.street_name,
        sign: i.sign,
        exitNumber: i.exit_number,
      })) ?? [],
      vehicle,
    }]

    const response: OptimizedRoute = {
      optimizedOrder: data.waypoint_order || waypoints.map((_, i) => i),
      totalDistance: bestPath.distance,
      totalDuration: bestPath.time,
      legs,
    }

    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Route optimization timeout' }) }
    }
    console.error('[transit/optimize] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}