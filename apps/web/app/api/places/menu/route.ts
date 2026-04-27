import { NextRequest } from 'next/server'
import { getRequiredParams, getOptionalParam, proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'places-menu', 30, 60000)
  if (rl) return rl
  const params = getRequiredParams(req, 'name')
  if (params instanceof Response) return params

  const extra: Record<string, string> = { name: params.name }
  const city = getOptionalParam(req, 'city', '')
  if (city) extra.city = city

  return proxyToBackend('/api/places/menu', req, { params: extra })
}
