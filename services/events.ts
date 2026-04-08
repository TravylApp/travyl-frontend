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

    const city = destination.split(',')[0].trim()
    console.log('[events] cache miss, fetching Ticketmaster for:', city)

    const params = new URLSearchParams({
      city,
      startDateTime: `${startDate}T00:00:00Z`,
      endDateTime: `${endDate}T23:59:59Z`,
      size: '200',
      apikey: Resource.TicketmasterApiKey.value,
    })

    const res = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
    )

    if (!res.ok) {
      console.error('[events] Ticketmaster error:', res.status, await res.text().catch(() => ''))
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch events' }) }
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
