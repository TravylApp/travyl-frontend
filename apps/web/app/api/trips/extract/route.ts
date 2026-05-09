import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'
import { parseJsonBody } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

// FastAPI backend (EC2, separate from SST API Gateway). Defaults to staging
// so the route works without an SST infra env var.
const API_URL = process.env.FASTAPI_URL || 'https://api.dev.gotravyl.com'

const extractBodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'extract', 10, 60_000)
  if (blocked) return blocked

  if (!API_URL) {
    return NextResponse.json({ error: 'Trip extraction API not configured' }, { status: 503 })
  }

  const parsed = await parseJsonBody(req, extractBodySchema)
  if (!parsed.ok) return parsed.response
  // Schema-stripped body acts as the allowlist defense.
  const safeBody = parsed.data

  const res = await fetch(`${API_URL}/api/trips/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(safeBody),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
