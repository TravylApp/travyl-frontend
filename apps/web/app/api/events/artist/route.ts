import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H, rateLimit } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY || ''

/**
 * Artist tour search via SerpAPI Google Events + Google organic.
 * ?q=Drake — artist name
 *
 * Disambiguation is delegated to Google: the artist name is sent quoted
 * (`"Drake"`) so Google only returns results containing that exact phrase.
 * A substring check on the title catches stragglers — no hardcoded
 * stopwords or tokenization in our code.
 *
 * Note: Bandsintown's free API is no longer available for third-party access
 * (they've locked it down behind a paid integration partnership), so we rely
 * solely on Google here.
 */
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'events-artist', 20, 60000)
  if (rl) return rl
  const query = getOptionalParam(req, 'q', '').trim()
  if (!query) return NextResponse.json([])
  if (!SERPAPI_KEY) return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 503 })

  const queryLower = query.toLowerCase()
  const quotedQuery = `"${query}"`

  try {
    const [eventsRes, organicRes] = await Promise.all([
      fetch(`https://serpapi.com/search.json?engine=google_events&q=${encodeURIComponent(`${quotedQuery} concert tour`)}&api_key=${SERPAPI_KEY}`, CACHE_1H)
        .then(r => r.ok ? r.json() as Promise<any> : {} as any)
        .catch(() => ({})),
      fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(`${quotedQuery} tour dates concert tickets`)}&api_key=${SERPAPI_KEY}`, CACHE_1H)
        .then(r => r.ok ? r.json() as Promise<any> : {} as any)
        .catch(() => ({})),
    ])

    const seen = new Set<string>()
    const dedupeKey = (date: string, venue: string) =>
      `${(date || '').toLowerCase()}|${(venue || '').toLowerCase()}`

    const results: any[] = []
    const events = eventsRes.events_results ?? []

    for (const e of events) {
      const title = (e.title || '').toLowerCase()
      // Safety net: drop any event whose title doesn't contain the artist
      // phrase. Google's exact-phrase search already does the heavy lifting.
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
