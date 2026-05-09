import { NextRequest, NextResponse } from 'next/server'
import {
  BACKEND_URL,
  fetchExternal,
  errorResponse,
  CACHE_1H,
rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { upscaleGoogleImage, z } from '@travyl/shared'

const tripadvisorQuerySchema = z.object({
  lat: z.string().optional(),
  lng: z.string().optional(),
  q: z.string().max(200).optional(),
  category: z.string().max(50).default('restaurants'),
  limit: z.string().regex(/^\d+$/).default('8'),
}).refine((q) => q.lat || q.q, { message: 'Provide lat or q' })

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
  const rl = rateLimit(req, 'tripadvisor', 20, 60000)
  if (rl) return rl
  const parsed = parseQuery(req, tripadvisorQuerySchema)
  if (!parsed.ok) return parsed.response
  const { lat, lng, category, limit } = parsed.data

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
      const mainPhoto = upscaleGoogleImage(place.photo_url) ?? place.photo_url ?? null
      const images = place.photos?.length
        ? place.photos.map((p: string) => upscaleGoogleImage(p) ?? p)
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
