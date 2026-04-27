import { rateLimit } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'entity-search', 20, 60000)
  if (rl) return rl
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')
  const auth = req.headers.get('authorization')

  if (!q || !auth || !API_URL) {
    return NextResponse.json({ results: {} })
  }

  // Allowlist query params to prevent SSRF via parameter injection
  const upstream = new URL(`${API_URL}/entity-search`)
  const ALLOWED_PARAMS = ['q', 'entityType', 'location', 'limit']
  for (const key of ALLOWED_PARAMS) {
    const val = searchParams.get(key)
    if (val) upstream.searchParams.set(key, val)
  }

  const res = await fetch(upstream.toString(), {
    headers: { Authorization: auth },
  })

  if (!res.ok) {
    return NextResponse.json({ results: {} }, { status: res.status })
  }

  return NextResponse.json(await res.json())
}
