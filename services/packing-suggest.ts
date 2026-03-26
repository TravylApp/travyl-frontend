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

const SYSTEM_PROMPT = `You are a travel packing assistant. Given trip details, suggest packing items as a JSON array.

Each item: { "name": "Item Name", "category": "category_name", "reason": "Brief reason" }

Use these standard categories when appropriate: clothing, toiletries, electronics, documents, accessories, essentials.

When the trip involves specific activities (beach, skiing, hiking, etc.), create descriptive categories for that gear (e.g., "beach gear", "ski equipment", "hiking gear"). Keep dynamic category names lowercase and descriptive.

Return ONLY a JSON array, no markdown.`

function buildUserMessage(trip: any, activities: any[], packedNames: string[], suggestedNames: string[], travelers?: any): string {
  const start = new Date(trip.start_date)
  const end = new Date(trip.end_date)
  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  const activityLines = activities.map((a) => {
    const base = `- ${a.activity_name} (${a.activity_type})`
    return a.notes ? `${base} — ${a.notes}` : base
  }).join('\n')

  let message = `Trip to ${trip.destination}\nDates: ${trip.start_date} to ${trip.end_date} (${duration} days)`

  if (travelers) {
    const parts = []
    if (travelers.adults) parts.push(`${travelers.adults} adult${travelers.adults > 1 ? 's' : ''}`)
    if (travelers.children) {
      const ages = travelers.child_ages?.length ? ` (ages ${travelers.child_ages.join(', ')})` : ''
      parts.push(`${travelers.children} child${travelers.children > 1 ? 'ren' : ''}${ages}`)
    }
    if (travelers.infants) parts.push(`${travelers.infants} infant${travelers.infants > 1 ? 's' : ''}`)
    if (parts.length) message += `\nTravelers: ${parts.join(', ')}`
  }

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

function parseBedrockResponse(body: string): { name: string; category: string; reason: string }[] {
  try {
    const parsed = JSON.parse(body)
    const text: string = parsed.content?.[0]?.text ?? ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const items = JSON.parse(cleaned)
    if (!Array.isArray(items)) return []
    return items
      .filter((item: any) =>
        typeof item.name === 'string' &&
        typeof item.category === 'string' &&
        typeof item.reason === 'string'
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

    const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)

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
      .select('destination, start_date, end_date, travelers, trip_context')
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

    const travelers = trip.trip_context?.travelers ?? null
    const userMessage = buildUserMessage(trip, activities ?? [], packedNames, suggestedNames, travelers)

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
