import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { searchPlaces } from './lib/location'
import type { SearchResponse } from './lib/types'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const query = event.queryStringParameters?.q
    const destination = event.queryStringParameters?.destination

    if (!query || !destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'q and destination required' }) }
    }

    // Search Amazon Location Services with user's query
    const results = await searchPlaces(destination, {
      query,
      maxResults: 10,
    })

    const response: SearchResponse = { results }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('search error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
