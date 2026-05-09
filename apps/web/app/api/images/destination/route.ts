import { NextRequest } from 'next/server'
import { checkOrigin, rateLimit, proxyToBackend } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const imagesDestQuerySchema = z.object({
  destination: z.string().min(1).max(200),
})

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'images-destination', 60, 60000)
  if (blocked) return blocked

  const parsed = parseQuery(req, imagesDestQuerySchema)
  if (!parsed.ok) return parsed.response
  return proxyToBackend('/api/images/destination', req, {
    params: { destination: parsed.data.destination },
  })
}
