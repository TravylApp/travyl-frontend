import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H } from '@/lib/api-utils'

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
 * Fetch the official poster/artwork for an event via Google Images.
 * Returns the best image URL or null if nothing usable is found.
 */
async function fetchOfficialImage(eventTitle: string): Promise<string | null> {
  try {
    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('engine', 'google_images')
    url.searchParams.set('q', `${eventTitle} official event poster`)
    url.searchParams.set('num', '3')
    url.searchParams.set('api_key', SERPAPI_KEY)

    const res = await fetch(url.toString(), CACHE_1H)
    if (!res.ok) return null

    const data = await res.json()
    const results = data.images_results ?? []

    // Pick the best image — prefer large originals, skip tiny thumbnails and icons
    for (const r of results) {
      const img = r.original || r.thumbnail
      if (!img) continue
      // Skip tiny Google-cached thumbnails
      if (img.includes('encrypted-tbn') && img.includes('&s=10')) continue
      // Skip generic stock/icon images
      if (img.includes('placeholder') || img.includes('default_')) continue
      return img
    }
    return null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const query = getOptionalParam(req, 'city', '') || getOptionalParam(req, 'q', '')
  if (!query) return NextResponse.json([])

  if (!SERPAPI_KEY) {
    return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 503 })
  }

  try {
    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('engine', 'google_events')
    url.searchParams.set('q', query)
    url.searchParams.set('api_key', SERPAPI_KEY)

    const res = await fetch(url.toString(), CACHE_1H)
    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const events: SerpEvent[] = data.events_results ?? []

    // Fetch official images for ALL events in parallel
    const imageFetches = events.map(e => fetchOfficialImage(e.title))
    const officialImages = await Promise.allSettled(imageFetches)

    const mapped = events.map((e, i) => {
      // Use official poster first, fall back to SerpAPI event image/thumbnail
      const officialImg = officialImages[i].status === 'fulfilled' ? officialImages[i].value : null
      const photo = officialImg || e.image || e.thumbnail || ''

      const tickets = (e.ticket_info ?? []).filter(t => t.link_type === 'tickets')
      const moreInfo = (e.ticket_info ?? []).filter(t => t.link_type === 'more info')

      return {
        id: `event_${i}_${Math.random().toString(36).slice(2, 6)}`,
        name: e.title,
        date: e.date?.when || e.date?.start_date || '',
        time: e.date?.when || null,
        venue: e.venue?.name || (e.address?.[0]) || '',
        venue_rating: e.venue?.rating || null,
        venue_reviews: e.venue?.reviews || null,
        address: e.address?.join(', ') || '',
        lat: null,
        lng: null,
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

    return NextResponse.json(mapped)
  } catch (err) {
    console.error('[/api/events/search] SerpAPI error:', err)
    return NextResponse.json([])
  }
}
