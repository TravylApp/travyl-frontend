import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  return proxyToBackend('/day-intelligence', req, {
    params: {
      tripId: sp.get('tripId') ?? '',
      date: sp.get('date') ?? '',
    },
  })
}
