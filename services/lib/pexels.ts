// services/lib/pexels.ts
import { Resource } from 'sst'

interface PexelsPhoto {
  src: { large: string; large2x: string }
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[]
}

/**
 * Fetches the first landscape photo URL from Pexels for a given destination query.
 * Returns null on any error or if no photos are found.
 */
export async function fetchPexelsImage(destination: string): Promise<string | null> {
  const result = await fetchPexelsImages(destination, 1)
  return result?.url ?? null
}

/**
 * Fetches multiple landscape photo URLs from Pexels for a given query.
 * Returns `{ url, images }` on success, or null on any error.
 */
export async function fetchPexelsImages(
  query: string,
  perPage: number = 1,
): Promise<{ url: string; images: Array<{ url: string }> } | null> {
  const apiKey = Resource.Pexels.value
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', String(perPage))
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
    const images = data.photos
      .map((p) => p.src?.large2x)
      .filter((u): u is string => !!u)
      .map((u) => ({ url: u }))
    if (images.length === 0) return null
    return { url: images[0].url, images }
  } catch (err) {
    console.error('[pexels] fetch error:', err)
    return null
  }
}
