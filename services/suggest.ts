import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { getCachedSuggestions, setCachedSuggestions } from './lib/cache'
import { searchPlaces } from './lib/serpapi'
import { enrichWithFoursquarePhotos } from './lib/foursquare'
import type { SuggestResponse } from './lib/types'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const destination = event.queryStringParameters?.destination
    const category = event.queryStringParameters?.category ?? 'all'

    if (!destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'destination required' }) }
    }

    console.log('[suggest] destination:', destination, 'category:', category, 'userId:', userId)

    // Check cache first
    const cached = await getCachedSuggestions(destination, category)
    if (cached) {
      console.log('[suggest] cache hit, returning', cached.length, 'suggestions')
      const response: SuggestResponse = { suggestions: cached, source: 'cache' }
      return { statusCode: 200, body: JSON.stringify(response) }
    }

    console.log('[suggest] cache miss, calling SerpAPI')

    // Search SerpAPI for places matching category
    const suggestions = await searchPlaces(destination, category, { limit: 10 })

    console.log('[suggest] SerpAPI returned', suggestions.length, 'suggestions')

    // Enrich with Foursquare venue photos (replaces stock/thumbnail images with real place photos)
    const enriched = await enrichWithFoursquarePhotos(suggestions)
    console.log('[suggest] foursquare photo enrichment complete')

    // Cache results (30min default TTL)
    if (enriched.length > 0) {
      await setCachedSuggestions(destination, category, enriched)
    }

    const response: SuggestResponse = { suggestions: enriched, source: 'fresh' }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('suggest error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
