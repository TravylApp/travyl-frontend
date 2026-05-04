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

// ─── GET /recommendations/generate ────────────────────────────

interface GenerateRequest {
  destination: string
  days: number
  interests: string[]
  budget: 'budget' | 'moderate' | 'luxury'
  travelers: number
}

interface DayPlan {
  day: number
  activities: Array<{
    time: string
    name: string
    category: string
    duration: number
    cost: 'free' | '$' | '$$' | '$$$'
  }>
}

interface GeneratedRecommendations {
  destination: string
  summary: string
  days: DayPlan[]
  totalEstimatedCost: string
}

export const generateHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const { destination, days, interests, budget, travelers } = event.queryStringParameters ?? {}

    if (!destination || !days) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'destination and days required' }),
      }
    }

    const dayCount = parseInt(days, 10)
    if (isNaN(dayCount) || dayCount < 1 || dayCount > 14) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'days must be 1-14' }),
      }
    }

    // Get user affinity scores
    const affinityScores = await getAffinityScores(userId)

    // Fetch suggestions for the destination
    let suggestions = await getCachedSuggestions(destination, 'all')

    if (!suggestions) {
      suggestions = await searchPlaces(destination, 'all', { limit: 50 })
      if (suggestions.length > 0) {
        await setCachedSuggestions(destination, 'all', suggestions)
      }
    }

    // Apply affinity re-ranking if available
    if (affinityScores) {
      suggestions = rerank(suggestions, affinityScores)
    }

    // Filter by interests if provided
    if (interests) {
      const interestList = interests.split(',')
      suggestions = suggestions.filter(s =>
        interestList.some(i => s.category?.toLowerCase().includes(i.toLowerCase()))
      )
    }

    // Generate day-by-day plan (simple algorithm)
    const dayPlans: DayPlan[] = []
    const activitiesPerDay = 3

    for (let day = 1; day <= dayCount; day++) {
      const dayActivities = suggestions.slice(
        (day - 1) * activitiesPerDay,
        day * activitiesPerDay
      ).map((s, idx) => ({
        time: idx === 0 ? '09:00' : idx === 1 ? '13:00' : '18:00',
        name: s.name,
        category: s.category || 'Attraction',
        duration: 2,
        cost: budget === 'luxury' ? '$$$' : budget === 'moderate' ? '$$' : '$' as const,
      }))

      dayPlans.push({ day, activities: dayActivities })
    }

    const costEstimate = budget === 'luxury' ? '$500-800/day' : budget === 'moderate' ? '$200-400/day' : '$50-150/day'

    const response: GeneratedRecommendations = {
      destination,
      summary: `${dayCount}-day itinerary for ${travelers || 2} travelers in ${destination}`,
      days: dayPlans,
      totalEstimatedCost: costEstimate,
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
    }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[recommendations/generate] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
