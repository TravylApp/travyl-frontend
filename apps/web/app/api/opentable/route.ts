import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'opentable', 10, 60_000)
  if (blocked) return blocked

  const q = req.nextUrl.searchParams.get('q') // restaurant name
  const location = req.nextUrl.searchParams.get('location') // city name

  if (!q && !location) {
    return NextResponse.json({ error: 'Missing q or location' }, { status: 400 })
  }
  if (!SERPAPI_KEY) {
    return NextResponse.json({ restaurants: [] })
  }

  try {
    // Search Google for OpenTable reservation links
    const searchQuery = q
      ? `${q} ${location || ''} opentable reservation`
      : `best restaurants ${location} opentable`

    const params = new URLSearchParams({
      engine: 'google',
      q: searchQuery,
      api_key: SERPAPI_KEY,
      num: '5',
    })

    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ restaurants: [] })
    }

    const data = await res.json()
    const organic = data.organic_results ?? []

    const restaurants = organic
      .filter((r: any) => r.link?.includes('opentable.com'))
      .map((r: any) => ({
        name: r.title?.replace(/ - OpenTable.*$| \| OpenTable.*$/i, '') ?? '',
        url: r.link ?? '',
        snippet: r.snippet ?? '',
        source: 'opentable',
      }))
      .slice(0, 5)

    return NextResponse.json({ restaurants })
  } catch {
    return NextResponse.json({ restaurants: [] })
  }
}
