import { Resource } from 'sst'
import type { SuggestionCard } from './types'

interface FsqPhoto {
  prefix: string
  suffix: string
}

interface FsqPlaceResult {
  fsq_id: string
  photos?: {
    count: number
    items: FsqPhoto[]
  }
}

interface FsqSearchResponse {
  results?: FsqPlaceResult[]
}

async function fetchFoursquarePhotos(
  name: string,
  lat: number,
  lng: number,
): Promise<string[] | null> {
  if (!lat || !lng) return null

  const params = new URLSearchParams({
    query: name,
    ll: `${lat},${lng}`,
    limit: '1',
    fields: 'fsq_id,photos',
  })

  try {
    const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
      headers: {
        Authorization: Resource.FoursquareApiKey.value,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      console.warn(`[foursquare] search failed: ${res.status}`)
      return null
    }

    const data = (await res.json()) as FsqSearchResponse
    const items = data.results?.[0]?.photos?.items
    if (!items?.length) return null

    return items.slice(0, 3).map((p) => `${p.prefix}original${p.suffix}`)
  } catch (err) {
    console.warn('[foursquare] fetch error:', err)
    return null
  }
}

/**
 * Enriches suggestion cards with real venue photos from Foursquare.
 * Only replaces imageUrl when Foursquare returns photos — keeps original otherwise.
 * All requests run in parallel with a 4s timeout each.
 */
export async function enrichWithFoursquarePhotos(
  suggestions: SuggestionCard[],
): Promise<SuggestionCard[]> {
  const enriched = await Promise.all(
    suggestions.map(async (s) => {
      const photos = await fetchFoursquarePhotos(s.name, s.latitude, s.longitude)
      if (!photos?.length) return s
      return {
        ...s,
        imageUrl: photos[0],
        imageUrls: photos,
      }
    }),
  )
  return enriched
}
