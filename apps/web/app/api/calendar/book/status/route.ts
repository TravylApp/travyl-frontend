import { NextRequest } from 'next/server'
import { proxyToBackend, rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const bookStatusQuerySchema = z.object({ tripId: z.string().min(1) })

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'calendar-book-status', 60, 60000)
  if (rl) return rl
  const parsed = parseQuery(req, bookStatusQuerySchema)
  if (!parsed.ok) return parsed.response
  return proxyToBackend(`/book/status/${parsed.data.tripId}`, req)
}
