import { activityCdn, cacheTable, placeIndex, userInteractions, documentUploads } from './storage'
import { bus } from './events'
import { supabaseSecretKey, supabaseUrl, serpApiKey, pexels, foursquareApiKey, ticketmasterApiKey, openTableAffiliateKey, duffelApiToken, graphhopperApiKey, openchargeApiKey, openExchangeRatesAppId, predicthqApiKey, otpServerUrl, otpApiKey } from './secrets'

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

api.route('GET /recommendations/generate', {
  handler: 'services/recommend.generateHandler',
  link: [cacheTable, userInteractions, supabaseSecretKey, supabaseUrl, serpApiKey],
  timeout: '20 seconds',
})

api.route('POST /regenerate/activity', {
  handler: 'services/regenerate.handler',
  link: [supabaseSecretKey, supabaseUrl, serpApiKey],
  timeout: '20 seconds',
})

api.route('POST /regenerate/day', {
  handler: 'services/regenerate.dayHandler',
  link: [supabaseSecretKey, supabaseUrl, serpApiKey],
  timeout: '30 seconds',
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

// Trip extraction + planning are routed to the FastAPI backend
// (api.dev.gotravyl.com / api.gotravyl.com) via the Next.js proxy at
// apps/web/app/api/trips/{extract,plan}/route.ts. The Bedrock-based SST
// handlers below were retired with Justin's commit but the route
// registrations were left over and broke `sst deploy` because
// services/extract.ts and services/plan.ts were never committed.
//
// api.route('POST /api/trips/extract', { handler: 'services/extract.handler', ... })
// api.route('POST /api/trips/plan',    { handler: 'services/plan.handler',    ... })

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
  link: [supabaseSecretKey, supabaseUrl, serpApiKey, cacheTable],
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

api.route('GET /events/{id}/details', {
  handler: 'services/events.detailsHandler',
  link: [supabaseSecretKey, supabaseUrl, ticketmasterApiKey],
  timeout: '10 seconds',
})

api.route('POST /bookings/validate', {
  handler: 'services/bookings.validateHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '5 seconds',
})

api.route('GET /trips/{id}/itinerary', {
  handler: 'services/trips.itineraryHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
})

api.route('POST /trips/{id}/share', {
  handler: 'services/trips.shareHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '5 seconds',
})

api.route('GET /user/stats', {
  handler: 'services/user.statsHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
})

api.route('POST /trips/{id}/duplicate', {
  handler: 'services/trips.duplicateHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '15 seconds',
})

// Document OCR — upload presigned URL + parse via Claude Vision
api.route('POST /documents/upload-url', {
  handler: 'services/documents.handler',
  link: [supabaseSecretKey, supabaseUrl, documentUploads],
  permissions: [
    {
      actions: ['s3:PutObject'],
      resources: [$interpolate`${documentUploads.arn}/*`],
    },
  ],
  timeout: '10 seconds',
})

api.route('POST /documents/parse', {
  handler: 'services/documents.handler',
  link: [supabaseSecretKey, supabaseUrl, documentUploads],
  permissions: [
    {
      actions: ['s3:GetObject', 's3:DeleteObject'],
      resources: [$interpolate`${documentUploads.arn}/*`],
    },
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0'],
    },
  ],
  timeout: '60 seconds',
})

// Deprecated: use /restaurants/search instead
api.route('GET /restaurants/search/serp', {
  handler: 'services/restaurant-search.handler',
  link: [cacheTable, serpApiKey, openTableAffiliateKey],
  timeout: '10 seconds',
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

api.route('GET /restaurants/search', {
  handler: 'services/restaurants.handler',
  link: [supabaseSecretKey, supabaseUrl, openTableAffiliateKey],
  timeout: '15 seconds',
})

api.route('GET /restaurants/{id}/availability', {
  handler: 'services/restaurants.availabilityHandler',
  link: [supabaseSecretKey, supabaseUrl, openTableAffiliateKey],
  timeout: '10 seconds',
})

api.route('GET /flights/search', {
  handler: 'services/flights.handler',
  link: [supabaseSecretKey, supabaseUrl, duffelApiToken],
  timeout: '30 seconds',
})

api.route('GET /flights/{offerId}/details', {
  handler: 'services/flights.detailsHandler',
  link: [supabaseSecretKey, supabaseUrl, duffelApiToken],
  timeout: '15 seconds',
})

api.route('GET /weather/forecast', {
  handler: 'services/weather.handler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '15 seconds',
})

api.route('GET /transit/directions', {
  handler: 'services/transit-search.handler',
  link: [supabaseSecretKey, supabaseUrl, otpServerUrl, otpApiKey],
  timeout: '20 seconds',
})

api.route('POST /transit/optimize-route', {
  handler: 'services/transit.optimizeHandler',
  link: [supabaseSecretKey, supabaseUrl, graphhopperApiKey, otpServerUrl, otpApiKey],
  timeout: '30 seconds',
})

// Transit bookings CRUD
api.route('GET /transit/bookings', {
  handler: 'services/transit-bookings.listHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
})
api.route('POST /transit/book', {
  handler: 'services/transit-bookings.createHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
})
api.route('PUT /transit/book/{id}', {
  handler: 'services/transit-bookings.updateHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
})
api.route('DELETE /transit/book/{id}', {
  handler: 'services/transit-bookings.deleteHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
})

api.route('GET /timezone/convert', {
  handler: 'services/timezone.handler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
})

api.route('GET /charging/stations', {
  handler: 'services/charging.handler',
  link: [supabaseSecretKey, supabaseUrl, openchargeApiKey],
  timeout: '15 seconds',
})

api.route('GET /currency/convert', {
  handler: 'services/currency.handler',
  link: [supabaseSecretKey, supabaseUrl, openExchangeRatesAppId],
  timeout: '10 seconds',
})

// Public health check (no auth required)
api.route('GET /api/health', {
  handler: 'services/health.handler',
  link: [supabaseUrl],
  timeout: '5 seconds',
})

// Public version endpoint (no auth required)
api.route('GET /api/version', {
  handler: 'services/version.handler',
  timeout: '5 seconds',
})

api.route('GET /places/nearby', {
  handler: 'services/places.handler',
  link: [supabaseSecretKey, supabaseUrl, foursquareApiKey],
  timeout: '15 seconds',
})

// `services/place-detail.handler` was added by `bcaba4e7 feat: UI
// homogenization` but the handler file itself was never committed —
// SST then refused to deploy with "Handler not found". The Next.js
// route at `apps/web/app/api/search/place-detail/route.ts` already
// covers the same surface for the web app, so commenting this Lambda
// out doesn't lose any user-visible functionality. Restore once the
// real `services/place-detail.ts` lands.
// api.route('GET /api/places/{id}', {
//   handler: 'services/place-detail.handler',
//   link: [foursquareApiKey],
//   timeout: '10 seconds',
// })
