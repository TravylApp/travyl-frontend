import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'
import { getCachedEvents, setCachedEvents } from './lib/cache'
import { validateQueryParams, validateDateRange } from './lib/validation'
import type { LocalEvent, EventsResponse } from './lib/types'

const FESTIVAL_KEYWORDS = ['festival', 'fair', 'carnival', 'expo', 'parade']

function mapCategory(classificationName: string, eventName: string): LocalEvent['category'] {
  switch (classificationName) {
    case 'Music': return 'music'
    case 'Sports': return 'sports'
    case 'Arts & Theatre': return 'arts'
    case 'Family': return 'family'
    case 'Miscellaneous': {
      const lower = eventName.toLowerCase()
      if (FESTIVAL_KEYWORDS.some(kw => lower.includes(kw))) return 'festival'
      return 'other'
    }
    default: return 'other'
  }
}

function normalizeEvent(raw: any): LocalEvent | null {
  try {
    const date = raw.dates?.start?.localDate as string | undefined
    const startTime = raw.dates?.start?.localTime as string | undefined
    if (!date || !startTime) {
      console.warn('[events] skipping event missing date/time:', raw.id, raw.name)
      return null
    }

    const classification = raw.classifications?.[0]
    const classificationName: string = classification?.segment?.name ?? ''
    const venueName: string = raw._embedded?.venues?.[0]?.name ?? 'Unknown venue'
    const venueAddress: string | undefined = raw._embedded?.venues?.[0]?.address?.line1

    // Prefer 16:9 image at ≥640px width, else first image
    const images: any[] = raw.images ?? []
    const image = images.find((img: any) => img.ratio === '16_9' && img.width >= 640) ?? images[0]

    return {
      id: raw.id as string,
      name: raw.name as string,
      category: mapCategory(classificationName, raw.name as string),
      date,
      startTime: startTime.slice(0, 5), // HH:mm
      venueName,
      venueAddress,
      imageUrl: image?.url,
      ticketUrl: raw.url as string,
      priceMin: raw.priceRanges?.[0]?.min,
      priceMax: raw.priceRanges?.[0]?.max,
      currency: raw.priceRanges?.[0]?.currency,
    }
  } catch {
    return null
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const { destination, startDate, endDate } = event.queryStringParameters ?? {}

    const paramsValid = validateQueryParams(
      { destination, startDate, endDate },
      ['destination', 'startDate', 'endDate'],
    )
    if (!paramsValid.success) {
      return paramsValid.error
    }

    const dateRangeValid = validateDateRange(startDate!, endDate!)
    if (!dateRangeValid.success) {
      return dateRangeValid.error
    }

    const cached = await getCachedEvents(destination, startDate, endDate)
    if (cached) {
      console.log('[events] cache hit:', cached.length, 'events')
      const response: EventsResponse = { events: cached }
      return { statusCode: 200, body: JSON.stringify(response) }
    }

    const apiKey = Resource.TicketmasterApiKey.value
    if (!apiKey || apiKey === 'placeholder') {
      return { statusCode: 503, body: JSON.stringify({ error: 'Event data source unavailable' }) }
    }

    const city = destination.split(',')[0].trim()
    console.log('[events] cache miss, fetching Ticketmaster for:', city)

    const params = new URLSearchParams({
      city,
      startDateTime: `${startDate}T00:00:00Z`,
      endDateTime: `${endDate}T23:59:59Z`,
      size: '200',
      apikey: apiKey,
    })

    const res = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
    )

    if (!res.ok) {
      console.error('[events] Ticketmaster error:', res.status, await res.text().catch(() => ''))
      return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch events' }) }
    }

    const data = await res.json()
    const rawEvents: any[] = data._embedded?.events ?? []

    const events: LocalEvent[] = rawEvents
      .map(normalizeEvent)
      .filter((e): e is LocalEvent => e !== null)
      .filter(e => e.date >= startDate && e.date <= endDate)

    console.log('[events] normalized', events.length, 'events from', rawEvents.length, 'raw')

    await setCachedEvents(destination, startDate, endDate, events)

    const response: EventsResponse = { events }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[events] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}

// ─── GET /events/{id}/details ─────────────────────────────────

interface EventDetails extends LocalEvent {
  description?: string
  ticketInfo: {
    minPrice?: number
    maxPrice?: number
    currency?: string
    onSale: boolean
    purchaseUrl: string
  }
  venue: {
    name: string
    address: string
    city: string
    coordinates: { lat: number; lng: number }
  }
}

const TM_BASE_URL = 'https://app.ticketmaster.com/discovery/v2'

export const detailsHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const eventId = event.pathParameters?.id
    if (!eventId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Event ID required' }) }
    }

    const apiKey = Resource.TicketmasterApiKey.value
    if (!apiKey || apiKey === 'placeholder') {
      return { statusCode: 503, body: JSON.stringify({ error: 'Event details unavailable' }) }
    }

    const params = new URLSearchParams({
      apikey: apiKey,
    })

    const res = await fetch(`${TM_BASE_URL}/events/${eventId}?${params}`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      if (res.status === 404) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Event not found' }) }
      }
      console.error('[events/details] Ticketmaster error:', res.status)
      return { statusCode: 502, body: JSON.stringify({ error: 'Failed to fetch event details' }) }
    }

    const data = await res.json()

    const priceRanges = data.priceRanges?.[0] || {}
    const venue = data._embedded?.venues?.[0] || {}

    const response: EventDetails = {
      id: data.id,
      name: data.name,
      category: mapCategory(data.classifications?.[0]?.segment?.name, data.name),
      date: data.dates?.start?.localDate,
      startTime: data.dates?.start?.localTime?.slice(0, 5),
      venueName: venue.name || 'Unknown venue',
      venueAddress: venue.address?.line1,
      description: data.description || data.pleaseNote,
      ticketInfo: {
        minPrice: priceRanges.min,
        maxPrice: priceRanges.max,
        currency: priceRanges.currency,
        onSale: data.dates?.status?.code === 'onsale',
        purchaseUrl: data.url,
      },
      venue: {
        name: venue.name,
        address: venue.address?.line1 || '',
        city: venue.city?.name || '',
        coordinates: {
          lat: parseFloat(venue.location?.latitude || '0'),
          lng: parseFloat(venue.location?.longitude || '0'),
        },
      },
    }

    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Event details timeout' }) }
    }
    console.error('[events/details] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
