import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0'

const bedrockClient = new BedrockRuntimeClient({})

const SYSTEM_PROMPT = `You are a travel planning assistant. Extract structured trip details from a user's natural language request.

Return ONLY valid JSON — no explanation, no markdown, no code fences.

Schema:
{
  "status": "complete" | "needs_clarification",
  "extracted": {
    "destination": { "city": string, "country": string, "region": string | null, "lat": number, "lng": number },
    "dates": { "start": string | null, "end": string | null, "flexible": boolean },
    "duration_days": number,
    "travelers": { "count": number, "composition": string, "occasion": string | null },
    "interests": string[],
    "budget_level": string | null,
    "daily_estimate_usd": number,
    "pace": string | null,
    "accommodation_type": string | null
  },
  "questions": [
    { "id": string, "question": string, "options": string[] }
  ]
}

Rules:
- destination: infer city and country from the prompt. If a city/country override is provided, use it. Set lat/lng to the city center coordinates (use well-known coordinates — e.g. Paris 48.8566/2.3522, Tokyo 35.6762/139.6503, New York 40.7128/-74.0060, London 51.5074/-0.1278). If destination is ambiguous, mark status as "needs_clarification".
- dates: parse any date mentions. Format as YYYY-MM-DD. If no dates mentioned, set start/end to null and flexible to true. If vague ("next summer", "sometime in spring"), set flexible to true with null dates. If user says "next week", compute from the current date.
- duration_days: number of days the trip should last. Default to 5 if not specified. If user says "weekend", use 2-3. If "a week", use 7.
- travelers: extract count and composition (e.g. "solo", "couple", "family with 2 kids", "3 friends"). Set count to 1 if not specified. Extract occasion if mentioned (e.g. "honeymoon", "anniversary", "birthday").
- interests: list of interests mentioned (e.g. ["food", "art", "hiking", "beaches"]). Empty array if none specified.
- budget_level: one of "budget", "mid-range", "luxury", or null if not specified.
- daily_estimate_usd: estimate daily cost per person in USD. ~150 for budget, ~250-350 for mid-range, ~500+ for luxury. Default 300.
- pace: one of "relaxed", "moderate", "packed", or null if not specified.
- accommodation_type: "hotel", "airbnb", "hostel", "staying_with_someone", "own_place", or null if not specified.
- status: "complete" if you have enough information to plan a trip. "needs_clarification" if critical info is missing (destination completely unclear, dates are contradictory, etc.). When "needs_clarification", set extracted to null and provide 1-3 targeted follow-up questions. Each question has a snake_case id, a clear question string, and 2-5 concrete options.
- Be decisive. If you have enough to work with, return "complete" with your best guess at missing fields rather than asking unnecessary questions.`

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body ?? '{}')
    const prompt = (body.prompt ?? '').trim()

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'prompt required' }),
      }
    }

    let userMessage = `User request: "${prompt}"`
    if (body.city) userMessage += `\nCity override: ${body.city}`
    if (body.country) userMessage += `\nCountry override: ${body.country}`
    userMessage += `\n\nCurrent date: ${new Date().toISOString().split('T')[0]}`

    console.log('[extract] calling Bedrock')

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
          temperature: 0,
        }),
      }),
    )

    const responseBody = new TextDecoder().decode(response.body)
    const bedrockResult = JSON.parse(responseBody)
    const text: string = bedrockResult.content?.[0]?.text?.trim() ?? ''

    // Clean markdown fences if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: parsed.status ?? 'complete',
        extracted: parsed.extracted ?? null,
        questions: parsed.questions ?? [],
      }),
    }
  } catch (err: any) {
    console.error('[extract] error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Extraction failed',
        status: 'error',
        extracted: null,
        questions: [],
      }),
    }
  }
}
