import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'images-destination', 60, 60000)
  if (blocked) return blocked

  const destination = req.nextUrl.searchParams.get('destination')
  if (!destination) {
    return NextResponse.json({ error: 'Missing destination param' }, { status: 400 })
  }

  return proxyToBackend('/api/images/destination', req, {
    params: { destination },
  })
}
