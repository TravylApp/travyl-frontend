import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H, rateLimit } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY || ''

interface SerpEvent {
  title: string
  date?: { start_date?: string; when?: string }
  address?: string[]
  link?: string
  description?: string
  thumbnail?: string
  image?: string
  venue?: { name?: string; rating?: number; reviews?: number; link?: string }
  ticket_info?: { source: string; link: string; link_type: string }[]
  event_location_map?: { image?: string; link?: string }
}

/**
 * Event search via SerpAPI Google Events.
 * ?q=EDC+Las+Vegas OR ?city=Los+Angeles — natural language query
 * ?pages=1 — number of pages to fetch (10 results each, default 2 = 20 results)
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'events-search', 20, 60000)
  if (rl) return rl
  const query = getOptionalParam(req, 'city', '') || getOptionalParam(req, 'q', '')
  if (!query) return NextResponse.json([])

  if (!SERPAPI_KEY) {
    return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 503 })
  }

  try {
    const pages = Math.min(parseInt(getOptionalParam(req, 'pages', '2')) || 2, 5)

    // Fetch multiple pages in parallel for more results
    const pageFetches = Array.from({ length: pages }, (_, i) => {
      const url = new URL('https://serpapi.com/search.json')
      url.searchParams.set('engine', 'google_events')
      url.searchParams.set('q', query)
      url.searchParams.set('start', String(i * 10))
      url.searchParams.set('api_key', SERPAPI_KEY)
      return fetch(url.toString(), CACHE_1H)
        .then(r => r.ok ? r.json() : { events_results: [] })
        .then(data => (data.events_results ?? []) as SerpEvent[])
        .catch(() => [] as SerpEvent[])
    })

    const allPages = await Promise.all(pageFetches)
    const events = allPages.flat()

    // Map events first, then batch-geocode unique addresses
    const mapped = events.map((e, i) => {
      const photo = e.image || e.thumbnail || ''
      const tickets = (e.ticket_info ?? []).filter(t => t.link_type === 'tickets')
      const moreInfo = (e.ticket_info ?? []).filter(t => t.link_type === 'more info')
      const address = e.address?.join(', ') || ''

      return {
        id: `event_${i}_${Math.random().toString(36).slice(2, 6)}`,
        name: e.title,
        date: e.date?.when || e.date?.start_date || '',
        time: e.date?.when || null,
        venue: e.venue?.name || (e.address?.[0]) || '',
        venue_rating: e.venue?.rating || null,
        venue_reviews: e.venue?.reviews || null,
        address,
        lat: null as number | null,
        lng: null as number | null,
        description: e.description || '',
        price: null,
        category: null,
        photo_url: photo,
        link: e.link || '',
        ticket_links: tickets.map(t => ({ source: t.source, url: t.link })),
        info_links: moreInfo.map(t => ({ source: t.source, url: t.link })),
        map_url: e.event_location_map?.link || null,
      }
    })

    // Batch geocode unique addresses (Nominatim rate limit: 1 req/sec)
    const uniqueAddresses = [...new Set(mapped.map(e => e.address).filter(Boolean))]
    const coordsMap = new Map<string, { lat: number; lng: number }>()
    for (const addr of uniqueAddresses.slice(0, 10)) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'Travyl/1.0' } }
        )
        const geoData = await geoRes.json() as any[]
        if (geoData.length > 0) {
          coordsMap.set(addr, { lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) })
        }
      } catch {}
    }

    // Apply coordinates to mapped events
    for (const event of mapped) {
      const coords = coordsMap.get(event.address)
      if (coords) {
        event.lat = coords.lat
        event.lng = coords.lng
      }
    }

    return NextResponse.json(mapped)
  } catch (err) {
    return NextResponse.json([])
  }
}
