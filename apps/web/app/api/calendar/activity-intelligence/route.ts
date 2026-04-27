import { NextRequest } from 'next/server'
import { proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'calendar-activity-intelligence', 60, 60000)
  if (rl) return rl
  const sp = req.nextUrl.searchParams
  return proxyToBackend('/activity-intelligence', req, {
    params: {
      activityId: sp.get('activityId') ?? '',
      tripId: sp.get('tripId') ?? '',
    },
  })
}
