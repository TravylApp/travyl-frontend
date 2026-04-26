import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, BACKEND_URL } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const city = getOptionalParam(req, 'city', '')
  if (!city) return NextResponse.json([])

  const start_date = getOptionalParam(req, 'start', '')
  const end_date = getOptionalParam(req, 'end', '')

  // Backend GET /events requires destination + date range
  if (!start_date || !end_date) return NextResponse.json([])

  if (!BACKEND_URL) {
    return NextResponse.json({ error: 'Backend URL not configured' }, { status: 503 })
  }

  const url = new URL('/events', BACKEND_URL)
  url.searchParams.set('destination', city)
  url.searchParams.set('startDate', start_date)
  url.searchParams.set('endDate', end_date)

  // Forward auth header
  const headers: HeadersInit = {}
  const auth = req.headers.get('authorization')
  if (auth) headers['Authorization'] = auth

  try {
    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      return NextResponse.json([])
    }

    const data = await res.json()
    // Backend returns { events: [...] }, callers expect flat array
    const events = Array.isArray(data?.events) ? data.events : []
    // Map backend field names to what callers expect
    const mapped = events.map((e: any) => ({
      id: e.id,
      title: e.name,
      description: e.category ?? '',
      category: e.category,
      date: e.date,
      venue: e.venueName,
      image: e.imageUrl,
      ticketUrl: e.ticketUrl,
    }))
    return NextResponse.json(mapped)
  } catch (err) {
    return NextResponse.json([])
  }
}
