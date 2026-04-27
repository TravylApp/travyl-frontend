import { rateLimit } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'context-search', 20, 60000)
  if (rl) return rl
  const q = req.nextUrl.searchParams.get('q')
  const auth = req.headers.get('authorization')

  if (!q || !auth || !API_URL) {
    return NextResponse.json({ results: [] })
  }

  const res = await fetch(`${API_URL}/context-search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: auth },
  })

  if (!res.ok) {
    return NextResponse.json({ results: [] }, { status: res.status })
  }

  return NextResponse.json(await res.json())
}
