import { NextRequest } from 'next/server'
import { proxyToBackend, rateLimit } from '@/lib/api-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  const rl = rateLimit(req, 'hotels-[id]', 30, 60000)
  if (rl) return rl
) {
  const { id } = await params
  return proxyToBackend(`/api/places/${encodeURIComponent(id)}`, req)
}
