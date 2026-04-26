import { NextRequest } from 'next/server'
import { getRequiredParams, getOptionalParam, proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'weather', 60, 60000)
  if (rl) return rl
  const params = getRequiredParams(req, 'location')
  if (params instanceof Response) return params

  const days = getOptionalParam(req, 'days', '7')

  return proxyToBackend('/api/weather/forecast', req, {
    params: { location: params.location, days },
  })
}
