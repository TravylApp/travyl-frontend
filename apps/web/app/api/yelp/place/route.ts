import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const SERPAPI_KEY = process.env.SERPAPI_KEY

const yelpPlaceQuerySchema = z.object({
  q: z.string().min(1).max(200),
  location: z.string().max(200).optional(),
})

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'yelp-place', 20, 60_000)
  if (blocked) return blocked

  const parsed = parseQuery(req, yelpPlaceQuerySchema)
  if (!parsed.ok) return parsed.response
  const { q, location } = parsed.data
  if (!SERPAPI_KEY) {
    return NextResponse.json({ photos: [], tags: [], reviews: [] })
  }

  try {
    const params = new URLSearchParams({
      engine: 'yelp',
      find_desc: q,
      api_key: SERPAPI_KEY,
    })
    if (location) params.set('find_loc', location)

    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ photos: [], tags: [], reviews: [] })
    }

    const data = await res.json()
    const results = data.organic_results ?? []
    const place = results[0]

    if (!place) {
      return NextResponse.json({ photos: [], tags: [], reviews: [] })
    }

    return NextResponse.json({
      name: place.title ?? q,
      rating: place.rating ?? 0,
      reviewCount: place.reviews ?? 0,
      priceRange: place.price ?? '',
      categories: (place.categories ?? []).map((c: any) =>
        typeof c === 'string' ? c : c.title ?? ''
      ),
      photos: [place.thumbnail, ...(place.photos ?? [])].filter(Boolean).slice(0, 8),
      tags: [
        ...(place.categories ?? []).map((c: any) => typeof c === 'string' ? c : c.title ?? ''),
        ...(place.highlights ?? []),
      ].filter(Boolean),
      snippet: place.snippet ?? '',
      neighborhood: place.neighborhood ?? '',
      address: place.address ?? '',
      phone: place.phone ?? '',
      yelpUrl: place.link ?? '',
      source: 'yelp',
    })
  } catch {
    return NextResponse.json({ photos: [], tags: [], reviews: [] })
  }
}
