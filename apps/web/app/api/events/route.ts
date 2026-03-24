import { NextRequest, NextResponse } from 'next/server'

const EVENTBRITE_KEY = process.env.EVENTBRITE_API_KEY
const PREDICTHQ_KEY = process.env.PREDICTHQ_API_KEY

interface EventItem {
  id: string
  title: string
  description: string
  category: string
  date: string
  end_date?: string
  image?: string
  url?: string
  venue?: string
  source: 'eventbrite' | 'predicthq'
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  const city = req.nextUrl.searchParams.get('city')
  const startDate = req.nextUrl.searchParams.get('start') // YYYY-MM-DD
  const endDate = req.nextUrl.searchParams.get('end')     // YYYY-MM-DD
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '8')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 })
  }

  const events: EventItem[] = []

  // 1. Try PredictHQ (better for real events — concerts, festivals, sports)
  if (PREDICTHQ_KEY) {
    try {
      const params = new URLSearchParams({
        'within': `10km@${lat},${lng}`,
        'category': 'concerts,festivals,performing-arts,sports,community,expos',
        'sort': 'start',
        'limit': String(limit),
        ...(startDate ? { 'start.gte': `${startDate}T00:00:00Z` } : {}),
        ...(endDate ? { 'start.lte': `${endDate}T23:59:59Z` } : {}),
      })

      const res = await fetch(`https://api.predicthq.com/v1/events/?${params}`, {
        headers: { Authorization: `Bearer ${PREDICTHQ_KEY}`, Accept: 'application/json' },
        next: { revalidate: 3600 },
      })

      if (res.ok) {
        const data = await res.json()
        for (const e of data.results ?? []) {
          events.push({
            id: `phq-${e.id}`,
            title: e.title,
            description: e.description || `${e.category} event`,
            category: mapPHQCategory(e.category),
            date: e.start?.split('T')[0] || '',
            end_date: e.end?.split('T')[0],
            venue: e.entities?.[0]?.name,
            source: 'predicthq',
          })
        }
      }
    } catch {}
  }

  // 2. Try Eventbrite (has images, ticket links)
  if (EVENTBRITE_KEY && events.length < limit) {
    try {
      const params = new URLSearchParams({
        'location.latitude': lat,
        'location.longitude': lng,
        'location.within': '10km',
        'expand': 'venue',
        ...(startDate ? { 'start_date.range_start': `${startDate}T00:00:00Z` } : {}),
        ...(endDate ? { 'start_date.range_end': `${endDate}T23:59:59Z` } : {}),
      })

      const res = await fetch(`https://www.eventbriteapi.com/v3/events/search/?${params}`, {
        headers: { Authorization: `Bearer ${EVENTBRITE_KEY}` },
        next: { revalidate: 3600 },
      })

      if (res.ok) {
        const data = await res.json()
        const remaining = limit - events.length
        for (const e of (data.events ?? []).slice(0, remaining)) {
          events.push({
            id: `eb-${e.id}`,
            title: e.name?.text || 'Event',
            description: e.description?.text?.slice(0, 200) || e.summary || '',
            category: mapEBCategory(e.category_id, e.subcategory_id),
            date: e.start?.local?.split('T')[0] || '',
            end_date: e.end?.local?.split('T')[0],
            image: e.logo?.original?.url || e.logo?.url,
            url: e.url,
            venue: e.venue?.name,
            source: 'eventbrite',
          })
        }
      }
    } catch {}
  }

  return NextResponse.json(events)
}

function mapPHQCategory(cat: string): string {
  const map: Record<string, string> = {
    'concerts': 'Concert',
    'festivals': 'Festival',
    'performing-arts': 'Performance',
    'sports': 'Sports',
    'community': 'Community',
    'expos': 'Exhibition',
    'conferences': 'Conference',
  }
  return map[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)
}

function mapEBCategory(catId?: string, subCatId?: string): string {
  // Eventbrite category IDs → human labels
  const map: Record<string, string> = {
    '103': 'Music', '105': 'Performance', '104': 'Film',
    '101': 'Business', '110': 'Food & Drink', '113': 'Community',
    '102': 'Science', '108': 'Sports', '107': 'Health',
    '109': 'Travel', '111': 'Charity', '112': 'Government',
    '114': 'Religion', '115': 'Family', '116': 'Holiday',
    '199': 'Other',
  }
  return map[catId ?? ''] || 'Event'
}
