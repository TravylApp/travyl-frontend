import { NextRequest, NextResponse } from 'next/server'
import {
  BACKEND_URL,
  fetchExternal,
  errorResponse,
  CACHE_1H,
rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { upscaleGoogleImage, z } from '@travyl/shared'

const foursquareQuerySchema = z.object({
  lat: z.string().regex(/^-?\d+(\.\d+)?$/),
  lng: z.string().regex(/^-?\d+(\.\d+)?$/),
  category: z.string().max(50).default('attraction'),
  limit: z.string().regex(/^\d+$/).default('10'),
})

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
  const rl = rateLimit(req, 'foursquare', 30, 60000)
  if (rl) return rl
  const parsed = parseQuery(req, foursquareQuerySchema)
  if (!parsed.ok) return parsed.response
  const { lat, lng, category, limit } = parsed.data
  const params = { lat, lng }

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
      const mainPhoto = upscaleGoogleImage(place.photo_url) ?? place.photo_url ?? null
      const images = place.photos?.length
        ? place.photos.map((p: string) => upscaleGoogleImage(p) ?? p)
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
