// services/image-search.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { fetchPexelsImages } from './lib/pexels'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const params = event.queryStringParameters ?? {}
    const query = params.q
    if (!query) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameter: q' }) }
    }

    const perPage = Math.min(Math.max(parseInt(params.per_page ?? '1', 10) || 1, 1), 10)

    const result = await fetchPexelsImages(query, perPage)
    if (!result) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No images found' }) }
    }

    const response: Record<string, unknown> = { url: result.url }
    if (perPage > 1 && result.images.length > 1) {
      response.images = result.images
    }

    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err) {
    console.error('image-search error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
