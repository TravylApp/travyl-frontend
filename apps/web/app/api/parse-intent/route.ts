// apps/web/app/api/parse-intent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Lazy — avoids throwing at module load time when ANTHROPIC_API_KEY is absent
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic()
  return _client
}

const PROMPT = `You are a travel search intent parser. Extract structured intent from a search query.

Return ONLY valid JSON — no explanation, no markdown, no code fences.

Schema:
{
  "intent": "discover" | "entity-search" | "create-trip" | "route" | "unknown",
  "location": string | null,
  "entityType": "restaurant" | "hotel" | "activity" | "flight" | null
}

Rules:
- "discover": user wants to explore a destination with no specific entity type
- "entity-search": user wants a specific category of place in a location
- "create-trip": user wants to plan or start a trip
- "route": user mentions two places (origin to destination)
- "unknown": none of the above apply
- location should be in Title Case (e.g. "Bakersfield", "New York")

Query: `

function fallback(q: string) {
  return NextResponse.json({ intent: 'unknown', location: null, entityType: null, rawQuery: q })
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  // Auth check — must have a Bearer token (keeps open internet from burning API quota)
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return fallback(q)

  if (!q.trim()) return fallback(q)
  if (!process.env.ANTHROPIC_API_KEY) return fallback(q)

  try {
    const msg = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: `${PROMPT}"${q}"` }],
    })

    const text = (msg.content[0] as { type: 'text'; text: string }).text.trim()
    const parsed = JSON.parse(text) as {
      intent: string
      location: string | null
      entityType: string | null
    }

    return NextResponse.json({
      intent: parsed.intent ?? 'unknown',
      location: parsed.location ?? undefined,
      entityType: parsed.entityType ?? undefined,
      rawQuery: q,
    })
  } catch (err) {
    console.error('[parse-intent] error:', err)
    return fallback(q)
  }
}
