import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_1H } from '@/lib/api-utils'

// ─── Route handler ───────────────────────────────────────────────────────────
// Uses US State Dept travel advisories RSS feed.
// Accepts country name (e.g. "Italy") or ISO code (e.g. "IT").
// Returns score (1-4 from advisory level), message, level text, and source URL.

export async function GET(req: NextRequest) {
  try {
    const country = requireParam(req.nextUrl.searchParams, 'country', 'country name or ISO code')

    // If ISO code, resolve to country name via REST Countries API
    let countryName = country
    if (country.length === 2) {
      try {
        const r = await fetch(`https://restcountries.com/v3.1/alpha/${country.toLowerCase()}?fields=name`, CACHE_1H)
        if (r.ok) {
          const d = await r.json()
          countryName = d?.name?.common || country
        }
      } catch {}
    }

    // Fetch US State Dept travel advisories RSS
    const res = await fetch('https://travel.state.gov/_res/rss/TAsTWs.xml', CACHE_1H)
    if (!res.ok) return errorResponse('Travel advisory fetch failed', res.status)

    const xml = await res.text()
    const search = countryName.toLowerCase()
    const items = xml.split('<item>').slice(1)
    let matched: string | null = null

    for (const item of items) {
      const titleMatch = item.match(/<title>([^<]+)</)
      if (!titleMatch) continue
      // Title format: "Italy - Level 2: Exercise Increased Caution"
      const titleCountry = titleMatch[1].split(' - ')[0].trim().toLowerCase()
      if (titleCountry === search || titleCountry.startsWith(search)) {
        matched = item
        break
      }
    }

    if (!matched) return errorResponse(`No advisory found for: ${countryName}`, 404)

    // Extract fields directly from RSS — no score mapping, just parse the level number
    const levelCat = matched.match(/<category domain="Threat-Level">([^<]+)</)
    const level = levelCat?.[1] || ''
    const score = parseInt(level.match(/\d/)?.[0] || '1')
    const title = matched.match(/<title>([^<]+)</)?.[1] || ''
    const descRaw = matched.match(/<description><!\[CDATA\[([\s\S]*?)\]\]>/)
    const message = (descRaw?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) || title
    const updated = matched.match(/<pubDate>([^<]+)</)?.[1] || ''
    const url = matched.match(/<link>([^<]+)</)?.[1] || ''

    return jsonResponse({ score, message, source: 'US State Department', updated, level, url })
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return errorResponse('Travel advisory service unavailable', 500)
  }
}
