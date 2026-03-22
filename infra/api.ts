import { cacheTable } from './storage'
import { bus } from './events'
import { supabaseServiceRoleKey, supabaseUrl, foursquareApiKey } from './secrets'

export const api = new sst.aws.ApiGatewayV2('RecommendationApi', {
  cors: {
    allowOrigins: ['*'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
  },
})

api.route('GET /suggest', {
  handler: 'services/suggest.handler',
  link: [cacheTable, supabaseServiceRoleKey, supabaseUrl, foursquareApiKey],
})

api.route('GET /search', {
  handler: 'services/search.handler',
  link: [supabaseServiceRoleKey, supabaseUrl, foursquareApiKey],
})

api.route('POST /interact', {
  handler: 'services/interact.handler',
  link: [bus, supabaseServiceRoleKey, supabaseUrl],
})
