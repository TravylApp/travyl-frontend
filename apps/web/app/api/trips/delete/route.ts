import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabase, supabaseUrl, supabaseKey, checkOrigin, rateLimit } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  try {
    const blocked = checkOrigin(req) || rateLimit(req, 'delete', 5, 60_000)
    if (blocked) return blocked

    const supabase = getSupabase()
    const { tripId } = await req.json()
    if (!tripId || typeof tripId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid tripId' }, { status: 400 })
    }

    // Verify the caller owns this trip
    // Check auth header for logged-in user
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      // Logged-in user — verify they own the trip
      const { data: { user }, error: authErr } = await createClient(
        supabaseUrl, supabaseKey,
        { global: { headers: { Authorization: authHeader } } }
      ).auth.getUser()

      if (authErr || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check trip ownership
      const { data: trip } = await supabase
        .from('trips')
        .select('user_id')
        .eq('id', tripId)
        .single()

      if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
      if (trip.user_id !== user.id) {
        return NextResponse.json({ error: 'Not your trip' }, { status: 403 })
      }
    } else {
      // Anonymous — only allow deleting public trips with no owner
      const { data: trip } = await supabase
        .from('trips')
        .select('user_id, visibility')
        .eq('id', tripId)
        .single()

      if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
      if (trip.user_id || trip.visibility !== 'public') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const { error } = await supabase.rpc('delete_trip_cascade', { p_trip_id: tripId })
    if (error) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json({ status: 'deleted' })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
