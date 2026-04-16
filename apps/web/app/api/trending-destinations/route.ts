import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY

interface TrendingDestination {
  name: string
  country: string
  thumbnail: string | null
}

// In-memory cache — survives across requests in the same server process
let cache: { data: TrendingDestination[]; expires: number } | null = null
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

export async function GET(req: NextRequest) {
  const blocked = rateLimit(req, 'trending', 5, 60_000)
  if (blocked) return blocked

  // Serve from cache if fresh
  if (cache && Date.now() < cache.expires) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200' },
    })
  }

  if (!SERPAPI_KEY) {
    return NextResponse.json([])
  }

  const departureId = req.nextUrl.searchParams.get('from') ?? 'JFK'

  try {
    const params = new URLSearchParams({
      engine: 'google_travel_explore',
      departure_id: departureId,
      api_key: SERPAPI_KEY,
      currency: 'USD',
      hl: 'en',
    })

    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json(cache?.data ?? [])
    }

    const data = await res.json()

    // Deduplicate by city name (e.g. "Orlando" and "Walt Disney World® Resort" both map to Orlando)
    const seen = new Set<string>()
    const results: TrendingDestination[] = []

    for (const r of data.destinations ?? []) {
      const name: string = r.name ?? ''
      if (!name || seen.has(name.toLowerCase())) continue
      // Skip sub-destinations (theme parks, resorts) — they have a location field
      if (r.destination_airport?.location && r.destination_airport.location !== name) {
        const parentCity = r.destination_airport.location
        if (seen.has(parentCity.toLowerCase())) continue
      }
      seen.add(name.toLowerCase())
      results.push({
        name,
        country: r.country ?? '',
        thumbnail: r.thumbnail ?? null,
      })
      if (results.length >= 12) break
    }

    cache = { data: results, expires: Date.now() + CACHE_TTL }

    return NextResponse.json(results, {
      headers: { 'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200' },
    })
  } catch {
    return NextResponse.json(cache?.data ?? [])
  }
}
