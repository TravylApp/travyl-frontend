import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const SERPAPI_KEY = process.env.SERPAPI_KEY

const opentableQuerySchema = z.object({
  q: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
}).refine((q) => q.q || q.location, { message: 'Provide q or location' })

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'opentable', 10, 60_000)
  if (blocked) return blocked

  const parsed = parseQuery(req, opentableQuerySchema)
  if (!parsed.ok) return parsed.response
  const { q, location } = parsed.data
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
