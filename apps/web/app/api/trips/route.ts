import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabase, supabaseUrl, supabaseKey, rateLimit } from '@/lib/api-utils'

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

  // Not logged in: fetch specific trip IDs passed as query param (from sessionStorage)
  const ids = req.nextUrl.searchParams.get('ids')
  if (!ids) return NextResponse.json([])

  const tripIds = ids.split(',').filter(Boolean).slice(0, 50)
  if (tripIds.length === 0) return NextResponse.json([])

  // Anon key can read public trips via RLS policy
  const { data, error } = await getSupabase()
    .from('trips')
    .select('*')
    .in('id', tripIds)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
