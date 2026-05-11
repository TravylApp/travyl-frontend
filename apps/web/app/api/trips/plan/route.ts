import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkOrigin, rateLimit, supabaseUrl, supabaseKey } from '@/lib/api-utils'
import { parseJsonBody } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

// FastAPI backend (EC2, separate from SST API Gateway). Defaults to staging
// so the route works without an SST infra env var.
const API_URL = process.env.FASTAPI_URL || 'https://api.dev.gotravyl.com'

const planBodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  answers: z.record(z.string(), z.any()).optional(),
})

export async function POST(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'plan', 5, 60_000)
  if (blocked) return blocked

  if (!API_URL) {
    return NextResponse.json({ error: 'Trip planning API not configured' }, { status: 503 })
  }

  const parsed = await parseJsonBody(req, planBodySchema)
  if (!parsed.ok) return parsed.response
  // Schema-stripped body — `safeParse` discards unknown keys, so this is also
  // an allowlist defense against prompt injection / param manipulation.
  const safeBody = parsed.data

  // Extract auth token — the browser uses Supabase SSR cookies, not an
  // Authorization header, so we read the session from the request cookies
  // and forward the access token as a Bearer token to the backend Lambda.
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},
      },
    })
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch {
    // No session available — backend will return 401
  }

  const res = await fetch(`${API_URL}/api/trips/plan`, {
    method: 'POST',
    headers,
    body: JSON.stringify(safeBody),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
