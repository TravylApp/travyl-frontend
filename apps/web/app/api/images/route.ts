import { NextRequest } from 'next/server'
import { getRequiredParams, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'q')
  if (params instanceof Response) return params

  const sp = req.nextUrl.searchParams
  const extra: Record<string, string> = { q: params.q }
  if (sp.has('type')) extra.type = sp.get('type')!
  if (sp.has('per_page')) extra.per_page = sp.get('per_page')!

  return proxyToBackend('/api/images/search', req, { params: extra })
}
