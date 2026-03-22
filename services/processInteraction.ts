import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { ACTION_WEIGHTS } from './lib/affinity'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

interface InteractionDetail {
  userId: string
  suggestionId: string
  action: string
  category?: string
  tripId: string
  timestamp: string
}

export const handler = async (event: { detail: InteractionDetail }) => {
  const { userId, suggestionId, action, category, tripId, timestamp } =
    event.detail

  if (!category) {
    console.log('[processInteraction] skipping event without category')
    return
  }

  const weight = ACTION_WEIGHTS[action]
  if (weight === undefined) {
    console.log('[processInteraction] unknown action:', action)
    return
  }

  const tableName = Resource.UserInteractions.name

  // 1. Write raw event row (90-day TTL)
  const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60
  const ulid = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: `USER#${userId}`,
        sk: `INT#${timestamp}#${ulid}`,
        suggestionId,
        action,
        category,
        tripId,
        expiresAt: ttl,
      },
    }),
  )

  // 2. Atomic update affinity aggregate
  // First ensure the categoryScores map exists on the AFFINITY row
  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: `USER#${userId}`, sk: 'AFFINITY' },
      UpdateExpression:
        'SET categoryScores = if_not_exists(categoryScores, :empty), lastUpdated = :ts',
      ExpressionAttributeValues: { ':empty': {}, ':ts': timestamp },
    }),
  )

  if (weight > 0) {
    // Positive weight: SET with if_not_exists for the category key
    await client.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk: `USER#${userId}`, sk: 'AFFINITY' },
        UpdateExpression:
          'SET categoryScores.#cat = if_not_exists(categoryScores.#cat, :zero) + :w',
        ExpressionAttributeNames: { '#cat': category },
        ExpressionAttributeValues: { ':w': weight, ':zero': 0 },
      }),
    )
  } else {
    // Negative weight (dismiss): decrement but floor at 0
    try {
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { pk: `USER#${userId}`, sk: 'AFFINITY' },
          UpdateExpression:
            'SET categoryScores.#cat = if_not_exists(categoryScores.#cat, :zero) + :w',
          ConditionExpression:
            'attribute_not_exists(categoryScores.#cat) OR categoryScores.#cat >= :absw',
          ExpressionAttributeNames: { '#cat': category },
          ExpressionAttributeValues: {
            ':w': weight,
            ':zero': 0,
            ':absw': Math.abs(weight),
          },
        }),
      )
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        // Score would go negative — floor at 0
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: `USER#${userId}`, sk: 'AFFINITY' },
            UpdateExpression: 'SET categoryScores.#cat = :zero',
            ExpressionAttributeNames: { '#cat': category },
            ExpressionAttributeValues: { ':zero': 0 },
          }),
        )
      } else {
        throw err
      }
    }
  }

  console.log(
    '[processInteraction]',
    action,
    category,
    'weight:', weight,
    'user:', userId,
  )
}
