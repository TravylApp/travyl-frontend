import { cacheTable, placeIndex } from './storage'
import { bus } from './events'
import { supabaseSecretKey, supabaseUrl, serpApiKey } from './secrets'

export const api = new sst.aws.ApiGatewayV2('RecommendationApi', {
  cors: {
    allowOrigins: ['*'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
  },
})

// IAM policy for Amazon Location Services
const locationPolicy = new aws.iam.Policy('LocationSearchPolicy', {
  policy: $jsonStringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [
          'geo:SearchPlaceIndexForText',
          'geo:SearchPlaceIndexForPosition',
          'geo:GetPlace',
        ],
        Resource: placeIndex.indexArn,
      },
    ],
  }),
})

api.route('GET /suggest', {
  handler: 'services/suggest.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey],
})

api.route('GET /search', {
  handler: 'services/search.handler',
  link: [supabaseSecretKey, supabaseUrl],
  environment: {
    PLACE_INDEX_NAME: placeIndex.indexName,
  },
  permissions: [
    {
      actions: ['geo:SearchPlaceIndexForText'],
      resources: [placeIndex.indexArn],
    },
  ],
})

api.route('POST /interact', {
  handler: 'services/interact.handler',
  link: [bus, supabaseSecretKey, supabaseUrl],
})

api.route('POST /index', {
  handler: 'services/index-trip.handler',
  link: [supabaseSecretKey, supabaseUrl],
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0'],
    },
  ],
})

api.route('GET /context-search', {
  handler: 'services/context-search.handler',
  link: [supabaseSecretKey, supabaseUrl],
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0'],
    },
  ],
})
