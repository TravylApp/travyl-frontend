import { NextRequest } from 'next/server'
import { getRequiredParams, proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'trip-events', 30, 60000)
  if (rl) return rl
  const params = getRequiredParams(req, 'destination', 'startDate', 'endDate')
  if (params instanceof Response) return params

  return proxyToBackend('/events', req, { params })
}
