import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { getPlaceDetails } from './lib/serpapi'
import { computeDayIntelligence } from './lib/dayIntelligenceCompute'
import type { DayActivityRow } from './lib/dayIntelligenceTypes'

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))

function getSupabase() {
  return createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)
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
    const data = await res.json() as { daily?: { temperature_2m_max?: number[]; precipitation_sum?: number[]; weathercode?: number[] } }
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

    const { tripId, date } = event.queryStringParameters ?? {}
    if (!tripId || !date) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tripId and date required' }) }
    }

    const supabase = getSupabase()

    // Authorization check — verify caller is trip owner or accepted collaborator
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

    // Cache check
    const cacheKey = { pk: `day-intelligence:${tripId}`, sk: date }
    const cached = await dynamo.send(new GetCommand({ TableName: Resource.RecommendationCache.name, Key: cacheKey }))
    if (cached.Item && (cached.Item.expiresAt as number) > Math.floor(Date.now() / 1000)) {
      return { statusCode: 200, body: JSON.stringify(cached.Item.data) }
    }

    // Fetch all activities for the trip on this date
    const { data: activities } = await supabase
      .from('activity')
      .select('id, activity_name, latitude, longitude, starting_date, starting_time, ending_time')
      .eq('trip_id', tripId)
      .eq('starting_date', date)
      .order('starting_time', { ascending: true })

    const rows = (activities ?? []) as DayActivityRow[]

    if (rows.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ weather: null, activities: {} }) }
    }

    // Fetch weather using first activity's coordinates
    const weather = await fetchWeather(rows[0].latitude, rows[0].longitude, date)

    // Fetch place details in parallel for all activities
    const placeDetailsResults = await Promise.all(
      rows.map((act) => getPlaceDetails(act.activity_name, act.latitude, act.longitude))
    )
    const placeDetailsMap: Record<string, NonNullable<typeof placeDetailsResults[0]>> = {}
    for (let i = 0; i < rows.length; i++) {
      const details = placeDetailsResults[i]
      if (details) {
        placeDetailsMap[rows[i].id] = details
      }
    }

    const computedActivities = computeDayIntelligence(rows, placeDetailsMap)

    const result = { weather, activities: computedActivities }

    // Cache for 1 hour
    await dynamo.send(new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: { ...cacheKey, data: result, expiresAt: Math.floor(Date.now() / 1000) + 3600 },
    }))

    return { statusCode: 200, body: JSON.stringify(result) }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'Invalid token' || msg.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[day-intelligence] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
