import {
  LocationClient,
  SearchPlaceIndexForTextCommand,
  GetPlaceCommand,
} from '@aws-sdk/client-location'
import type { SuggestionCard } from './types'

const client = new LocationClient({})
const PLACE_INDEX = process.env.PLACE_INDEX_NAME!

/** Category mapping from Amazon Location categories to our activity types */
const CATEGORY_MAP: Record<string, string> = {
  'Museum': 'museum',
  'Art Gallery': 'museum',
  'Tourist Attraction': 'sightseeing',
  'Monument': 'sightseeing',
  'Historical Monument': 'sightseeing',
  'Church': 'cultural',
  'Place of Worship': 'cultural',
  'Theater': 'cultural',
  'Restaurant': 'dining',
  'Cafe/Pub': 'dining',
  'Bar': 'nightlife',
  'Night Club': 'nightlife',
  'Shopping Center': 'shopping',
  'Market': 'shopping',
  'Park': 'outdoor',
  'Garden': 'outdoor',
  'Tour': 'tour',
}

function mapCategory(categories: string[] | undefined): string {
  if (!categories) return 'sightseeing'
  for (const cat of categories) {
    const mapped = CATEGORY_MAP[cat]
    if (mapped) return mapped
  }
  return 'sightseeing'
}

/**
 * Search for places/activities near a destination using Amazon Location Services.
 * Returns results mapped to our SuggestionCard format.
 */
export async function searchPlaces(
  destination: string,
  options?: {
    query?: string
    maxResults?: number
    categories?: string[]
  },
): Promise<SuggestionCard[]> {
  const { query, maxResults = 10, categories } = options ?? {}

  const command = new SearchPlaceIndexForTextCommand({
    IndexName: PLACE_INDEX,
    Text: query ? `${query} in ${destination}` : `things to do in ${destination}`,
    MaxResults: maxResults,
    FilterCategories: categories,
  })

  const result = await client.send(command)

  if (!result.Results) return []

  return result.Results
    .filter((r) => r.Place)
    .map((r, i) => {
      const place = r.Place!
      const point = place.Geometry?.Point ?? [0, 0]

      return {
        id: `loc-${r.PlaceId ?? i}`,
        name: place.Label?.split(',')[0] ?? 'Unknown',
        category: mapCategory(place.Categories) as SuggestionCard['category'],
        imageUrl: '', // Amazon Location doesn't provide images — filled by enrichment pipeline
        duration: 2,  // default estimate
        price: null,
        currency: 'EUR',
        rating: null, // Amazon Location doesn't provide ratings
        location: place.Municipality ?? place.SubRegion ?? destination,
        latitude: point[1],  // [lng, lat] format
        longitude: point[0],
        description: place.Label ?? '',
        source: 'ai' as const,
        relevanceScore: Math.max(0, 1 - i * 0.05), // rank-based score
      }
    })
}

/**
 * Get detailed info about a specific place by PlaceId.
 */
export async function getPlaceDetails(placeId: string) {
  const command = new GetPlaceCommand({
    IndexName: PLACE_INDEX,
    PlaceId: placeId,
  })

  return client.send(command)
}
