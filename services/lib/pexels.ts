// services/lib/pexels.ts
import { Resource } from 'sst'

interface PexelsPhoto {
  src: { large: string }
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[]
}

/**
 * Fetches the first landscape photo URL from Pexels for a given destination query.
 * Returns null on any error or if no photos are found.
 */
export async function fetchPexelsImage(destination: string): Promise<string | null> {
  const apiKey = Resource.Pexels.value
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', destination)
  url.searchParams.set('per_page', '1')
  url.searchParams.set('orientation', 'landscape')

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
    })
    if (!res.ok) {
      console.error(`[pexels] fetch failed: ${res.status}`)
      return null
    }
    const data = await res.json() as PexelsSearchResponse
    return data.photos[0]?.src?.large ?? null
  } catch (err) {
    console.error('[pexels] fetch error:', err)
    return null
  }
}
