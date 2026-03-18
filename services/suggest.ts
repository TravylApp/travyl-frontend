import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { getCachedSuggestions, setCachedSuggestions } from './lib/cache'
import { searchPlaces } from './lib/location'
import type { SuggestResponse } from './lib/types'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const destination = event.queryStringParameters?.destination

    if (!destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'destination required' }) }
    }

    // Check cache first
    const cached = await getCachedSuggestions(userId, destination)
    if (cached) {
      const response: SuggestResponse = { suggestions: cached, source: 'cache' }
      return { statusCode: 200, body: JSON.stringify(response) }
    }

    // Query Amazon Location Services for POIs
    const suggestions = await searchPlaces(destination, { maxResults: 10 })

    // Cache for 30 minutes
    if (suggestions.length > 0) {
      await setCachedSuggestions(userId, destination, suggestions)
    }

    const response: SuggestResponse = { suggestions, source: 'fresh' }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('suggest error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
