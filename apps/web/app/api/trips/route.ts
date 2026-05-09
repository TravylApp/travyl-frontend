import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabase, supabaseUrl, supabaseKey, rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const tripsListQuerySchema = z.object({
  ids: z.string().max(1000).optional(),
})

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'trips', 60, 60000)
  if (rl) return rl
  // Try to get user session from cookies
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Logged in: return only trips owned by this user
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  // Not logged in: fetch specific trip IDs passed as query param (from
  // sessionStorage). RLS still gates which rows the anon client can read,
  // and we explicitly restrict the response to non-sensitive columns and
  // anonymous-owned trips so this endpoint can never leak a real user's data
  // even if RLS policies regress.
  const parsed = parseQuery(req, tripsListQuerySchema)
  if (!parsed.ok) return parsed.response
  const ids = parsed.data.ids
  if (!ids) return NextResponse.json([])

  // Validate each ID is a UUID. Reject malformed input rather than letting
  // the DB do it, and cap to a small batch.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const tripIds = ids.split(',').map(s => s.trim()).filter(s => UUID_RE.test(s)).slice(0, 20)
  if (tripIds.length === 0) return NextResponse.json([])

  // Only return safe columns. Never include user_id, billing data, or
  // internal flags in the anonymous response.
  const SAFE_COLUMNS =
    'id, title, destination, start_date, end_date, status, travelers, budget, currency, trip_context, visibility, created_at'

  // user_id IS NULL ensures this can only ever return anonymous-created
  // trips, even if a future RLS policy regression would otherwise expose
  // a real user's trip via the anon client.
  const { data, error } = await getSupabase()
    .from('trips')
    .select(SAFE_COLUMNS)
    .in('id', tripIds)
    .is('user_id', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
