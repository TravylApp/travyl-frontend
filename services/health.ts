import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  timestamp: string
  services: {
    api: boolean
    auth: boolean
  }
}

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const timestamp = new Date().toISOString()

  // Check auth service (Supabase) is configured
  const authConfigured = !!Resource.SupabaseUrl.value && Resource.SupabaseUrl.value !== 'placeholder'

  const response: HealthResponse = {
    status: authConfigured ? 'healthy' : 'degraded',
    version: process.env.SST_APP_VERSION || 'unknown',
    timestamp,
    services: {
      api: true,
      auth: authConfigured,
    },
  }

  const statusCode = response.status === 'unhealthy' ? 503 : 200

  return {
    statusCode,
    body: JSON.stringify(response),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  }
}