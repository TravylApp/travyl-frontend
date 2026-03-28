import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

function getAnonSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  // Try to get user session from cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  // Not logged in: fetch specific trip IDs passed as query param (from sessionStorage)
  const ids = req.nextUrl.searchParams.get('ids')
  if (!ids) return NextResponse.json([])

  const tripIds = ids.split(',').filter(Boolean).slice(0, 50)
  if (tripIds.length === 0) return NextResponse.json([])

  // Anon key can read public trips via RLS policy
  const { data, error } = await getAnonSupabase()
    .from('trips')
    .select('*')
    .in('id', tripIds)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
