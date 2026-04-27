import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_1H, rateLimit } from '@/lib/api-utils'

// ─── Response types ──────────────────────────────────────────────────────────

interface WikiSummary {
  title: string | null
  extract: string | null
  thumbnail: string | null
  description: string | null
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'wiki', 60, 60000)
  if (rl) return rl
  try {
    const q = requireParam(req.nextUrl.searchParams, 'q')

    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
      CACHE_1H
    )

    if (!res.ok) return errorResponse('Wikipedia fetch failed', res.status)

    const data = await res.json()

    const summary: WikiSummary = {
      title: data.title ?? null,
      extract: data.extract ?? null,
      thumbnail: data.thumbnail?.source ?? null,
      description: data.description ?? null,
    }

    return jsonResponse(summary)
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return errorResponse('Wikipedia service unavailable', 500)
  }
}
