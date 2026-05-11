import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const SERPAPI_KEY = process.env.SERPAPI_KEY

const hotelReviewsQuerySchema = z.object({
  name: z.string().min(1).max(200),
  location: z.string().max(200).default(''),
})

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'hotel-reviews', 10, 60_000)
  if (blocked) return blocked

  const parsed = parseQuery(req, hotelReviewsQuerySchema)
  if (!parsed.ok) return parsed.response
  const { name, location } = parsed.data

  if (!SERPAPI_KEY) {
    return NextResponse.json({ reviews: [], total: 0 })
  }

  try {
    // Search Google Maps for the hotel to get its data_id
    const searchParams = new URLSearchParams({
      engine: 'google_maps',
      q: `${name} hotel ${location}`,
      type: 'search',
      api_key: SERPAPI_KEY,
    })

    const searchRes = await fetch(`https://serpapi.com/search.json?${searchParams}`)
    if (!searchRes.ok) return NextResponse.json({ reviews: [], total: 0 })

    const searchData = await searchRes.json()
    const place = searchData.local_results?.[0] ?? searchData.place_results
    const dataId = place?.data_id

    if (!dataId) {
      return NextResponse.json({ reviews: [], total: 0 })
    }

    // Fetch reviews using the data_id
    const reviewParams = new URLSearchParams({
      engine: 'google_maps_reviews',
      data_id: dataId,
      api_key: SERPAPI_KEY,
      hl: 'en',
    })

    const reviewRes = await fetch(`https://serpapi.com/search.json?${reviewParams}`)
    if (!reviewRes.ok) return NextResponse.json({ reviews: [], total: 0 })

    const reviewData = await reviewRes.json()
    const reviews = (reviewData.reviews ?? []).slice(0, 10).map((r: any) => ({
      author: r.user?.name ?? 'Guest',
      avatar: r.user?.thumbnail ?? '',
      rating: r.rating ?? 0,
      date: r.date ?? '',
      text: r.snippet ?? r.extracted_snippet?.original ?? '',
      likes: r.likes ?? 0,
    }))

    return NextResponse.json({
      reviews,
      total: reviewData.search_information?.total_results ?? reviews.length,
      rating: place?.rating ?? 0,
      name: place?.title ?? name,
    })
  } catch {
    return NextResponse.json({ reviews: [], total: 0 })
  }
}
