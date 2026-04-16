// services/image-destination.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { fetchPexelsImages } from './lib/pexels'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const params = event.queryStringParameters ?? {}
    const destination = params.destination
    if (!destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required parameter: destination' }) }
    }

    const result = await fetchPexelsImages(destination, 1)
    if (!result) {
      return { statusCode: 404, body: JSON.stringify({ error: 'No images found' }) }
    }

    return { statusCode: 200, body: JSON.stringify({ url: result.url }) }
  } catch (err) {
    console.error('image-destination error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
