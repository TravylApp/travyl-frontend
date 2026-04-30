import { NextRequest } from 'next/server'
import { getRequiredParams, proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'destination-image', 60, 60000)
  if (rl) return rl
  const params = getRequiredParams(req, 'destination')
  if (params instanceof Response) return params

  return proxyToBackend('/api/images/destination', req, { params: { destination: params.destination } })
}
