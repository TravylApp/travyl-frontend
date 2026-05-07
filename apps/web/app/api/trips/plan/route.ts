import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkOrigin, rateLimit, supabaseUrl, supabaseKey } from '@/lib/api-utils'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

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
