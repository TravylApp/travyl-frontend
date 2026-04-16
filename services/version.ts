import { APIGatewayProxyHandlerV2 } from 'aws-lambda'

interface VersionResponse {
  version: string
  commit: string
  buildDate: string
  environment: string
  api: {
    name: string
    version: string
  }
}

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const response: VersionResponse = {
    version: process.env.SST_APP_VERSION || '0.0.0',
    commit: process.env.GIT_COMMIT || 'unknown',
    buildDate: process.env.BUILD_DATE || new Date().toISOString(),
    environment: process.env.SST_STAGE || 'dev',
    api: {
      name: 'travyl-api',
      version: 'v1',
    },
  }

  return {
    statusCode: 200,
    body: JSON.stringify(response),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'max-age=3600',
    },
  }
}