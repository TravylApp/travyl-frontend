import { NextRequest, NextResponse } from 'next/server'
import {
  BACKEND_URL,
  fetchExternal,
  getRequiredParams,
  getOptionalParam,
  errorResponse,
  CACHE_1H,
} from '@/lib/api-utils'

interface BackendPlace {
  id: string
  name: string
  latitude?: number
  longitude?: number
  lat?: number
  lng?: number
  address?: string
  category?: string
  subcategory?: string
  rating?: number
  review_count?: number
  price_level?: string
  photo_url?: string
  photos?: string[]
  website?: string
  hours?: string
  description?: string
}

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'lat', 'lng')
  if (params instanceof NextResponse) return params

  const category = getOptionalParam(req, 'category', 'attraction')
  const limit = getOptionalParam(req, 'limit', '10')

  if (!BACKEND_URL) {
    return errorResponse('Backend URL not configured', 503)
  }

  try {
    const url = new URL('/api/places/nearby', BACKEND_URL)
    url.searchParams.set('lat', params.lat)
    url.searchParams.set('lng', params.lng)
    url.searchParams.set('category', category)
    url.searchParams.set('limit', limit)

    const data = await fetchExternal<BackendPlace[]>(url.toString(), {
      ...CACHE_1H,
      fallback: [],
    })

    const venues = data.map((place) => {
      const lat = place.latitude ?? place.lat ?? 0
      const lng = place.longitude ?? place.lng ?? 0
      const mainPhoto = place.photo_url || null
      const images = place.photos?.length
        ? place.photos
        : mainPhoto
          ? [mainPhoto]
          : []

      return {
        id: place.id,
        name: place.name,
        lat,
        lng,
        address: place.address ?? '',
        category: place.subcategory ?? place.category ?? category,
        rating: place.rating ?? undefined,
        ratingCount: place.review_count ?? undefined,
        price: place.price_level ?? undefined,
        image: mainPhoto,
        images,
        url: place.website ?? undefined,
        hours: place.hours ?? undefined,
        tip: place.description ?? undefined,
      }
    })

    return NextResponse.json(venues)
  } catch {
    return errorResponse('Places service unavailable', 500)
  }
}
