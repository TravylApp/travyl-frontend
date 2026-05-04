import { Resource } from 'sst'
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import type { LocalEvent, EventsResponse } from './lib/types'
import { getCachedEvents, setCachedEvents } from './lib/cache'

interface PredictHQEvent {
  id: string
  title: string
  category: string
  start: string
  end?: string
  venue?: {
    name: string
    address?: string
  }
  images?: Array<{ url: string }>
  tickets_url?: string
  ticket_info?: {
    min_price?: number
    max_price?: number
    currency?: string
  }
}

interface PredictHQResponse {
  results: PredictHQEvent[]
}

const PREDICTHQ_BASE_URL = 'https://api.predicthq.com/v1/events/'

function normalizeCategory(category: string): LocalEvent['category'] {
  const cat = category.toLowerCase()
  if (cat.includes('music') || cat.includes('concert')) return 'music'
  if (cat.includes('sports')) return 'sports'
  if (cat.includes('arts') || cat.includes('theatre') || cat.includes('performing')) return 'arts'
  if (cat.includes('family') || cat.includes('community')) return 'family'
  if (cat.includes('festivals') || cat.includes('fair')) return 'festival'
  return 'other'
}

function parseISODateTime(isoString: string): { date: string; time: string } {
  const date = new Date(isoString)
  return {
    date: date.toISOString().split('T')[0], // YYYY-MM-DD
    time: date.toTimeString().slice(0, 5), // HH:mm
  }
}

function mapPredictHQEvent(event: PredictHQEvent): LocalEvent {
  const start = parseISODateTime(event.start)
  const end = event.end ? parseISODateTime(event.end) : undefined

  return {
    id: event.id,
    name: event.title,
    category: normalizeCategory(event.category),
    date: start.date,
    startTime: start.time,
    endTime: end?.time,
    venueName: event.venue?.name ?? 'Unknown Venue',
    venueAddress: event.venue?.address,
    imageUrl: event.images?.[0]?.url,
    ticketUrl: event.tickets_url ?? '#',
    priceMin: event.ticket_info?.min_price,
    priceMax: event.ticket_info?.max_price,
    currency: event.ticket_info?.currency,
  }
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2<EventsResponse>> {
  const query = event.queryStringParameters || {}
  const city = query.city
  const country = query.country
  const startDate = query.start_date
  const endDate = query.end_date

  if (!city) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required parameter: city' }),
    }
  }

  // Build cache key from destination and date range
  const destination = country ? `${city}, ${country}` : city
  const cacheKeyStart = startDate ?? 'any'
  const cacheKeyEnd = endDate ?? 'any'

  // Check cache first
  try {
    const cached = await getCachedEvents(destination, cacheKeyStart, cacheKeyEnd)
    if (cached) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: cached }),
      }
    }
  } catch (err) {
    console.error('Cache read error:', err)
  }

  // Build PredictHQ query
  const queryParams = new URLSearchParams()
  queryParams.set('q', city)
  queryParams.set('limit', '20')
  queryParams.set('sort', 'start')

  if (startDate) {
    queryParams.set('active.gte', startDate)
  }
  if (endDate) {
    queryParams.set('active.lte', endDate)
  }

  // Add category filter for relevant event types
  queryParams.set('category', 'sports,performing-arts,concerts,community,festivals')

  const apiKey = Resource.PredicthqApiKey.value

  if (!apiKey) {
    console.error('PredictHQ API key not configured')
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [] }),
    }
  }

  try {
    const res = await fetch(`${PREDICTHQ_BASE_URL}?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      console.error('PredictHQ API error:', res.status, await res.text())
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [] }),
      }
    }

    const data = (await res.json()) as PredictHQResponse
    const events = data.results.map(mapPredictHQEvent)

    // Cache results
    try {
      await setCachedEvents(destination, cacheKeyStart, cacheKeyEnd, events, 86400) // 24h cache
    } catch (err) {
      console.error('Cache write error:', err)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    }
  } catch (err) {
    console.error('Events search error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [] }),
    }
  }
}
