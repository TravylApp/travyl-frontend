import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H, rateLimit } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY || ''
const BANDSINTOWN_APP_ID = process.env.BANDSINTOWN_APP_ID || 'travyl'

/**
 * Artist tour search.
 *
 * Two sources, weighted in this order:
 *   1. Bandsintown — canonical artist database. Disambiguates by artist ID
 *      server-side ("Drake" the rapper, not "Drake Milligan" the country
 *      singer), so its hits are trusted and surfaced first.
 *   2. SerpAPI Google Events — broader coverage for artists Bandsintown
 *      doesn't track. Filtered down to titles that contain the artist phrase.
 *
 * Results are deduped by `${date}|${venue}` so the same show doesn't appear
 * twice when both sources see it.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'events-artist', 20, 60000)
  if (rl) return rl
  const query = getOptionalParam(req, 'q', '').trim()
  if (!query) return NextResponse.json([])

  const queryLower = query.toLowerCase()
  const quotedQuery = `"${query}"`

  try {
    const [bitEventsRaw, eventsRes, organicRes] = await Promise.all([
      // Bandsintown: artist-disambiguated event list
      fetch(
        `https://rest.bandsintown.com/artists/${encodeURIComponent(query)}/events?app_id=${encodeURIComponent(BANDSINTOWN_APP_ID)}`,
        { ...CACHE_1H, headers: { Accept: 'application/json' } },
      )
        .then(r => r.ok ? r.json() as Promise<any[]> : [] as any[])
        .catch(() => [] as any[]),
      // Google Events with quoted artist
      SERPAPI_KEY
        ? fetch(`https://serpapi.com/search.json?engine=google_events&q=${encodeURIComponent(`${quotedQuery} concert tour`)}&api_key=${SERPAPI_KEY}`, CACHE_1H)
            .then(r => r.ok ? r.json() as Promise<any> : {} as any)
            .catch(() => ({}))
        : Promise.resolve({}),
      // Google organic for ticket links
      SERPAPI_KEY
        ? fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(`${quotedQuery} tour dates concert tickets`)}&api_key=${SERPAPI_KEY}`, CACHE_1H)
            .then(r => r.ok ? r.json() as Promise<any> : {} as any)
            .catch(() => ({}))
        : Promise.resolve({}),
    ])

    const seen = new Set<string>()
    const dedupeKey = (date: string, venue: string) =>
      `${(date || '').toLowerCase()}|${(venue || '').toLowerCase()}`

    const results: any[] = []

    // 1. Bandsintown — trusted, comes first
    const bitEvents = Array.isArray(bitEventsRaw) ? bitEventsRaw : []
    for (const e of bitEvents) {
      const venue = e.venue || {}
      const date = e.datetime || ''
      const venueName = venue.name || ''
      const key = dedupeKey(date, venueName)
      if (seen.has(key)) continue
      seen.add(key)

      const lat = typeof venue.latitude === 'string' ? parseFloat(venue.latitude) : (venue.latitude ?? null)
      const lng = typeof venue.longitude === 'string' ? parseFloat(venue.longitude) : (venue.longitude ?? null)
      const address = [venue.name, venue.city, venue.region, venue.country].filter(Boolean).join(', ')
      const ticket_links = (e.offers ?? [])
        .filter((o: any) => o.type === 'Tickets' && o.url)
        .map((o: any) => ({ source: o.status || 'Bandsintown', url: o.url }))

      results.push({
        id: `tour_${results.length}`,
        name: e.lineup?.[0] || query,
        date,
        venue: venueName,
        address,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        image: e.artist?.image_url || '',
        description: e.description || '',
        link: e.url || '',
        ticket_links,
        source: 'bandsintown',
      })
    }

    // 2. Google Events — fill gaps Bandsintown missed
    const events = eventsRes.events_results ?? []
    for (const e of events) {
      const title = (e.title || '').toLowerCase()
      if (!title.includes(queryLower)) continue

      const date = e.date?.when || e.date?.start_date || ''
      const venueName = e.venue?.name || (e.address?.[0]) || ''
      const key = dedupeKey(date, venueName)
      if (seen.has(key)) continue
      seen.add(key)

      const address = (e.address || []).join(', ')
      let lat: number | null = null
      let lng: number | null = null
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
        date,
        venue: venueName,
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

    // Tour links from Google organic — title or snippet must mention the artist
    const tourLinks: any[] = []
    for (const r of (organicRes.organic_results ?? []).slice(0, 8)) {
      const link = r.link || ''
      if (!link) continue
      const haystack = `${r.title || ''} ${r.snippet || ''}`.toLowerCase()
      if (!haystack.includes(queryLower)) continue

      tourLinks.push({
        source: new URL(link).hostname.replace('www.', ''),
        url: link,
        title: r.title || '',
        snippet: r.snippet || '',
      })
    }

    return NextResponse.json({ artist: query, events: results, tourLinks })
  } catch (err) {
    return NextResponse.json({ artist: query, events: [], tourLinks: [] })
  }
}
