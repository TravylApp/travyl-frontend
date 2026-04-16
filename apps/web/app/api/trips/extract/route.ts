import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function POST(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'extract', 10, 60_000)
  if (blocked) return blocked

  if (!API_URL) {
    return NextResponse.json({ error: 'Trip extraction API not configured' }, { status: 503 })
  }

  const body = await req.json()

  // Validate prompt exists and isn't absurdly long
  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.length > 2000) {
    return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
  }

  // Allowlist fields
  const safeBody: Record<string, unknown> = { prompt: body.prompt }
  if (typeof body.city === 'string') safeBody.city = body.city.slice(0, 100)
  if (typeof body.country === 'string') safeBody.country = body.country.slice(0, 100)

  const res = await fetch(`${API_URL}/api/trips/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(safeBody),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
