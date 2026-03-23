import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { validateAuth } from './lib/auth'

const PACKING_CATEGORIES = ['clothing', 'toiletries', 'electronics', 'documents', 'accessories', 'essentials']
const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0'
const RATE_LIMIT_MS = 2 * 60 * 1000 // 2 minutes
const MAX_SUGGESTIONS = 15

const bedrockClient = new BedrockRuntimeClient({})

const SYSTEM_PROMPT = `You are a travel packing assistant. Given a trip itinerary, suggest practical items to pack. Return ONLY a JSON array of objects with keys: name (string), category (one of: clothing, toiletries, electronics, documents, accessories, essentials), reason (short phrase explaining why, referencing specific activities or conditions). Suggest 10-15 items. Be specific and practical — prefer "Rain jacket" over "Outerwear". Do not suggest items the user already has.`

function buildUserMessage(trip: any, activities: any[], packedNames: string[], suggestedNames: string[]): string {
  const start = new Date(trip.start_date)
  const end = new Date(trip.end_date)
  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  const activityLines = activities.map((a) => {
    const base = `- ${a.activity_name} (${a.activity_type})`
    return a.notes ? `${base} — ${a.notes}` : base
  }).join('\n')

  let message = `Trip to ${trip.destination}\nDates: ${trip.start_date} to ${trip.end_date} (${duration} days)\nTravelers: ${trip.travelers ?? 1}`

  if (activityLines) {
    message += `\n\nActivities:\n${activityLines}`
  }
  if (packedNames.length > 0) {
    message += `\n\nAlready packed: ${packedNames.join(', ')}`
  }
  if (suggestedNames.length > 0) {
    message += `\n\nAlready suggested: ${suggestedNames.join(', ')}`
  }

  return message
}

function parseBedrockResponse(responseBody: string): { name: string; category: string; reason: string }[] {
  try {
    const parsed = JSON.parse(responseBody)
    const text: string = parsed.content?.[0]?.text ?? ''

    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    const items = JSON.parse(cleaned)
    if (!Array.isArray(items)) return []

    return items
      .filter((item: any) =>
        typeof item.name === 'string' &&
        typeof item.category === 'string' &&
        typeof item.reason === 'string' &&
        PACKING_CATEGORIES.includes(item.category)
      )
      .slice(0, MAX_SUGGESTIONS)
  } catch {
    console.error('[packing-suggest] Failed to parse Bedrock response')
    return []
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    const body = JSON.parse(event.body ?? '{}')
    const tripId = body.tripId
    const refresh = body.refresh === true

    if (!tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tripId required' }) }
    }

    const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseServiceRoleKey.value)

    // Check for existing pending suggestions
    const { data: existing } = await supabase
      .from('packing_suggestions')
      .select('*')
      .eq('trip_id', tripId)
      .eq('status', 'pending')
      .order('category')
      .order('created_at', { ascending: true })

    if (!refresh && existing && existing.length > 0) {
      return { statusCode: 200, body: JSON.stringify({ suggestions: existing }) }
    }

    // Rate limit check
    if (refresh) {
      const { data: latest } = await supabase
        .from('packing_suggestions')
        .select('created_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (latest && latest.length > 0) {
        const lastCreated = new Date(latest[0].created_at).getTime()
        if (Date.now() - lastCreated < RATE_LIMIT_MS) {
          return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests. Try again in a few minutes.', suggestions: existing ?? [] }) }
        }
      }
    }

    // Fetch trip context
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('destination, start_date, end_date, travelers')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Trip not found' }) }
    }

    const { data: activities } = await supabase
      .from('activity')
      .select('activity_name, activity_type, notes')
      .eq('trip_id', tripId)

    const { data: packedItems } = await supabase
      .from('packing_items')
      .select('name')
      .eq('trip_id', tripId)

    const { data: existingSuggestions } = await supabase
      .from('packing_suggestions')
      .select('name')
      .eq('trip_id', tripId)

    const packedNames = (packedItems ?? []).map((i) => i.name)
    const suggestedNames = (existingSuggestions ?? []).map((s) => s.name)

    const userMessage = buildUserMessage(trip, activities ?? [], packedNames, suggestedNames)

    console.log('[packing-suggest] calling Bedrock for trip:', tripId)

    // Call Bedrock
    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
          max_tokens: 1024,
          temperature: 0.3,
        }),
      }),
    )

    const responseBody = new TextDecoder().decode(response.body)
    const suggestions = parseBedrockResponse(responseBody)

    if (suggestions.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ suggestions: [] }) }
    }

    // Insert suggestions
    const rows = suggestions.map((s) => ({
      trip_id: tripId,
      user_id: userId,
      name: s.name,
      category: s.category,
      reason: s.reason,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('packing_suggestions')
      .insert(rows)
      .select()

    if (insertError) {
      console.error('[packing-suggest] insert error:', insertError)
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save suggestions' }) }
    }

    return { statusCode: 200, body: JSON.stringify({ suggestions: inserted ?? [] }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[packing-suggest] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
