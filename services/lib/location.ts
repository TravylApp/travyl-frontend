// services/lib/location.ts
import { Resource } from 'sst'
import type { SuggestionCard } from '@travyl/shared'

const FSQ_BASE = 'https://api.foursquare.com/v3'

// --- Foursquare v3 response types ---

interface FsqCategory {
  id: number
  name: string
  short_name: string
  plural_name: string
  icon: { prefix: string; suffix: string }
}

interface FsqSearchPlace {
  fsq_id: string
  name: string
  categories: FsqCategory[]
  photos?: { prefix: string; suffix: string }[]
  rating?: number      // 0–10
  price?: number       // 1–4
  tips?: { text: string }[]
  geocodes: { main: { latitude: number; longitude: number } }
  location: { locality?: string; region?: string }
  description?: string
}

interface FsqSearchResponse {
  results: FsqSearchPlace[]
}

// --- Category mapping ---

const CATEGORY_MAP: Array<[string[], SuggestionCard['category']]> = [
  [['museum', 'gallery', 'exhibition'], 'museum'],
  [['restaurant', 'food', 'café', 'cafe', 'bar'], 'dining'],
  [['nightlife', 'club'], 'nightlife'],
  [['shopping', 'market', 'boutique'], 'shopping'],
  [['park', 'garden', 'trail', 'outdoor', 'nature'], 'outdoor'],
  [['theater', 'music', 'cultural', 'arts'], 'cultural'],
  [['tour', 'sightseeing', 'landmark', 'monument', 'historic'], 'sightseeing'],
]

function mapCategory(categories: FsqCategory[]): SuggestionCard['category'] {
  for (const cat of categories) {
    const lower = cat.name.toLowerCase()
    for (const [keywords, slug] of CATEGORY_MAP) {
      if (keywords.some((kw) => lower.includes(kw))) return slug
    }
  }
  return 'sightseeing'
}

// --- Field mapping ---

const PRICE_MAP: Record<number, number> = { 1: 10, 2: 25, 3: 50, 4: 100 }

function mapPlace(place: FsqSearchPlace, index: number, destination: string): SuggestionCard {
  const photo = place.photos?.[0]
  const imageUrl = photo ? `${photo.prefix}400x300${photo.suffix}` : ''
  const rating = place.rating != null ? Math.round((place.rating / 2) * 10) / 10 : null
  const price = place.price != null ? (PRICE_MAP[place.price] ?? null) : null

  return {
    id: `fsq-${place.fsq_id}`,
    name: place.name,
    category: mapCategory(place.categories),
    imageUrl,
    duration: 2, // Foursquare does not provide visit duration data
    price,
    currency: 'USD',
    rating,
    location: place.location.locality ?? place.location.region ?? destination,
    latitude: place.geocodes.main.latitude,
    longitude: place.geocodes.main.longitude,
    description: place.tips?.[0]?.text ?? place.description ?? '',
    source: 'ai',
    relevanceScore: Math.max(0, 1 - index * 0.05),
  }
}

// --- Public API (signature unchanged) ---

export async function searchPlaces(
  destination: string,
  options?: {
    query?: string
    maxResults?: number
  },
): Promise<SuggestionCard[]> {
  const { query, maxResults = 10 } = options ?? {}

  const url = new URL(`${FSQ_BASE}/places/search`)
  url.searchParams.set('query', query ?? 'things to do')
  url.searchParams.set('near', destination)
  url.searchParams.set('limit', String(maxResults))
  url.searchParams.set(
    'fields',
    'fsq_id,name,categories,photos,rating,price,tips,geocodes,location,description',
  )

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: Resource.FoursquareApiKey.value,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      console.error(`[location] Foursquare search failed: ${res.status}`, await res.text().catch(() => ''))
      return []
    }

    const data: FsqSearchResponse = await res.json()
    return data.results.map((place, i) => mapPlace(place, i, destination))
  } catch (err) {
    console.error('[location] searchPlaces failed:', err)
    return []
  }
}
