import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'

// FastAPI backend (EC2, separate from SST API Gateway). Defaults to staging
// so the route works without an SST infra env var.
const API_URL = process.env.FASTAPI_URL || 'https://api.dev.gotravyl.com'

export async function POST(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'plan', 5, 60_000)
  if (blocked) return blocked

  if (!API_URL) {
    return NextResponse.json({ error: 'Trip planning API not configured' }, { status: 503 })
  }

  let body: any; try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }

  // Validate prompt exists
  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.length > 2000) {
    return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 })
  }

  // Allowlist fields to prevent prompt injection / parameter manipulation
  const safeBody: Record<string, unknown> = { prompt: body.prompt }
  if (typeof body.city === 'string') safeBody.city = body.city.slice(0, 100)
  if (typeof body.country === 'string') safeBody.country = body.country.slice(0, 100)
  if (typeof body.answers === 'object' && body.answers) safeBody.answers = body.answers

  const res = await fetch(`${API_URL}/api/trips/plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(req.headers.get('authorization')
        ? { Authorization: req.headers.get('authorization')! }
        : {}),
    },
    body: JSON.stringify(safeBody),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
