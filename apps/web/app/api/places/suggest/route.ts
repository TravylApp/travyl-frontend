import { NextRequest } from 'next/server'
import { getRequiredParams, getOptionalParam, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'destination')
  if (params instanceof Response) return params

  const extra: Record<string, string> = {
    destination: params.destination,
  }

  const category = getOptionalParam(req, 'category', 'all')
  const page = getOptionalParam(req, 'page', '0')
  const q = getOptionalParam(req, 'q', '')
  extra.category = category
  extra.page = page
  if (q) extra.q = q

  return proxyToBackend('/api/places/suggest', req, { params: extra })
}
