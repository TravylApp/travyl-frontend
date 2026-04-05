import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'ta-place', 20, 60_000)
  if (blocked) return blocked

  const q = req.nextUrl.searchParams.get('q')
  const location = req.nextUrl.searchParams.get('location') // e.g. "Las Vegas"
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')

  if (!q) {
    return NextResponse.json({ error: 'Missing q param (place name)' }, { status: 400 })
  }
  if (!SERPAPI_KEY) {
    return NextResponse.json({ rankings: null, badges: [], reviews: [] })
  }

  try {
    // SerpAPI Google Maps engine — returns place details with ratings, photos, reviews
    const searchQuery = location ? `${q} ${location}` : q
    const params = new URLSearchParams({
      engine: 'google_maps',
      q: searchQuery,
      api_key: SERPAPI_KEY,
      hl: 'en',
      type: 'search',
    })
    if (lat && lng) params.set('ll', `@${lat},${lng},14z`)

    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ rankings: null, badges: [], reviews: [] })
    }

    const data = await res.json()
    const results = data.local_results ?? data.place_results ?? []
    const place = Array.isArray(results) ? results[0] : results

    if (!place) {
      return NextResponse.json({ rankings: null, badges: [], reviews: [] })
    }

    return NextResponse.json({
      name: place.title ?? place.name ?? q,
      rating: place.rating ?? 0,
      reviewCount: place.reviews ?? 0,
      priceLevel: place.price ?? '',
      type: place.type ?? '',
      address: place.address ?? '',
      phone: place.phone ?? '',
      website: place.website ?? '',
      hours: place.hours ?? place.operating_hours ?? null,
      photos: (place.photos ?? place.images ?? []).slice(0, 6).map((p: any) =>
        typeof p === 'string' ? p : p.image ?? p.thumbnail ?? ''
      ).filter(Boolean),
      badges: [
        place.type && `${place.type}`,
        place.price && `Price: ${place.price}`,
        place.service_options && Object.entries(place.service_options)
          .filter(([, v]) => v)
          .map(([k]) => k.replace(/_/g, ' '))
          .join(', '),
      ].filter(Boolean),
      reviews: (place.reviews_per_rating ?? []).length > 0
        ? Object.entries(place.reviews_per_rating ?? {}).map(([stars, count]) => ({
            stars: parseInt(stars),
            count: count as number,
          }))
        : [],
      source: 'google_maps',
    })
  } catch {
    return NextResponse.json({ rankings: null, badges: [], reviews: [] })
  }
}
