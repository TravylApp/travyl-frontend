import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[Stats] Missing env vars:', { url: !!url, key: !!key })
    return null
  }
  return createClient(url, key)
}

export async function GET() {
  try {
    const sb = getServiceSupabase()
    if (!sb) return NextResponse.json({ destinations: 0, travelers: 0, trips: 0, error: 'Missing env vars' }, { status: 500 })

    const [tripsRes, profilesRes, destsRes] = await Promise.all([
      sb.from('trips').select('id', { count: 'exact', head: true }),
      sb.from('profiles').select('id', { count: 'exact', head: true }),
      sb.from('trips').select('destination'),
    ])

    const uniqueDestinations = new Set(
      (destsRes.data ?? [])
        .map((t: { destination: string }) => t.destination?.split(',')[0]?.trim())
        .filter(Boolean)
    ).size

    return NextResponse.json({
      destinations: uniqueDestinations,
      travelers: profilesRes.count ?? 0,
      trips: tripsRes.count ?? 0,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch {
    return NextResponse.json({ destinations: 0, travelers: 0, trips: 0 }, { status: 500 })
  }
}
