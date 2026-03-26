import { NextRequest, NextResponse } from 'next/server'
import {
  BACKEND_URL,
  fetchExternal,
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
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  const category = getOptionalParam(req, 'category', 'restaurants')
  const limit = getOptionalParam(req, 'limit', '8')

  if (!lat && !req.nextUrl.searchParams.get('q')) {
    return errorResponse('Missing q or lat/lng', 400)
  }

  if (!BACKEND_URL) {
    return errorResponse('Backend URL not configured', 503)
  }

  try {
    const url = new URL('/api/places/nearby', BACKEND_URL)
    if (lat) url.searchParams.set('lat', lat)
    if (lng) url.searchParams.set('lng', lng ?? '0')
    url.searchParams.set('category', category)
    url.searchParams.set('limit', limit)

    const data = await fetchExternal<BackendPlace[]>(url.toString(), {
      ...CACHE_1H,
      fallback: [],
    })

    const results = data.map((place) => {
      const placeLat = place.latitude ?? place.lat ?? 0
      const placeLng = place.longitude ?? place.lng ?? 0
      const mainPhoto = place.photo_url || null
      const images = place.photos?.length
        ? place.photos
        : mainPhoto
          ? [mainPhoto]
          : []

      return {
        id: place.id,
        name: place.name,
        lat: placeLat,
        lng: placeLng,
        address: place.address ?? '',
        category: place.subcategory ?? place.category ?? category,
        cuisines: place.subcategory ? [place.subcategory] : [],
        rating: place.rating ?? 0,
        reviewCount: place.review_count ?? 0,
        priceLevel: place.price_level ?? '',
        image: mainPhoto,
        images,
        tip: place.description ?? '',
        source: 'tripadvisor' as const,
      }
    })

    return NextResponse.json(results)
  } catch {
    return errorResponse('Places service unavailable', 500)
  }
}
