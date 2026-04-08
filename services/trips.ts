import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { safeParseBody } from './lib/validation'

const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)

interface ItineraryItem {
  id: string
  day: number
  time: string
  name: string
  type: string
  duration: number
  location: {
    lat: number
    lng: number
    address: string
  }
  bookingStatus: 'none' | 'pending' | 'confirmed'
  notes?: string
}

interface TripItinerary {
  tripId: string
  destination: string
  startDate: string
  endDate: string
  days: Array<{
    day: number
    date: string
    items: ItineraryItem[]
  }>
}

export const itineraryHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const tripId = event.pathParameters?.id

    if (!tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Trip ID required' }) }
    }

    // Fetch trip from Supabase
    const { data: trip, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single()

    if (error || !trip) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Trip not found' }) }
    }

    // Fetch activities for this trip
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('trip_id', tripId)
      .order('day', { ascending: true })
      .order('time', { ascending: true })

    // Group by day
    const dayMap = new Map<number, ItineraryItem[]>()
    const startDate = new Date(trip.start_date)

    for (let i = 1; i <= trip.duration_days; i++) {
      dayMap.set(i, [])
    }

    activities?.forEach((act) => {
      const day = act.day || 1
      const items = dayMap.get(day) || []
      items.push({
        id: act.id,
        day,
        time: act.time || '09:00',
        name: act.name,
        type: act.type,
        duration: act.duration || 2,
        location: {
          lat: act.latitude,
          lng: act.longitude,
          address: act.address || '',
        },
        bookingStatus: act.booking_status || 'none',
        notes: act.notes,
      })
      dayMap.set(day, items)
    })

    const days = Array.from(dayMap.entries()).map(([day, items]) => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + day - 1)
      return {
        day,
        date: date.toISOString().split('T')[0],
        items,
      }
    })

    const response: TripItinerary = {
      tripId,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      days,
    }

    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[trips/itinerary] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}

// ─── POST /trips/{id}/share ────────────────────────────────────

interface ShareRequest {
  permission: 'view' | 'edit'
  expiresInDays?: number
}

interface ShareResponse {
  shareId: string
  shareUrl: string
  expiresAt: string
  permission: string
}

export const shareHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const tripId = event.pathParameters?.id

    if (!tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Trip ID required' }) }
    }

    const parseResult = safeParseBody<ShareRequest>(event)
    if (!parseResult.success) {
      return parseResult.error
    }

    const { permission = 'view', expiresInDays = 7 } = parseResult.data

    // Validate trip ownership
    const { data: trip, error } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single()

    if (error || !trip) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Trip not found' }) }
    }

    // Calculate expiration
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + Math.min(expiresInDays, 30))

    // Create share record
    const shareId = crypto.randomUUID()
    const { error: insertError } = await supabase
      .from('trip_shares')
      .insert({
        id: shareId,
        trip_id: tripId,
        owner_id: userId,
        permission,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      console.error('[trips/share] insert error:', insertError)
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create share' }) }
    }

    const response: ShareResponse = {
      shareId,
      shareUrl: `${process.env.APP_URL || 'https://gotravyl.com'}/shared/${shareId}`,
      expiresAt: expiresAt.toISOString(),
      permission,
    }

    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[trips/share] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}