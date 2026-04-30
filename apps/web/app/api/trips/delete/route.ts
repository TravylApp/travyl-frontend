import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { supabaseUrl, supabaseKey, checkOrigin, rateLimit } from '@/lib/api-utils'

async function handleDeleteTrip(req: NextRequest) {
  try {
    const blocked = checkOrigin(req) || rateLimit(req, 'delete', 5, 60_000)
    if (blocked) return blocked

    let tripId: any; try { ({ tripId } = await req.json()) } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }
    if (!tripId || typeof tripId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid tripId' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    const supabase = authHeader
      ? createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } },
        })
      : createServerClient(supabaseUrl, supabaseKey, {
          cookies: {
            getAll() {
              return req.cookies.getAll()
            },
            setAll() {},
          },
        })

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single()

    if (tripError) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
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

export async function DELETE(req: NextRequest) {
  return handleDeleteTrip(req)
}

export async function POST(req: NextRequest) {
  return handleDeleteTrip(req)
}
