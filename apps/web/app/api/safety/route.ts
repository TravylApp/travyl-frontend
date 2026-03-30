import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_1H } from '@/lib/api-utils'

// ─── Response types ──────────────────────────────────────────────────────────

interface SafetyAdvisory {
  score: number
  message: string
  source: string
  updated: string
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const country = requireParam(req.nextUrl.searchParams, 'country', '2-letter ISO code')
    const countryCode = country.toUpperCase()

    const res = await fetch(
      `https://www.travel-advisory.info/api?countrycode=${encodeURIComponent(countryCode)}`,
      CACHE_1H
    )

    if (!res.ok) return errorResponse('Travel advisory fetch failed', res.status)

    const data = await res.json()
    const entry = data?.data?.[countryCode]

    if (!entry) return errorResponse(`No advisory data found for country: ${countryCode}`, 404)

    const advisory = entry.advisory
    const result: SafetyAdvisory = {
      score: advisory.score ?? 0,
      message: advisory.message ?? '',
      source: advisory.source ?? '',
      updated: advisory.updated ?? '',
    }

    return jsonResponse(result)
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return errorResponse('Travel advisory service unavailable', 500)
  }
}
