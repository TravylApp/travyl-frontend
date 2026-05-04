import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const blocked = rateLimit(req, 'stats', 30, 60_000)
  if (blocked) return blocked
  try {
    const sb = getSupabase()
    const { data, error } = await sb.rpc('get_stats')
    if (error) throw error

    return NextResponse.json(data ?? { destinations: 0, travelers: 0, trips: 0 }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch {
    return NextResponse.json({ destinations: 0, travelers: 0, trips: 0 }, { status: 500 })
  }
}
