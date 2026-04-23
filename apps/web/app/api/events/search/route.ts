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
  venue?: { name?: string; rating?: number; reviews?: number; link?: string }
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

    const mapped = events.map((e, i) => ({
      id: `event_${i}_${Math.random().toString(36).slice(2, 6)}`,
      name: e.title,
      date: e.date?.when || e.date?.start_date || '',
      time: e.date?.when || null,
      venue: e.venue?.name || (e.address?.[0]) || '',
      lat: null,
      lng: null,
      description: e.description || '',
      price: null,
      category: null,
      photo_url: e.thumbnail || '',
      link: e.link || '',
    }))

    return NextResponse.json(mapped)
  } catch (err) {
    console.error('[/api/events/search] SerpAPI error:', err)
    return NextResponse.json([])
  }
}
