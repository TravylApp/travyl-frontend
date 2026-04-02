import { NextRequest } from 'next/server'
import { getRequiredParams, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'destination')
  if (params instanceof Response) return params

  return proxyToBackend('/api/images/destination', req, {
    params: { destination: params.destination },
  })
}
