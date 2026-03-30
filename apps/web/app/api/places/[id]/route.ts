import { NextRequest, NextResponse } from 'next/server'
import { upscaleGoogleImage } from '@travyl/shared'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

interface BackendPlace {
  id: string
  name: string
  lat: number
  lng: number
  category: string
  subcategory?: string
  rating: number
  review_count?: number
  price_level?: string | number | null
  description?: string | null
  photo_url?: string | null
  website?: string | null
  address?: string | null
  opening_hours?: Record<string, string>
  visit_duration_min?: number | null
  cuisine?: string | null
  tags?: string[]
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!API_URL) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  try {
    // Try a dedicated by-ID endpoint first
    const res = await fetch(`${API_URL}/api/places/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (res.status === 404) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    if (!res.ok) {
      return NextResponse.json({ error: 'Place not found' }, { status: 404 })
    }

    const p: BackendPlace = await res.json()

    const place = mapBackendPlace(p)

    const out = NextResponse.json(place)
    out.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return out
  } catch (err) {
    console.error('[places/id] Route error:', err)
    return NextResponse.json({ error: 'Failed to fetch place' }, { status: 500 })
  }
}

function mapBackendPlace(p: BackendPlace) {
  return {
    id: p.id,
    name: p.name,
    image: upscaleGoogleImage(p.photo_url) ?? getFallbackImage(p.name, 0),
    type: mapType(p.category),
    rating: p.rating ?? 0,
    tagline: p.description?.split('.')[0] ?? p.category,
    category: mapCategory(p.category, p.subcategory),
    description: p.description ?? '',
    latitude: p.lat,
    longitude: p.lng,
    reviewCount: p.review_count,
    address: p.address,
    website: p.website,
    priceLevel: mapPrice(p.price_level),
    hours: formatHours(p.opening_hours),
    duration: formatDuration(p.visit_duration_min),
    tags: mapTags(p.category, p.tags, p.cuisine),
  }
}

const FALLBACK_PHOTOS = [
  'photo-1488646953014-85cb44e25828', 'photo-1507525428034-b723cf961d3e',
  'photo-1476514525535-07fb3b4ae5f1', 'photo-1469854523086-cc02fe5d8800',
  'photo-1530789253388-582c481c54b0', 'photo-1502602898657-3e91760cbb34',
  'photo-1493976040374-85c8e12f0c0e', 'photo-1504150558240-0b4fd8946624',
  'photo-1528127269322-539801943592', 'photo-1558642452-9d2a7deb7f62',
  'photo-1506929562872-bb421503ef21', 'photo-1501785888041-af3ef285b470',
  'photo-1523906834658-6e24ef2386f9', 'photo-1504598318550-17eba1008a68',
  'photo-1516483638261-f4dbaf036963', 'photo-1526129318478-62ed807ebdf9',
]

function getFallbackImage(name: string, idx: number): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  const photoIdx = (Math.abs(hash) + idx) % FALLBACK_PHOTOS.length
  return `https://images.unsplash.com/${FALLBACK_PHOTOS[photoIdx]}?w=500&fit=crop&q=75`
}

function formatHours(hours?: Record<string, string>): string | undefined {
  if (!hours) return undefined
  const days = Object.entries(hours)
  if (days.length === 0) return undefined
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const today = dayNames[new Date().getDay()]
  if (hours[today]) return `Today: ${hours[today]}`
  return days[0][1]
}

function formatDuration(minutes?: number | null): string | undefined {
  if (!minutes) return undefined
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`
}

function mapType(backendCat: string): string {
  const cat = backendCat.toLowerCase()
  if (['restaurant', 'cafe', 'bar', 'dining'].includes(cat)) return 'restaurant'
  if (['museum', 'attraction', 'landmark', 'monument', 'sightseeing'].includes(cat)) return 'attraction'
  if (['park', 'garden', 'outdoor', 'beach'].includes(cat)) return 'experience'
  if (['event', 'festival', 'concert'].includes(cat)) return 'event'
  return 'destination'
}

function mapCategory(cat: string, sub?: string): string {
  const c = (sub ?? cat).toLowerCase()
  if (['restaurant', 'dining'].includes(c)) return 'Culinary'
  if (c === 'cafe') return 'Culinary'
  if (c === 'bar' || c === 'nightlife') return 'Music Festival'
  if (c === 'museum') return 'Historical'
  if (['attraction', 'landmark', 'monument', 'sightseeing'].includes(c)) return 'Landmark'
  if (['park', 'garden'].includes(c)) return 'Nature'
  if (c === 'beach') return 'Coastal'
  if (c === 'shopping') return 'Market'
  return 'Cultural'
}

function titleCase(s: string): string {
  return s.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

function mapTags(cat: string, backendTags?: string[], cuisine?: string | null): string[] {
  const tags: string[] = (backendTags ?? []).map(titleCase)
  const c = cat.toLowerCase()
  if (c === 'restaurant' || c === 'cafe' || c === 'dining') tags.push('Food')
  if (c === 'museum' || c === 'attraction' || c === 'sightseeing') tags.push('Culture', 'Landmark')
  if (c === 'park' || c === 'garden') tags.push('Nature')
  if (c === 'bar' || c === 'nightlife') tags.push('Nightlife', 'Bar')
  if (c === 'beach') tags.push('Beach', 'Coast')
  if (c === 'shopping') tags.push('Markets')
  if (cuisine) tags.push(titleCase(cuisine))
  return [...new Set(tags)]
}

function mapPrice(level: string | number | null | undefined): 1 | 2 | 3 | 4 | undefined {
  if (level == null) return undefined
  if (typeof level === 'number') {
    return level >= 1 && level <= 4 ? (level as 1 | 2 | 3 | 4) : undefined
  }
  const len = level.replace(/[^$]/g, '').length
  if (len >= 1 && len <= 4) return len as 1 | 2 | 3 | 4
  const num = parseInt(level, 10)
  if (num >= 1 && num <= 4) return num as 1 | 2 | 3 | 4
  return undefined
}
