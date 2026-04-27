import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_24H, rateLimit } from '@/lib/api-utils'

const FALLBACK_URL = 'https://api.frankfurter.app'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'exchange-rates', 60, 60000)
  if (rl) return rl
  try {
    const base = requireParam(req.nextUrl.searchParams, 'base', 'e.g. USD')
    const primaryUrl = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`

    let res = await fetch(primaryUrl, CACHE_24H)

    // Fallback to Frankfurter if primary is down
    if (!res.ok) {
      res = await fetch(
        `${FALLBACK_URL}/latest?from=${encodeURIComponent(base)}`,
        CACHE_24H,
      )
    }

    if (!res.ok) return errorResponse('Exchange rate fetch failed', 502)
    const data = (await res.json()) as { rates: Record<string, number> }
    return jsonResponse({ rates: data.rates }, 86400)
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return errorResponse('Internal error', 500)
  }
}