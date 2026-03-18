import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { SuggestionCard } from './types'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

interface CacheEntry {
  pk: string
  sk: string
  suggestions: SuggestionCard[]
  expiresAt: number
}

export async function getCachedSuggestions(
  userId: string,
  destination: string,
): Promise<SuggestionCard[] | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: `${userId}:${destination}`, sk: 'suggestions' },
    }),
  )

  if (!result.Item) return null
  const entry = result.Item as CacheEntry
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.suggestions
}

export async function setCachedSuggestions(
  userId: string,
  destination: string,
  suggestions: SuggestionCard[],
  ttlSeconds: number = 1800, // 30 min default
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: `${userId}:${destination}`,
        sk: 'suggestions',
        suggestions,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}
