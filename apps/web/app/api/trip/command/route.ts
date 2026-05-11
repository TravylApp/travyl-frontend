import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const MODEL_ID = 'anthropic.claude-3-5-haiku-20241022-v1:0'
const MAX_INPUT_LENGTH = 500
const TIMEOUT_MS = 10_000
const bedrockClient = new BedrockRuntimeClient({})

interface ToolCall {
  tool: string
  args: Record<string, unknown>
}

interface Context {
  destination: string
  tripStartDate: string
  tripEndDate: string
  currentDayOffset: number
  existingActivityTitles: string[]
}

interface RequestBody {
  tripId: string
  message: string
  context: Context
}

function buildSystemPrompt(context: Context): string {
  return `You are a trip command assistant. Your job is to parse the user's natural language
request and return a list of tool calls to execute.

Trip context: ${context.destination}, ${context.tripStartDate} to ${context.tripEndDate}
Current day offset (0-based): ${context.currentDayOffset}
Existing activities: ${context.existingActivityTitles.join(', ') || 'None yet'}

Rules:
Date patterns (map to 0-based day offset):
  - "today" = day ${context.currentDayOffset}
  - "tomorrow" = day ${context.currentDayOffset + 1}
  - "day after tomorrow" = day ${context.currentDayOffset + 2}
  - "day N" = day N-1 (e.g. "day 1" = day 0)
  - "first/last day" = day 0 / last day
  - Relative day names resolve from trip start (e.g. day 0 = trip start date day of week)
- Days are 0-based (day 0 = trip start date)
- startHour is a 24h float (9 AM = 9, 1:30 PM = 13.5, 8 PM = 20)
- duration is in fractional hours (1 hour = 1, 90 min = 1.5)
- Activity types: food, sightseeing, entertainment, shopping, outdoor, culture, travel, stay, transit, flight, car
- For moveActivity/removeActivity, use fuzzy matching against existing activity titles
- addFlight tool has its own args (airline, flightNumber, day, departureTime, arrivalTime, from, to)
- addHotel tool has its own args (name, checkInDay, checkOutDay, address)
- Use addActivity when the user knows exactly what they want ("add dinner at Nobu")
- Use suggestAndAdd when the user wants a recommendation ("suggest a good ramen place for lunch")
  suggestAndAdd generates all details from your knowledge of the destination
- NEVER suggest accessing a database or API directly — only return tool calls

Respond with a JSON object:
{
  "reply": "A brief, friendly confirmation of what was done",
  "toolCalls": [
    { "tool": "toolName", "args": { ... } }
  ]
}`
}

function parseResponse(text: string): { reply: string; toolCalls: ToolCall[] } {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply : 'Done.',
      toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [],
    }
  } catch {
    return {
      reply: "I couldn't understand that. Try phrasing it as an action like 'add lunch at...'",
      toolCalls: [],
    }
  }
}

function getEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing environment variable: ${key}`)
  return val
}

export async function POST(req: NextRequest) {
  try {
    // Auth — validate JWT from Supabase auth cookie
    const supabase = createServerClient(
      getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll() {},
        },
      },
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: RequestBody
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!body.tripId || typeof body.tripId !== 'string') {
      return NextResponse.json({ error: 'tripId required' }, { status: 400 })
    }
    if (!body.message || typeof body.message !== 'string' || body.message.length > MAX_INPUT_LENGTH) {
      return NextResponse.json({ error: `message required (max ${MAX_INPUT_LENGTH} chars)` }, { status: 413 })
    }

    const isDryRun = req.nextUrl.searchParams.get('dry_run') === 'true'
    const systemPrompt = buildSystemPrompt(body.context)

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        system: systemPrompt,
        messages: [{ role: 'user', content: `User request: "${body.message}"\n\nParse the user's request into tool calls.` }],
        max_tokens: 1024,
      }),
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await bedrockClient.send(command, { abortSignal: controller.signal })
      clearTimeout(timeout)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))
      const text: string = responseBody.content?.[0]?.text ?? ''
      const parsed = parseResponse(text)
      if (isDryRun) return NextResponse.json({ rawResponse: text, parsed, toolCalls: parsed.toolCalls })
      return NextResponse.json(parsed)
    } catch (err: any) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        return NextResponse.json({ reply: 'Request timed out. Try a simpler request.', toolCalls: [] })
      }
      throw err
    }
  } catch (err) {
    console.error('[trip/command] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
