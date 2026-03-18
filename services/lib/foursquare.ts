import { Resource } from 'sst'
import type { SuggestionCard } from './types'

const FSQ_BASE = 'https://api.foursquare.com/v3'

interface FsqPlace {
  fsq_id: string
  name: string
  rating?: number        // 0-10
  price?: number         // 1-4
  description?: string
  tips?: { text: string }[]
  photos?: { prefix: string; suffix: string }[]
}

interface FsqMatchResponse {
  place?: FsqPlace
}

function getApiKey(): string {
  return Resource.FoursquareApiKey.value
}

async function fsqFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(`${FSQ_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: getApiKey(),
        Accept: 'application/json',
      },
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

async function matchPlace(name: string, lat: number, lng: number): Promise<FsqPlace | null> {
  const data = await fsqFetch<FsqMatchResponse>('/places/match', {
    name,
    ll: `${lat},${lng}`,
  })
  return data?.place ?? null
}

function buildPhotoUrl(photo: { prefix: string; suffix: string }, size = '400x300'): string {
  return `${photo.prefix}${size}${photo.suffix}`
}

/**
 * Enrich SuggestionCards (from Amazon Location) with Foursquare data.
 * Adds photos, ratings, prices, and descriptions where available.
 * Gracefully degrades — cards without a Foursquare match keep their original fields.
 */
export async function enrichSuggestions(suggestions: SuggestionCard[]): Promise<SuggestionCard[]> {
  const results = await Promise.allSettled(
    suggestions.map(async (suggestion) => {
      const place = await matchPlace(suggestion.name, suggestion.latitude, suggestion.longitude)
      if (!place) return suggestion

      return {
        ...suggestion,
        imageUrl: place.photos?.[0] ? buildPhotoUrl(place.photos[0]) : suggestion.imageUrl,
        rating: place.rating != null ? Math.round((place.rating / 2) * 10) / 10 : suggestion.rating,
        price: place.price != null ? [0, 10, 25, 50, 100][place.price] ?? suggestion.price : suggestion.price,
        description: place.tips?.[0]?.text ?? place.description ?? suggestion.description,
      }
    }),
  )

  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : suggestions[i]))
}
