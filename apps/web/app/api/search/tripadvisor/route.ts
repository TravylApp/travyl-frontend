import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY || ''

/**
 * TripAdvisor search via SerpAPI.
 * ?q=Los+Angeles — search query (city, "things to do in X", etc.)
 * ?ssrc=a — filter: a=all, r=restaurants, A=activities, h=hotels
 * ?offset=0 — pagination offset (30 per page)
 */
export async function GET(req: NextRequest) {
  const query = getOptionalParam(req, 'q', '')
  if (!query) return NextResponse.json([])
  if (!SERPAPI_KEY) return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 503 })

  try {
    const ssrc = getOptionalParam(req, 'ssrc', 'a')
    const offset = getOptionalParam(req, 'offset', '0')

    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('engine', 'tripadvisor')
    url.searchParams.set('q', query)
    url.searchParams.set('ssrc', ssrc)
    url.searchParams.set('offset', offset)
    url.searchParams.set('api_key', SERPAPI_KEY)

    const res = await fetch(url.toString(), CACHE_1H)
    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const places = data.places ?? []

    const results = places.map((p: any, idx: number) => {
      const placeType = p.place_type || ''
      let type = 'attraction'
      if (/EATERY/i.test(placeType)) type = 'restaurant'
      else if (/ACCOMMODATION/i.test(placeType)) type = 'hotel'
      else if (/ATTRACTION/i.test(placeType)) type = 'attraction'
      else if (/GEO/i.test(placeType)) type = 'destination'

      return {
        id: `ta_${p.place_id || idx}`,
        name: p.title || '',
        image: p.thumbnail || '',
        type,
        rating: p.rating || 0,
        reviewCount: p.reviews || 0,
        tagline: p.description?.split('.')[0] || p.location || '',
        category: placeType === 'EATERY' ? 'Restaurant' : placeType === 'ATTRACTION' ? 'Attraction' : p.place_type || '',
        description: p.description || '',
        tags: [p.place_type, p.location].filter(Boolean),
        address: p.location || '',
        website: p.link || '',
      }
    })

    return NextResponse.json(results.slice(0, 30))
  } catch (err) {
    console.error('[/api/search/tripadvisor] error:', err)
    return NextResponse.json([])
  }
}
