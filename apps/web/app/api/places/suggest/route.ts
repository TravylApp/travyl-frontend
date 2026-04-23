import { NextRequest } from 'next/server'
import { getOptionalParam, proxyToBackend } from '@/lib/api-utils'

// Cache trending destinations from the API (refreshes every 30 min)
let trendingCache: string[] = []
let trendingFetchedAt = 0
const TRENDING_TTL = 30 * 60 * 1000

async function getTrendingDestinations(): Promise<string[]> {
  if (trendingCache.length > 0 && Date.now() - trendingFetchedAt < TRENDING_TTL) {
    return trendingCache
  }
  try {
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/trending-destinations`, { next: { revalidate: 1800 } })
    if (res.ok) {
      const data = await res.json()
      const names = Array.isArray(data) ? data.map((d: any) => d.name).filter(Boolean) : []
      if (names.length > 0) {
        trendingCache = names
        trendingFetchedAt = Date.now()
        return names
      }
    }
  } catch {}
  return trendingCache
}

export async function GET(req: NextRequest) {
  const page = getOptionalParam(req, 'page', '0')
  const pageNum = parseInt(page, 10) || 0

  // Use explicit destination if provided, otherwise rotate through trending
  let destination = getOptionalParam(req, 'destination', '')
  if (!destination) {
    const trending = await getTrendingDestinations()
    if (trending.length > 0) {
      destination = trending[pageNum % trending.length]
    }
  }

  if (!destination) {
    return Response.json({ suggestions: [], hasMore: false })
  }

  const extra: Record<string, string> = { destination }
  const category = getOptionalParam(req, 'category', 'all')
  const q = getOptionalParam(req, 'q', '')
  extra.category = category
  extra.page = page
  if (q) extra.q = q

  return proxyToBackend('/api/places/suggest', req, { params: extra })
}
