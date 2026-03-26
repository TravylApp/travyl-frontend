// services/activity-intelligence.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { getPlaceDetails } from './lib/serpapi'
import { haversineDistance, driveTimeMinutes } from './lib/haversine'
import { hasHoursConflict, hasTravelTimeConflict } from './lib/conflictDetection'

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))

function getSupabase() {
  return createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)
}

function getDayOfWeek(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
}

async function fetchWeather(lat: number, lng: number, date: string) {
  const isHistorical = new Date(`${date}T12:00:00`) < new Date()
  const base = isHistorical
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast'
  const url = new URL(base)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('start_date', date)
  url.searchParams.set('end_date', date)
  url.searchParams.set('daily', 'temperature_2m_max,precipitation_sum,weathercode')
  url.searchParams.set('timezone', 'auto')
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data = await res.json() as any
    return {
      tempMaxC: data.daily?.temperature_2m_max?.[0] ?? null,
      precipitationMm: data.daily?.precipitation_sum?.[0] ?? null,
      weatherCode: data.daily?.weathercode?.[0] ?? null,
    }
  } catch {
    return null
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const { activityId, tripId } = event.queryStringParameters ?? {}
    if (!activityId || !tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'activityId and tripId required' }) }
    }

    const supabase = getSupabase()

    // Fetch the target activity first — we need starting_date for the cache key
    const { data: activity } = await supabase
      .from('activity')
      .select('activity_name, latitude, longitude, starting_date, starting_time, ending_time')
      .eq('id', activityId)
      .single()

    if (!activity) return { statusCode: 404, body: JSON.stringify({ error: 'activity not found' }) }

    // Authorization check — verify caller has access to this trip
    const { data: owned } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', userId)
      .maybeSingle()

    const { data: collaborated } = await supabase
      .from('trip_collaborators')
      .select('trip_id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .eq('invite_status', 'accepted')
      .maybeSingle()

    if (!owned && !collaborated) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
    }

    // Cache check — sk is starting_date so moving the activity to a new date generates
    // a fresh cache entry naturally
    const cacheKey = { pk: `intelligence:${activityId}`, sk: activity.starting_date }
    const cached = await dynamo.send(new GetCommand({ TableName: Resource.RecommendationCache.name, Key: cacheKey }))
    if (cached.Item && (cached.Item.expiresAt as number) > Math.floor(Date.now() / 1000)) {
      return { statusCode: 200, body: JSON.stringify(cached.Item.data) }
    }

    // Fetch previous activity on same day
    const { data: prevActivities } = await supabase
      .from('activity')
      .select('activity_name, latitude, longitude, ending_time')
      .eq('trip_id', tripId)
      .eq('starting_date', activity.starting_date)
      .lt('starting_time', activity.starting_time)
      .order('starting_time', { ascending: false })
      .limit(1)

    const prev = prevActivities?.[0] ?? null

    // Fan out
    const [place, weather] = await Promise.all([
      getPlaceDetails(activity.activity_name, activity.latitude, activity.longitude),
      fetchWeather(activity.latitude, activity.longitude, activity.starting_date),
    ])

    const distanceKm = prev
      ? haversineDistance(prev.latitude, prev.longitude, activity.latitude, activity.longitude)
      : null
    const travelTimeMinutes = distanceKm !== null ? driveTimeMinutes(distanceKm) : null
    const dayOfWeek = getDayOfWeek(activity.starting_date)

    const result = {
      place: place ?? {
        name: activity.activity_name,
        address: '',
        rating: null,
        priceTier: null,
        photos: [],
        openingHours: null,
      },
      logistics: {
        travelTimeMinutes,
        distanceKm,
        previousActivityName: prev?.activity_name ?? null,
      },
      weather,
      conflicts: {
        hours: hasHoursConflict(
          place?.openingHours ?? null,
          dayOfWeek,
          activity.starting_time.slice(0, 5),
          activity.ending_time.slice(0, 5),
        ),
        travelTime: hasTravelTimeConflict(
          prev?.ending_time?.slice(0, 5) ?? null,
          activity.starting_time.slice(0, 5),
          travelTimeMinutes,
        ),
      },
    }

    // Cache for 1 hour
    await dynamo.send(new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: { ...cacheKey, data: result, expiresAt: Math.floor(Date.now() / 1000) + 3600 },
    }))

    return { statusCode: 200, body: JSON.stringify(result) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[activity-intelligence] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
