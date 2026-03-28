import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { SuggestionCard, LocalEvent } from './types'

export interface GapSuggestion {
  title: string
  type: string
  startHour: number
  duration: number
  latitude?: number
  longitude?: number
  address?: string
  rating?: number
  price?: number | null
  image?: string
  description?: string
}


const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

interface CacheEntry {
  pk: string
  sk: string
  suggestions: SuggestionCard[]
  expiresAt: number
}

export async function getCachedSuggestions(
  destination: string,
  category: string,
): Promise<SuggestionCard[] | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: `${destination}:${category}`, sk: 'suggestions' },
    }),
  )

  if (!result.Item) return null
  const entry = result.Item as CacheEntry
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.suggestions
}

export async function setCachedSuggestions(
  destination: string,
  category: string,
  suggestions: SuggestionCard[],
  ttlSeconds: number = 1800, // 30 min default
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: `${destination}:${category}`,
        sk: 'suggestions',
        suggestions,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}

interface EventsCacheEntry {
  pk: string
  sk: string
  events: LocalEvent[]
  expiresAt: number
}

export async function getCachedEvents(
  destination: string,
  startDate: string,
  endDate: string,
): Promise<LocalEvent[] | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: `events:${destination}:${startDate}:${endDate}`, sk: 'events' },
    }),
  )
  if (!result.Item) return null
  const entry = result.Item as EventsCacheEntry
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.events
}

export async function setCachedEvents(
  destination: string,
  startDate: string,
  endDate: string,
  events: LocalEvent[],
  ttlSeconds = 86400,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: `events:${destination}:${startDate}:${endDate}`,
        sk: 'events',
        events,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}

export async function getCachedGaps(
  tripId: string,
  date: string,
): Promise<GapSuggestion[] | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: `gaps:${tripId}:${date}`, sk: 'gaps' },
    }),
  )

  if (!result.Item) return null
  const entry = result.Item as { gaps: GapSuggestion[]; expiresAt: number }
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.gaps
}

export async function setCachedGaps(
  tripId: string,
  date: string,
  gaps: GapSuggestion[],
  ttlSeconds: number = 1800, // 30 min default
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: `gaps:${tripId}:${date}`,
        sk: 'gaps',
        gaps,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}
