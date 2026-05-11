import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend, BACKEND_URL, rateLimit } from '@/lib/api-utils'
import { createServerClient } from '@supabase/ssr'
import { parseJsonBody } from '@/lib/zod-helpers'
import { createFavoriteBodySchema } from '@travyl/shared'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)!

async function getAuthHeader(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (auth) return auth
  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll() {},
      },
    })
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return `Bearer ${session.access_token}`
  } catch {}
  return null
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'favorites', 60, 60000)
  if (rl) return rl
  return proxyToBackend('/api/favorites', req)
}

export async function POST(req: NextRequest) {
  if (!BACKEND_URL) return NextResponse.json({ error: 'Backend URL not configured' }, { status: 503 })
  const auth = await getAuthHeader(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = await parseJsonBody(req, createFavoriteBodySchema)
  if (!parsed.ok) return parsed.response
  const res = await fetch(`${BACKEND_URL}/api/favorites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(parsed.data),
  })
  if (!res.ok) return NextResponse.json({ error: 'Failed' }, { status: res.status })
  return NextResponse.json(await res.json())
}
