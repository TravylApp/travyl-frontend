import { NextRequest } from 'next/server'
import { proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 'calendar-regenerate-activity', 30, 60000)
  if (rl) return rl
  return proxyToBackend('/regenerate/activity', req)
}
