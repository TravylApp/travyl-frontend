import { NextRequest } from 'next/server'
import { proxyToBackend, rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const weatherQuerySchema = z.object({
  location: z.string().min(1).max(200),
  days: z.coerce.number().int().min(1).max(16).default(7),
})

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'weather', 60, 60000)
  if (rl) return rl
  const parsed = parseQuery(req, weatherQuerySchema)
  if (!parsed.ok) return parsed.response

  return proxyToBackend('/api/weather/forecast', req, {
    params: { location: parsed.data.location, days: String(parsed.data.days) },
  })
}
