import { cacheTable } from './storage'
import { bus } from './events'
import { supabaseServiceRoleKey, supabaseUrl } from './secrets'

export const api = new sst.aws.ApiGatewayV2('RecommendationApi', {
  cors: {
    allowOrigins: ['http://localhost:3000', 'https://*.vercel.app'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
  },
})

api.route('GET /suggest', {
  handler: 'services/suggest.handler',
  link: [cacheTable, supabaseServiceRoleKey, supabaseUrl],
})

api.route('GET /search', {
  handler: 'services/search.handler',
  link: [supabaseServiceRoleKey, supabaseUrl],
})

api.route('POST /interact', {
  handler: 'services/interact.handler',
  link: [bus, supabaseServiceRoleKey, supabaseUrl],
})
