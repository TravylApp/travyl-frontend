import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const params: Record<string, string> = {}

  for (const key of ['placeId', 'name']) {
    const value = sp.get(key)
    if (value) params[key] = value
  }

  return proxyToBackend('/api/places/enrich', req, { params })
}
