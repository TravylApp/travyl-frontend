import { rateLimit } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

function fallback(q: string) {
  return NextResponse.json({ intent: 'unknown', location: null, entityType: null, rawQuery: q })
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'parse-intent', 60, 60000)
  if (rl) return rl
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const auth = req.headers.get('authorization')

  if (!q.trim() || !auth || !API_URL) return fallback(q)

  const res = await fetch(`${API_URL}/parse-intent?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: auth },
  })

  if (!res.ok) {
    return fallback(q)
  }

  return NextResponse.json(await res.json())
}
