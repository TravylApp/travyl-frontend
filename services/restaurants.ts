import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'
import { validateQueryParams } from './lib/validation'

const BASE_URL = 'https://platform.otgw.ot.tools/restaurants/v1'
const AFFILIATE_BASE = 'https://www.opentable.com'

interface OTRestaurant {
  restaurantId: number
  name: string
  latitude: number
  longitude: number
  profileLink: string
  cuisine?: string
  priceBand?: number // 1-4 ($ to $$$$)
  rating?: number
  reviewCount?: number
  images?: string[]
}

interface Restaurant {
  id: string
  name: string
  cuisine?: string
  priceLevel: number | null // 1-4
  rating: number | null
  reviewCount: number | null
  latitude: number
  longitude: number
  bookingUrl: string
  affiliateUrl: string
  images: string[]
}

interface RestaurantsResponse {
  restaurants: Restaurant[]
  total: number
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const { lat, lng, radius = '5', cuisine, price } = event.queryStringParameters ?? {}

    const paramsValid = validateQueryParams(
      { lat, lng },
      ['lat', 'lng']
    )
    if (!paramsValid.success) {
      return paramsValid.error
    }

    const apiKey = Resource.OpenTableAffiliateKey.value
    if (!apiKey || apiKey === 'placeholder') {
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'Restaurant search unavailable - API key not configured' })
      }
    }

    const params = new URLSearchParams({
      latitude: lat!,
      longitude: lng!,
      radius: radius || '5',
      size: '20',
    })

    if (cuisine) {
      params.set('cuisine', cuisine)
    }
    if (price) {
      params.set('priceBand', price)
    }

    const res = await fetch(`${BASE_URL}?${params}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error('[restaurants] OpenTable error:', res.status, await res.text().catch(() => ''))
      return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch restaurants' }) }
    }

    const data = await res.json()
    const rawRestaurants: OTRestaurant[] = data.restaurants ?? []

    const restaurants: Restaurant[] = rawRestaurants.map((r) => {
      const bookingUrl = `${AFFILIATE_BASE}${r.profileLink}`
      const affiliateUrl = `${bookingUrl}${bookingUrl.includes('?') ? '&' : '?'}ref=travyl`

      return {
        id: String(r.restaurantId),
        name: r.name,
        cuisine: r.cuisine,
        priceLevel: r.priceBand ?? null,
        rating: r.rating ?? null,
        reviewCount: r.reviewCount ?? null,
        latitude: r.latitude,
        longitude: r.longitude,
        bookingUrl,
        affiliateUrl,
        images: r.images ?? [],
      }
    })

    const response: RestaurantsResponse = { restaurants, total: restaurants.length }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Restaurant search timeout' }) }
    }
    console.error('[restaurants] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}