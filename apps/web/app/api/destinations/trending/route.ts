import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'trending', 5, 60_000)
  if (blocked) return blocked

  if (!SERPAPI_KEY) {
    return NextResponse.json({ destinations: [] })
  }

  const region = req.nextUrl.searchParams.get('region') || 'us'

  try {
    // Use Google Trends trending searches via SerpAPI
    const params = new URLSearchParams({
      engine: 'google_trends_trending_now',
      frequency: 'daily',
      api_key: SERPAPI_KEY,
      geo: region.toUpperCase(),
    })

    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      // Fallback: use Google autocomplete for travel suggestions
      const fallbackParams = new URLSearchParams({
        engine: 'google_autocomplete',
        q: 'best places to visit in 2026',
        api_key: SERPAPI_KEY,
      })
      const fallbackRes = await fetch(`https://serpapi.com/search.json?${fallbackParams}`)
      if (!fallbackRes.ok) return NextResponse.json({ destinations: [] })
      const fallbackData = await fallbackRes.json()
      const suggestions = (fallbackData.suggestions ?? []).map((s: any) => ({
        name: s.value?.replace(/^best places to visit in /i, '').trim() ?? '',
        trend: 0,
        type: 'suggested',
      })).filter((d: any) => d.name.length > 2)
      return NextResponse.json({ destinations: suggestions.slice(0, 12) })
    }

    const data = await res.json()

    // Extract travel-related trending topics
    const daily = data.daily_searches ?? data.trending_searches ?? []
    const travelKeywords = /travel|vacation|flight|hotel|visit|trip|tour|beach|island|resort/i
    const destinations = daily
      .flatMap((day: any) => day.searches ?? [day])
      .filter((s: any) => travelKeywords.test(s.query ?? '') || travelKeywords.test(JSON.stringify(s.articles ?? [])))
      .map((s: any) => ({
        name: s.query ?? '',
        trend: s.traffic ?? 0,
        type: 'trending',
        image: s.image?.imageUrl ?? s.image?.source ?? '',
      }))
      .slice(0, 12)

    const out = NextResponse.json({ destinations })
    out.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return out
  } catch {
    return NextResponse.json({ destinations: [] })
  }
}
