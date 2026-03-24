import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, destination, start_date, end_date, status, user_id, travelers, budget, currency, trip_context } = body

  if (!destination) {
    return NextResponse.json({ error: 'Missing destination' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('trips')
    .insert({
      title: title || `${destination.split(',')[0]} Trip`,
      destination,
      start_date,
      end_date,
      status: status || 'planning',
      user_id: user_id || null,
      travelers: travelers || 1,
      budget: budget || null,
      currency: currency || 'USD',
      trip_context: trip_context || {},
      visibility: user_id ? 'private' : 'public',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
