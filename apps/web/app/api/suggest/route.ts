import { NextRequest } from 'next/server'
import { proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'suggest', 60, 60000)
  if (rl) return rl
  const sp = req.nextUrl.searchParams
  const params: Record<string, string> = {}

  for (const key of ['destination', 'category', 'q', 'page']) {
    const value = sp.get(key)
    if (value) params[key] = value
  }

  return proxyToBackend('/suggest', req, { params })
}
