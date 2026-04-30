import { NextRequest } from 'next/server'
import { getRequiredParams, getOptionalParam, proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'places-enrich', 10, 60000)
  if (rl) return rl
  const params = getRequiredParams(req, 'placeId')
  if (params instanceof Response) return params

  const extra: Record<string, string> = { placeId: params.placeId }
  const name = getOptionalParam(req, 'name', '')
  if (name) extra.name = name

  return proxyToBackend('/api/places/enrich', req, { params: extra })
}
