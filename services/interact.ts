import { Resource } from 'sst'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge'
import { validateAuth } from './lib/auth'
import type { InteractRequest } from './lib/types'

const eb = new EventBridgeClient({})

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'body required' }) }
    }

    const body: InteractRequest = JSON.parse(event.body)
    const { suggestionId, action, tripId, category } = body

    if (!suggestionId || !action || !tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'suggestionId, action, tripId required' }) }
    }

    await eb.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'travyl.recommendations',
            DetailType: 'suggestion.interaction',
            EventBusName: Resource.InteractionBus.name,
            Detail: JSON.stringify({
              userId,
              suggestionId,
              action,
              category,
              tripId,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      }),
    )

    return { statusCode: 202, body: '' }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('interact error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
