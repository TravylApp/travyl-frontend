import { NextRequest } from 'next/server'
import { proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'calendar-day-intelligence', 60, 60000)
  if (rl) return rl
  const sp = req.nextUrl.searchParams
  return proxyToBackend('/day-intelligence', req, {
    params: {
      tripId: sp.get('tripId') ?? '',
      date: sp.get('date') ?? '',
    },
  })
}
