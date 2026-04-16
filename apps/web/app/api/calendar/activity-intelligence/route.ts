import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  return proxyToBackend('/activity-intelligence', req, {
    params: {
      activityId: sp.get('activityId') ?? '',
      tripId: sp.get('tripId') ?? '',
    },
  })
}
