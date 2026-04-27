import { rateLimit } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'
import {
  BackendPlace,
  mapBackendToPlaceItem,
} from '@travyl/shared'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(req, 'places-[id]', 30, 60000)
  if (rl) return rl
  const { id } = await params

  if (!API_URL) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  try {
    // Try a dedicated by-ID endpoint first
    const res = await fetch(`${API_URL}/api/places/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (res.status === 404) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    if (!res.ok) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    const p: BackendPlace = await res.json()

    const place = mapBackendToPlaceItem(p, 0)

    const out = NextResponse.json(place)
    out.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return out
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch place' }, { status: 500 })
  }
}
