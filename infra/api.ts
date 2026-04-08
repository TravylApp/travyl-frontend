import { activityCdn, cacheTable, placeIndex, userInteractions } from './storage'
import { bus } from './events'
import { supabaseSecretKey, supabaseUrl, serpApiKey, pexels, foursquareApiKey, ticketmasterApiKey, openTableAffiliateKey, openExchangeRatesAppId, predicthqApiKey } from './secrets'

export const email = new sst.aws.Email('TravylEmail', {
  sender: 'gotravyl.com',
  dns: false,
})

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
  link: [activityCdn, cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey, foursquareApiKey],
  environment: {
    PLACE_INDEX_NAME: placeIndex.indexName,
  },
  permissions: [
    {
      actions: ['geo:SearchPlaceIndexForText', 'geo:GetPlace'],
      resources: [placeIndex.indexArn],
    },
  ],
})

api.route('POST /fill-gaps', {
  handler: 'services/fill-gaps.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey],
})

api.route('GET /search', {
  handler: 'services/search.handler',
  link: [activityCdn, supabaseSecretKey, supabaseUrl, serpApiKey],
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
  link: [supabaseSecretKey, supabaseUrl, pexels],
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

api.route('GET /entity-search', {
  handler: 'services/entity-search.handler',
  link: [supabaseSecretKey, supabaseUrl],
})

api.route('GET /recommend', {
  handler: 'services/recommend.handler',
  link: [activityCdn, cacheTable, userInteractions, supabaseSecretKey, supabaseUrl, serpApiKey],
})

api.route('POST /invite', {
  handler: 'services/invite.handler',
  link: [supabaseSecretKey, supabaseUrl, email],
  environment: {
    APP_URL: $app.stage === 'production' ? 'https://gotravyl.com' : 'http://localhost:3000',
  },
})

api.route('POST /packing-suggest', {
  handler: 'services/packing-suggest.handler',
  link: [supabaseSecretKey, supabaseUrl],
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'],
    },
  ],
})

api.route('GET /activity-intelligence', {
  handler: 'services/activity-intelligence.handler',
  link: [activityCdn, cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey],
})

api.route('GET /day-intelligence', {
  handler: 'services/day-intelligence.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey],
})

api.route('GET /discover', {
  handler: 'services/discover.handler',
  link: [activityCdn, cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey],
})

api.route('GET /parse-intent', {
  handler: 'services/parse-intent.handler',
  link: [supabaseSecretKey, supabaseUrl],
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'],
    },
  ],
})

api.route('GET /search/quick', {
  handler: 'services/search-quick.handler',
  link: [supabaseSecretKey, supabaseUrl],
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0'],
    },
  ],
})

api.route('GET /search/deep', {
  handler: 'services/search-deep.handler',
  link: [supabaseSecretKey, supabaseUrl, serpApiKey, foursquareApiKey, cacheTable],
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'],
    },
  ],
})

api.route('GET /places/search', {
  handler: 'services/place-search.handler',
  link: [supabaseSecretKey, supabaseUrl, serpApiKey],
})

api.route('GET /api/images/search', {
  handler: 'services/image-search.handler',
  link: [pexels],
})

api.route('GET /api/images/destination', {
  handler: 'services/image-destination.handler',
  link: [pexels],
})

api.route('GET /api/exchange-rates', {
  handler: 'services/exchange-rates.handler',
  link: [openExchangeRatesAppId],
})

api.route('GET /api/events/search', {
  handler: 'services/events-search.handler',
  link: [predicthqApiKey, cacheTable],
})

api.route('GET /events', {
  handler: 'services/events.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, ticketmasterApiKey],
})

api.route('POST /book/match', {
  handler: 'services/book.handler',
  link: [supabaseSecretKey, supabaseUrl, openTableAffiliateKey, ticketmasterApiKey],
  timeout: '30 seconds',
})

api.route('GET /book/status/{tripId}', {
  handler: 'services/book.statusHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
})
