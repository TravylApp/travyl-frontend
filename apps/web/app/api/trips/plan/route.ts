import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function POST(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'plan', 5, 60_000)
  if (blocked) return blocked

  if (!API_URL) {
    return NextResponse.json({ error: 'Trip planning API not configured' }, { status: 503 })
  }

  const body = await req.json()

  // Validate prompt exists
  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.length > 2000) {
    return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
  }

  const res = await fetch(`${API_URL}/api/trips/plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(req.headers.get('authorization')
        ? { Authorization: req.headers.get('authorization')! }
        : {}),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
