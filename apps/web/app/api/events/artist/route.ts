import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H, rateLimit } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY || ''

/**
 * Artist tour search — combines Google Events + Google organic for tour dates.
 * ?q=Drake — artist name
 * Returns upcoming tour dates with venues, dates, ticket links, and coordinates.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'events-artist', 20, 60000)
  if (rl) return rl
  const query = getOptionalParam(req, 'q', '')
  if (!query) return NextResponse.json([])
  if (!SERPAPI_KEY) return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 503 })

  try {
    // Fire Google Events + Google organic in parallel
    const [eventsRes, organicRes] = await Promise.all([
      // Google Events: direct concert search
      fetch(`https://serpapi.com/search.json?engine=google_events&q=${encodeURIComponent(`${query} concert tour`)}&api_key=${SERPAPI_KEY}`, CACHE_1H)
        .then(r => r.ok ? r.json() as Promise<any> : {} as any)
        .catch(() => ({})),
      // Google organic: find tour pages on Ticketmaster/LiveNation/Songkick
      fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(`${query} tour dates 2026 concert tickets`)}&api_key=${SERPAPI_KEY}`, CACHE_1H)
        .then(r => r.ok ? r.json() as Promise<any> : {} as any)
        .catch(() => ({})),
    ])

    const results: any[] = []

    // Map Google Events results
    const events = eventsRes.events_results ?? []
    for (const e of events) {
      // Skip events that don't seem related to the artist
      const title = (e.title || '').toLowerCase()
      const queryLower = query.toLowerCase()
      const words = queryLower.split(/\s+/)
      const isRelevant = words.some((w: string) => title.includes(w))
      if (!isRelevant) continue

      const address = (e.address || []).join(', ')
      let lat: number | null = null
      let lng: number | null = null

      // Geocode the venue
      if (address) {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
            { headers: { 'User-Agent': 'Travyl/1.0' } }
          )
          const geoData = await geoRes.json() as any[]
          if (geoData.length > 0) {
            lat = parseFloat(geoData[0].lat)
            lng = parseFloat(geoData[0].lon)
          }
        } catch {}
      }

      const tickets = (e.ticket_info ?? []).filter((t: any) => t.link_type === 'tickets')

      results.push({
        id: `tour_${results.length}`,
        name: e.title,
        date: e.date?.when || e.date?.start_date || '',
        venue: e.venue?.name || (e.address?.[0]) || '',
        address,
        lat,
        lng,
        image: e.image || e.thumbnail || '',
        description: e.description || '',
        link: e.link || '',
        ticket_links: tickets.map((t: any) => ({ source: t.source, url: t.link })),
        source: 'google_events',
      })
    }

    // Extract tour links from Google organic results
    const tourLinks: any[] = []
    for (const r of (organicRes.organic_results ?? []).slice(0, 8)) {
      const link = r.link || ''
      const isTicketSite = /ticketmaster|livenation|seatgeek|stubhub|axs\.com|bandsintown|songkick|spotify\.com\/concert/i.test(link)
      if (!isTicketSite) continue

      tourLinks.push({
        source: new URL(link).hostname.replace('www.', ''),
        url: link,
        title: r.title || '',
        snippet: r.snippet || '',
      })
    }

    return NextResponse.json({
      artist: query,
      events: results,
      tourLinks,
    })
  } catch (err) {
    return NextResponse.json({ artist: query, events: [], tourLinks: [] })
  }
}
