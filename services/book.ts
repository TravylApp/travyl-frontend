import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { routeProvider, nameSimScore, proximityScore, calculateConfidence } from '@travyl/shared'
// import { searchOpenTable } from './lib/booking/opentable'
import { searchTicketmaster } from './lib/booking/ticketmaster'
import type { BookingActivity } from './lib/booking/types'

const CONFIDENCE_THRESHOLD = 0.6

function getSupabaseAdmin() {
  return createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)
}

async function matchActivity(activity: BookingActivity) {
  const provider = routeProvider(activity.type)

  let match = null
  if (!provider) return {
    activityId: activity.id,
    provider: null,
    matchedName: null,
    bookingUrl: null,
    affiliateUrl: null,
    confidence: null,
    status: 'unmatched' as const,
  }

  try {
    // if (provider === 'opentable') match = await searchOpenTable(activity)
    if (provider === 'ticketmaster') match = await searchTicketmaster(activity)
  } catch {
    // provider threw — treat as unmatched
  }

  if (!match) {
    return {
      activityId: activity.id,
      provider: null,
      matchedName: null,
      bookingUrl: null,
      affiliateUrl: null,
      confidence: null,
      status: 'unmatched' as const,
    }
  }

  const nameSim = nameSimScore(activity.title, match.matchedName)
  const proxScore = proximityScore(activity.latitude, activity.longitude, match.lat, match.lng)
  const confidence = calculateConfidence(nameSim, proxScore)

  if (confidence < CONFIDENCE_THRESHOLD) {
    return {
      activityId: activity.id,
      provider: null,
      matchedName: null,
      bookingUrl: null,
      affiliateUrl: null,
      confidence,
      status: 'unmatched' as const,
    }
  }

  return {
    activityId: activity.id,
    provider: match.provider,
    matchedName: match.matchedName,
    bookingUrl: match.bookingUrl,
    affiliateUrl: match.affiliateUrl,
    confidence,
    status: 'matched' as const,
  }
}

// ─── POST /book/match ─────────────────────────────────────────

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers?.authorization)
  } catch {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  let body: { tripId?: string; activities?: BookingActivity[] }
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { tripId, activities } = body
  if (!tripId || !Array.isArray(activities) || activities.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tripId and activities required' }) }
  }

  const supabase = getSupabaseAdmin()

  // Filter to activities with coordinates; mark the rest unmatched directly
  const withCoords = activities.filter((a) => a.latitude != null && a.longitude != null)
  const withoutCoords = activities.filter((a) => a.latitude == null || a.longitude == null)

  // Upsert uncoordinated activities as unmatched immediately
  if (withoutCoords.length > 0) {
    await supabase.from('booking_matches').upsert(
      withoutCoords.map((a) => ({
        trip_id: tripId,
        activity_id: a.id,
        provider: null,
        matched_name: null,
        booking_url: null,
        affiliate_url: null,
        confidence: null,
        status: 'unmatched',
      })),
      { onConflict: 'trip_id,activity_id' },
    )
  }

  // Fan out provider searches in parallel
  const results = await Promise.allSettled(withCoords.map(matchActivity))

  const matches = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          activityId: withCoords[i].id,
          provider: null,
          matchedName: null,
          bookingUrl: null,
          affiliateUrl: null,
          confidence: null,
          status: 'unmatched' as const,
        },
  )

  // Upsert all matches to Supabase (triggers Realtime events to client)
  await supabase.from('booking_matches').upsert(
    matches.map((m) => ({
      trip_id: tripId,
      activity_id: m.activityId,
      provider: m.provider,
      matched_name: m.matchedName,
      booking_url: m.bookingUrl,
      affiliate_url: m.affiliateUrl,
      confidence: m.confidence,
      status: m.status,
    })),
    { onConflict: 'trip_id,activity_id' },
  )

  const allMatches = [
    ...withoutCoords.map((a) => ({
      activityId: a.id,
      status: 'unmatched' as const,
      provider: undefined,
      matchedName: undefined,
      affiliateUrl: undefined,
      confidence: undefined,
    })),
    ...matches.map((m) => ({
      activityId: m.activityId,
      status: m.status,
      provider: m.provider ?? undefined,
      matchedName: m.matchedName ?? undefined,
      affiliateUrl: m.affiliateUrl ?? undefined,
      confidence: m.confidence ?? undefined,
    })),
  ]

  return {
    statusCode: 200,
    body: JSON.stringify({ total: activities.length, matches: allMatches }),
  }
}

// ─── GET /book/status/{tripId} ────────────────────────────────

export const statusHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers?.authorization)
  } catch {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const tripId = event.pathParameters?.tripId
  if (!tripId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tripId required' }) }
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('booking_matches')
    .select('activity_id, provider, matched_name, booking_url, affiliate_url, confidence, status, updated_at')
    .eq('trip_id', tripId)

  if (error) {
    console.error('[book/status] supabase error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }

  const matches = (data ?? []).map((row) => ({
    activityId: row.activity_id,
    status: row.status,
    provider: row.provider ?? undefined,
    matchedName: row.matched_name ?? undefined,
    bookingUrl: row.booking_url ?? undefined,
    affiliateUrl: row.affiliate_url ?? undefined,
    confidence: row.confidence ?? undefined,
    updatedAt: row.updated_at,
  }))

  return {
    statusCode: 200,
    body: JSON.stringify({ matches }),
  }
}
