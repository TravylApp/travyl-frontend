import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'
import { validateQueryParams } from './lib/validation'

const FOURSQUARE_URL = 'https://api.foursquare.com/v3/places/search'

interface Place {
  id: string
  name: string
  category: string
  distance: number
  latitude: number
  longitude: number
  address: string
  city: string
  rating?: number
  photos: string[]
}

interface PlacesResponse {
  places: Place[]
  total: number
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const { lat, lng, radius = '1000', category, limit = '20' } = event.queryStringParameters ?? {}

    const paramsValid = validateQueryParams({ lat, lng }, ['lat', 'lng'])
    if (!paramsValid.success) {
      return paramsValid.error
    }

    const latitude = parseFloat(lat!)
    const longitude = parseFloat(lng!)

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid latitude' }) }
    }
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid longitude' }) }
    }

    const rad = parseInt(radius, 10)
    if (isNaN(rad) || rad < 100 || rad > 100000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Radius must be 100-100000 meters' }) }
    }

    const lim = parseInt(limit, 10)
    if (isNaN(lim) || lim < 1 || lim > 50) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Limit must be 1-50' }) }
    }

    const apiKey = Resource.FoursquareApiKey.value
    if (!apiKey || apiKey === 'placeholder') {
      return { statusCode: 503, body: JSON.stringify({ error: 'Places search unavailable' }) }
    }

    const params = new URLSearchParams({
      ll: `${latitude},${longitude}`,
      radius: String(rad),
      limit: String(lim),
      sort: 'DISTANCE',
    })

    if (category) {
      params.set('categories', category)
    }

    const res = await fetch(`${FOURSQUARE_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
        Authorization: apiKey,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error('[places] Foursquare error:', res.status)
      return { statusCode: 502, body: JSON.stringify({ error: 'Places search failed' }) }
    }

    const data = await res.json()

    const places: Place[] = (data.results || []).map((p: any) => ({
      id: p.fsq_id,
      name: p.name,
      category: p.categories?.[0]?.name || 'Unknown',
      distance: p.distance,
      latitude: p.geocodes?.main?.latitude,
      longitude: p.geocodes?.main?.longitude,
      address: p.location?.address || '',
      city: p.location?.locality || '',
      rating: p.rating ? p.rating / 2 : undefined, // Foursquare uses 0-10, convert to 0-5
      photos: [], // Would need separate API call for photos
    }))

    const response: PlacesResponse = { places, total: places.length }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Places search timeout' }) }
    }
    console.error('[places] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}