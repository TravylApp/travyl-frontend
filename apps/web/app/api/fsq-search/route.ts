import { rateLimit } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'

const FSQ_API_KEY = process.env.FOURSQUARE_API_KEY
// Foursquare's new Places API host. The legacy `api.foursquare.com/v3/...`
// endpoints now return 410 Gone. The new host accepts the v3 raw API key
// (or a fsq3... service key) wrapped in `Bearer <key>` and requires an
// X-Places-Api-Version header.
const FSQ_HOST = 'https://places-api.foursquare.com'
const FSQ_VERSION = '2025-06-17'
// Free tier only — `rating`, `price`, `stats`, `popularity`, `photos`, `tips`
// are Premium and trigger 429 unless billing is set up at
// foursquare.com/developers/orgs. Add them once a paid plan is attached.
const FIELDS = [
  'fsq_place_id', 'name', 'location', 'categories', 'chains',
  'distance', 'tel', 'website',
].join(',')

interface FsqCategory {
  fsq_category_id?: string
  name: string
  short_name?: string
  plural_name?: string
}

interface FsqSearchResult {
  fsq_place_id: string
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
  const ll = req.nextUrl.searchParams.get('ll')

  if (!q || !FSQ_API_KEY) {
    return NextResponse.json({ results: [] })
  }

  try {
    const params = new URLSearchParams({ query: q, fields: FIELDS, limit: '5' })
    // Prefer lat,lng coords when supplied; fall back to text near.
    if (ll) params.set('ll', ll)
    else if (near) params.set('near', near)

    const res = await fetch(`${FSQ_HOST}/places/search?${params}`, {
      headers: {
        Authorization: `Bearer ${FSQ_API_KEY}`,
        'X-Places-Api-Version': FSQ_VERSION,
        Accept: 'application/json',
      },
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
        ? `/hotel/${encodeURIComponent(p.fsq_place_id)}`
        : type === 'restaurant'
        ? `/restaurant/${encodeURIComponent(p.fsq_place_id)}`
        : `/activity/${encodeURIComponent(p.fsq_place_id)}`

      return {
        id: p.fsq_place_id,
        type,
        title: p.name,
        subtitle,
        href,
        score: 1.2,
        metadata: {
          // New API returns rating on a 0–10 scale; convert to 0–5 stars.
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
