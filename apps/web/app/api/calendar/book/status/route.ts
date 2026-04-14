import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const tripId = req.nextUrl.searchParams.get('tripId') ?? ''
  return proxyToBackend(`/book/status/${tripId}`, req)
}
