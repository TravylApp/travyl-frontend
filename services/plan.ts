import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { validateAuth } from './lib/auth'

const MODEL_ID = 'anthropic.claude-3-5-sonnet-20240620-v1:0'

const bedrockClient = new BedrockRuntimeClient({})

const SYSTEM_PROMPT = `You are an expert travel itinerary generator. Create a detailed, realistic day-by-day trip plan based on the user's request and extracted trip information.

Return ONLY valid JSON — no explanation, no markdown, no code fences.

Schema:
{
  "status": "complete",
  "extracted": { same shape as provided — pass it through },
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "slots": [
        {
          "poi": {
            "id": string,
            "name": string,
            "lat": number,
            "lng": number,
            "category": string,
            "subcategory": string,
            "rating": number,
            "description": string,
            "photo_url": null,
            "visit_duration_min": number,
            "tags": string[]
          },
          "start_time": "HH:MM",
          "end_time": "HH:MM",
          "start_time_12h": "H:MM AM/PM",
          "end_time_12h": "H:MM AM/PM",
          "travel_from_prev_min": 0
        }
      ],
      "weather": {
        "date": "YYYY-MM-DD",
        "high_c": number,
        "low_c": number,
        "condition": string,
        "icon": string
      }
    }
  ],
  "hotels": [
    {
      "name": string,
      "stars": number,
      "price_per_night": number,
      "currency": "USD",
      "rating": number,
      "review_count": number,
      "photo_url": null,
      "amenities": string[],
      "booking_url": null
    }
  ],
  "flights": [
    {
      "airline": string,
      "departure_time": "YYYY-MM-DDTHH:MM:00",
      "arrival_time": "YYYY-MM-DDTHH:MM:00",
      "duration_min": number,
      "stops": number,
      "price": number,
      "currency": "USD",
      "booking_url": null
    }
  ],
  "destination_photo_url": null,
  "timezone": string
}

Rules:
- Generate exactly the number of days specified in the extracted trip info (duration_days). Each day must have 3-5 activity slots covering morning, afternoon, and evening.
- POIs: Use real, well-known attractions, restaurants, and activities in the destination city. Give each a unique id like "poi-1", "poi-2", etc. Include realistic lat/lng for each (they should be in the destination city). Categories: "attraction", "restaurant", "activity", "shopping", "nightlife", "museum", "park", "landmark", "accommodation", "transport". Subcategories refine the category (e.g. "fine_dining", "art_museum", "hiking").
- Ratings: 3.5-5.0 range for real venues.
- Descriptions: 1-2 sentence enticing description of the place.
- Tags: 2-4 relevant tags like ["historic", "outdoor", "family-friendly", "romantic", "local-favorite"].
- Visit durations: 60-90 min for restaurants, 90-180 min for museums/attractions, 30-60 min for quick stops.
- Times: Start the day around 8:00-9:00 AM, end around 8:00-10:00 PM. Space slots with reasonable travel/transition times. First slot of each day has travel_from_prev_min: 0.
- Weather: Provide plausible weather for the destination and time of year. Condition should be like "Sunny", "Partly Cloudy", "Rainy", "Cloudy", etc. Icon should match (e.g. "sun", "cloud-sun", "cloud-rain", "cloud").
- Hotels: Generate 3 realistic hotel options matching the budget level. Use real hotel names in the destination. Stars: 2-5 matching budget. Price per night in USD.
- Flights: Generate 2-3 realistic round-trip flight options. If a specific origin city isn't clear, use "New York" as default origin. departure_time/arrival_time should be plausible flight schedules. Include airline names and realistic flight durations.
- Timezone: IANA timezone string for the destination (e.g. "Europe/Paris", "America/New_York", "Asia/Tokyo").
- Pass through the extracted data unchanged in the "extracted" field.
- Adapt the itinerary to match the user's interests and pace. If they love food, include more restaurant recommendations. If they prefer relaxed pace, don't over-schedule.
- The plan must feel like a thoughtfully curated trip, not a generic template. Vary activity types across days.`

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const body = JSON.parse(event.body ?? '{}')
    const prompt = (body.prompt ?? '').trim()

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'prompt required' }),
      }
    }

    let userMessage = `Trip request: "${prompt}"`

    if (body.city) userMessage += `\nDestination city: ${body.city}`
    if (body.country) userMessage += `\nDestination country: ${body.country}`

    if (body.answers && Object.keys(body.answers).length > 0) {
      userMessage += `\n\nClarification answers from user:`
      for (const [key, value] of Object.entries(body.answers as Record<string, string>)) {
        userMessage += `\n- ${key}: ${value}`
      }
    }

    userMessage += `\n\nCurrent date: ${new Date().toISOString().split('T')[0]}`

    console.log('[plan] calling Bedrock')

    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
          max_tokens: 8192,
          temperature: 0.7,
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
        itinerary: parsed.itinerary ?? [],
        hotels: parsed.hotels ?? [],
        flights: parsed.flights ?? [],
        destination_photo_url: parsed.destination_photo_url ?? null,
        timezone: parsed.timezone ?? null,
      }),
    }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }
    console.error('[plan] error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Planning failed' }),
    }
  }
}
