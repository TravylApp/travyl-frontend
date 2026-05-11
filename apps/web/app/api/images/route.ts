import { NextRequest } from 'next/server'
import { proxyToBackend, rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const imagesQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.string().max(50).optional(),
  per_page: z.coerce.number().int().min(1).max(50).optional(),
})

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'images', 60, 60000)
  if (rl) return rl
  const parsed = parseQuery(req, imagesQuerySchema)
  if (!parsed.ok) return parsed.response

  const extra: Record<string, string> = { q: parsed.data.q }
  if (parsed.data.type) extra.type = parsed.data.type
  if (parsed.data.per_page) extra.per_page = String(parsed.data.per_page)

  return proxyToBackend('/api/images/search', req, { params: extra })
}
