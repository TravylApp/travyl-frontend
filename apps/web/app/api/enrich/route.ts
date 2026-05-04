import { NextRequest } from 'next/server'
import { proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'enrich', 10, 60000)
  if (rl) return rl
  const sp = req.nextUrl.searchParams
  const params: Record<string, string> = {}

  for (const key of ['placeId', 'name']) {
    const value = sp.get(key)
    if (value) params[key] = value
  }

  return proxyToBackend('/api/places/enrich', req, { params })
}
