import { NextRequest } from 'next/server'
import { proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'calendar-book-status', 60, 60000)
  if (rl) return rl
  const tripId = req.nextUrl.searchParams.get('tripId') ?? ''
  return proxyToBackend(`/book/status/${tripId}`, req)
}
