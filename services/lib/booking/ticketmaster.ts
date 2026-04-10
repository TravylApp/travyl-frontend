import { Resource } from 'sst'
import type { BookingActivity, ProviderMatch } from './types'

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2'

interface TMEvent {
  name: string
  url: string
  _embedded?: {
    venues?: Array<{ location?: { latitude: string; longitude: string } }>
  }
}

export async function searchTicketmaster(
  activity: BookingActivity,
): Promise<ProviderMatch | null> {
  const apiKey = Resource.TicketmasterApiKey.value
  if (!apiKey || apiKey === 'placeholder') return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      keyword: activity.title,
      latlong: `${activity.latitude},${activity.longitude}`,
      radius: '25',
      unit: 'miles',
      size: '1',
      sort: 'relevance,desc',
    })
    // If the activity has a scheduled date, filter events around that date
    if (activity.scheduledDate) {
      const d = new Date(activity.scheduledDate)
      const start = d.toISOString().split('.')[0] + 'Z'
      const end = new Date(d.getTime() + 86400000).toISOString().split('.')[0] + 'Z'
      params.set('startDateTime', start)
      params.set('endDateTime', end)
    }

    const res = await fetch(`${BASE_URL}/events.json?${params}`, {
      signal: controller.signal,
    })

    if (!res.ok) return null
    const data = await res.json()
    const event: TMEvent | undefined = data._embedded?.events?.[0]
    if (!event) return null

    const venue = event._embedded?.venues?.[0]
    const lat = parseFloat(venue?.location?.latitude ?? String(activity.latitude))
    const lng = parseFloat(venue?.location?.longitude ?? String(activity.longitude))

    const affiliateUrl = `${event.url}${event.url.includes('?') ? '&' : '?'}utm_source=travyl`

    return {
      provider: 'ticketmaster',
      matchedName: event.name,
      bookingUrl: event.url,
      affiliateUrl,
      lat,
      lng,
    }
  } catch (err) {
    // Log error for debugging but return null to indicate no match
    console.error(`[ticketmaster] search failed for ${activity.title}:`, err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}
