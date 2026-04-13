import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, BACKEND_URL } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY

interface EventResult {
  id: string
  title: string
  description: string
  category: string
  date: string
  venue: string
  image: string
  ticketUrl: string
}

// ─── SerpAPI Google Events (1 credit per call) ──────────────────────

async function fetchSerpEvents(city: string, limit: number): Promise<EventResult[]> {
  if (!SERPAPI_KEY) return []

  const params = new URLSearchParams({
    engine: 'google_events',
    q: `Events in ${city}`,
    api_key: SERPAPI_KEY,
    hl: 'en',
  })

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []

    const data = await res.json()
    const results = data.events_results ?? []

    // Prefer non-Google-proxied images; upscale Google thumbnails as fallback
    const pickImage = (e: any): string => {
      for (const url of [e.image, e.thumbnail]) {
        if (url && !url.includes('encrypted-tbn')) return url
      }
      // Google-proxied: append size hint for higher res
      const gImg = e.image || e.thumbnail
      if (gImg) return gImg + '&w=600'
      return ''
    }

    return results.slice(0, limit).map((e: any, i: number) => ({
      id: `event-${i}`,
      title: e.title ?? '',
      description: e.description ?? '',
      category: e.event_location_map?.type ?? 'Event',
      date: e.date?.when ?? e.date?.start_date ?? '',
      venue: e.venue?.name ?? e.address?.[0] ?? '',
      image: pickImage(e),
      ticketUrl: e.link ?? e.ticket_info?.link ?? '',
    }))
  } catch {
    return []
  }
}

// ─── Backend fallback (Eventbrite + PredictHQ) ──────────────────────

async function fetchBackendEvents(
  req: NextRequest,
  city: string,
  startDate: string,
  endDate: string,
): Promise<EventResult[]> {
  if (!BACKEND_URL || !startDate || !endDate) return []

  const url = new URL('/events', BACKEND_URL)
  url.searchParams.set('destination', city)
  url.searchParams.set('startDate', startDate)
  url.searchParams.set('endDate', endDate)

  const headers: HeadersInit = {}
  const auth = req.headers.get('authorization')
  if (auth) headers['Authorization'] = auth

  try {
    const res = await fetch(url.toString(), { headers })
    if (!res.ok) return []

    const data = await res.json()
    const events = Array.isArray(data?.events) ? data.events : []
    return events.map((e: any) => ({
      id: e.id,
      title: e.name,
      description: e.category ?? '',
      category: e.category,
      date: e.date,
      venue: e.venueName,
      image: e.imageUrl,
      ticketUrl: e.ticketUrl,
    }))
  } catch {
    return []
  }
}

// ─── Route handler ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const city = getOptionalParam(req, 'city', '')
  if (!city) return NextResponse.json([])

  const startDate = getOptionalParam(req, 'start', '')
  const endDate = getOptionalParam(req, 'end', '')
  const limit = parseInt(getOptionalParam(req, 'limit', '8'), 10)

  // Try SerpAPI first (returns images), fall back to backend
  const serpEvents = await fetchSerpEvents(city, limit)
  if (serpEvents.length > 0) return NextResponse.json(serpEvents)

  const backendEvents = await fetchBackendEvents(req, city, startDate, endDate)
  return NextResponse.json(backendEvents)
}
