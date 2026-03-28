import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const city = event.queryStringParameters?.city
    const startDate = event.queryStringParameters?.start_date
    const endDate = event.queryStringParameters?.end_date
    const country = event.queryStringParameters?.country

    if (!city) {
      return { statusCode: 400, body: JSON.stringify({ error: 'city required' }) }
    }

    console.log('[events-search] city:', city, 'userId:', userId)

    const token = Resource.EventbriteApiKey.value
    const location = country ? `${city}, ${country}` : city

    const params = new URLSearchParams({
      'location.address': location,
      expand: 'venue,category',
      sort_by: 'date',
    })

    if (startDate) {
      params.set('start_date.range_start', `${startDate}T00:00:00`)
    }
    if (endDate) {
      params.set('start_date.range_end', `${endDate}T23:59:59`)
    }

    const url = `https://www.eventbriteapi.com/v3/events/search/?${params.toString()}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[events-search] Eventbrite error:', res.status, body)
      return { statusCode: 200, body: JSON.stringify([]) }
    }

    const data = await res.json() as any
    const events = (data.events ?? []).slice(0, 20).map((e: any) => ({
      id: e.id,
      title: e.name?.text ?? '',
      date: e.start?.local?.split('T')[0] ?? '',
      venue: e.venue?.name ?? '',
      category: e.category?.name ?? 'Event',
      description: e.description?.text?.slice(0, 300) ?? '',
      image: e.logo?.original?.url ?? '',
      url: e.url ?? '',
    }))

    return { statusCode: 200, body: JSON.stringify(events) }
  } catch (err: any) {
    console.error('[events-search] error:', err)
    if (err.message?.includes('Authorization') || err.message?.includes('token')) {
      return { statusCode: 401, body: JSON.stringify({ error: err.message }) }
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
