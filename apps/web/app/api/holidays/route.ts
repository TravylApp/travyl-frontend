import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_1H } from '@/lib/api-utils'

// ─── Response types ──────────────────────────────────────────────────────────

interface Holiday {
  date: string
  name: string
  localName: string
  fixed: boolean
  global: boolean
}

interface NagerHoliday {
  date: string
  name: string
  localName: string
  fixed: boolean
  global: boolean
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const country = requireParam(sp, 'country')
    const year = requireParam(sp, 'year')

    const res = await fetch(
      `https://date.nager.at/api/v3/publicholidays/${encodeURIComponent(year)}/${encodeURIComponent(country)}`,
      CACHE_1H
    )

    if (!res.ok) return errorResponse('Holidays fetch failed', res.status)

    const data: NagerHoliday[] = await res.json()

    const holidays: Holiday[] = (data ?? []).map((h) => ({
      date: h.date,
      name: h.name,
      localName: h.localName,
      fixed: h.fixed,
      global: h.global,
    }))

    return jsonResponse(holidays)
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return errorResponse('Holidays service unavailable', 500)
  }
}
