import { Resource } from 'sst'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { validateAuth } from './lib/auth'
import { getCachedSuggestions, setCachedSuggestions } from './lib/cache'
import { searchPlaces } from './lib/serpapi'
import { rerank } from './lib/affinity'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const PAGE_SIZE = 20

async function getAffinityScores(
  userId: string,
): Promise<Record<string, number> | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.UserInteractions.name,
      Key: { pk: `USER#${userId}`, sk: 'AFFINITY' },
    }),
  )

  if (!result.Item?.categoryScores) return null
  return result.Item.categoryScores as Record<string, number>
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const destination = event.queryStringParameters?.destination
    const category = event.queryStringParameters?.category ?? 'all'
    const start = parseInt(event.queryStringParameters?.start ?? '0', 10)

    if (!destination) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'destination required' }),
      }
    }

    console.log(
      '[recommend] destination:', destination,
      'category:', category,
      'start:', start,
      'userId:', userId,
    )

    // Fetch suggestions (cache-first, same as /suggest)
    let suggestions = await getCachedSuggestions(destination, category)

    if (!suggestions) {
      console.log('[recommend] cache miss, calling SerpAPI')
      suggestions = await searchPlaces(destination, category, { limit: 20 })

      if (suggestions.length > 0) {
        await setCachedSuggestions(destination, category, suggestions)
      }
    }

    // Load user affinity and re-rank
    const affinityScores = await getAffinityScores(userId)

    if (affinityScores) {
      console.log('[recommend] applying affinity re-ranking')
      suggestions = rerank(suggestions, affinityScores)
    }

    // Paginate after re-ranking
    const page = suggestions.slice(start, start + PAGE_SIZE)

    return {
      statusCode: 200,
      body: JSON.stringify({ suggestions: page }),
    }
  } catch (err: any) {
    if (
      err.message === 'Invalid token' ||
      err.message?.includes('Authorization')
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }
    console.error('recommend error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
