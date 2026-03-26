import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { validateAuth } from './lib/auth'

const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0'

const bedrockClient = new BedrockRuntimeClient({})

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
  return {
    statusCode: 200,
    body: JSON.stringify({ intent: 'unknown', location: null, entityType: null, rawQuery: q }),
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const q = event.queryStringParameters?.q ?? ''
    if (!q.trim()) return fallback(q)

    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          messages: [{ role: 'user', content: `${PROMPT}"${q}"` }],
          max_tokens: 100,
          temperature: 0,
        }),
      }),
    )

    const responseBody = new TextDecoder().decode(response.body)
    const bedrockResult = JSON.parse(responseBody)
    const text: string = bedrockResult.content?.[0]?.text?.trim() ?? ''
    const parsed = JSON.parse(text) as {
      intent: string
      location: string | null
      entityType: string | null
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        intent: parsed.intent ?? 'unknown',
        location: parsed.location ?? undefined,
        entityType: parsed.entityType ?? undefined,
        rawQuery: q,
      }),
    }
  } catch (err: any) {
    const q = event.queryStringParameters?.q ?? ''
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return fallback(q)
    }
    console.error('[parse-intent] error:', err)
    return fallback(q)
  }
}
