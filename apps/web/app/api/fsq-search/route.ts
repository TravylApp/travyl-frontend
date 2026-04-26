import { rateLimit } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY

const FIELDS = 'fsq_id,name,location,categories,rating,stats,price'

interface FsqCategory {
  id: number
  name: string
}

interface FsqSearchResult {
  fsq_id: string
  name: string
  location: {
    address?: string
    locality?: string
    region?: string
    country?: string
    formatted_address?: string
  }
  categories?: FsqCategory[]
  rating?: number
  stats?: { total_ratings?: number }
  price?: number
}

function inferType(categories: FsqCategory[] = []): 'restaurant' | 'hotel' | 'activity' {
  for (const cat of categories) {
    const name = cat.name.toLowerCase()
    if (/hotel|motel|hostel|inn|lodge|resort/.test(name)) return 'hotel'
    if (/restaurant|cafe|bar|pub|diner|bistro|bakery|food|dining|eatery|drink/.test(name)) return 'restaurant'
  }
  return 'activity'
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'fsq-search', 20, 60000)
  if (rl) return rl
  const q = req.nextUrl.searchParams.get('q')
  const near = req.nextUrl.searchParams.get('near')

  if (!q || !FSQ_API_KEY) {
    return NextResponse.json({ results: [] })
  }

  try {
    const params = new URLSearchParams({ query: q, fields: FIELDS, limit: '5' })
    if (near) params.set('near', near)

    const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
      headers: { Authorization: FSQ_API_KEY, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json({ results: [] })
    }

    const data = await res.json()
    const places: FsqSearchResult[] = data.results ?? []

    const results = places.map((p) => {
      const type = inferType(p.categories)
      const loc = p.location
      const subtitle = [loc.locality, loc.region].filter(Boolean).join(', ') || loc.formatted_address || ''
      const href = type === 'hotel'
        ? `/hotel/${encodeURIComponent(p.fsq_id)}`
        : type === 'restaurant'
        ? `/restaurant/${encodeURIComponent(p.fsq_id)}`
        : `/activity/${encodeURIComponent(p.fsq_id)}`

      return {
        id: p.fsq_id,
        type,
        title: p.name,
        subtitle,
        href,
        score: 1.2,
        metadata: {
          rating: p.rating != null ? Math.round((p.rating / 10) * 5 * 10) / 10 : undefined,
          priceLevel: p.price ?? undefined,
          source: 'foursquare',
        },
      }
    })

    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    })
  } catch (err) {
    return NextResponse.json({ results: [] })
  }
}
