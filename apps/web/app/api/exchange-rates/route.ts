import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_24H } from '@/app/api/lib/response'

export async function GET(req: NextRequest) {
  try {
    const base = requireParam(req.nextUrl.searchParams, 'base', 'e.g. USD')
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`,
      CACHE_24H
    )
    if (!res.ok) return errorResponse('Exchange rate fetch failed', 502)
    const data = (await res.json()) as { rates: Record<string, number> }
    return jsonResponse({ rates: data.rates }, 86400)
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return errorResponse('Internal error', 500)
  }
}
