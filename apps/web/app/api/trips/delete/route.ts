import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabase, supabaseUrl, supabaseKey, checkOrigin, rateLimit } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  try {
    const blocked = checkOrigin(req) || rateLimit(req, 'delete', 5, 60_000)
    if (blocked) return blocked

    const supabase = getSupabase()
    let tripId: any; try { ({ tripId } = await req.json()) } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
    if (!tripId || typeof tripId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid tripId' }, { status: 400 })
    }

    // Authentication is required to delete a trip — no anonymous deletes.
    // The previous anonymous branch let any caller delete any trip whose
    // user_id was NULL and visibility was 'public'. Currently RLS-mitigated
    // (anon trips are forced to visibility='private' by migration
    // 20260327000000_fix_trips_rls.sql), but the code path was still a hole.
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: { user }, error: authErr } = await createClient(
      supabaseUrl, supabaseKey,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { data: trip } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single()

    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    // Reject if the trip has no owner (legacy anonymous) OR the owner is
    // someone else.
    if (!trip.user_id || trip.user_id !== user.id) {
      return NextResponse.json({ error: 'Not your trip' }, { status: 403 })
    }

    const { error } = await supabase.rpc('delete_trip_cascade', { p_trip_id: tripId })
    if (error) {
      return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    }

    return NextResponse.json({ status: 'deleted' })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
