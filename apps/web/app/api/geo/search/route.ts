import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, CACHE_1H } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const geoSearchQuerySchema = z.object({
  q: z.string().min(2).max(200),
})

export interface GeoSearchResult {
  id: string
  label: string
  city: string
  region: string | null
  country: string
  countryCode: string | null
  lat: number
  lng: number
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'geo-search', 30, 60_000)
  if (rl) return rl

  const parsed = parseQuery(req, geoSearchQuerySchema)
  if (!parsed.ok) return NextResponse.json([] satisfies GeoSearchResult[])
  const q = parsed.data.q.trim()

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '8')
  url.searchParams.set('featuretype', 'city')
  url.searchParams.set('accept-language', 'en')

  try {
    const res = await fetch(url.toString(), {
      ...CACHE_1H,
      headers: { 'User-Agent': 'Travyl/1.0 (gotravyl.com)' },
    })
    if (!res.ok) return NextResponse.json([])
    const raw = (await res.json()) as Array<{
      place_id: number
      display_name: string
      lat: string
      lon: string
      type?: string
      addresstype?: string
      address?: {
        city?: string
        town?: string
        village?: string
        municipality?: string
        county?: string
        state?: string
        region?: string
        country?: string
        country_code?: string
      }
    }>

    const results: GeoSearchResult[] = raw
      .map((r): GeoSearchResult | null => {
        const a = r.address ?? {}
        const city = a.city || a.town || a.village || a.municipality || a.county
        const country = a.country
        if (!city || !country) return null
        return {
          id: String(r.place_id),
          label: `${city}, ${a.state ? `${a.state}, ` : ''}${country}`,
          city,
          region: a.state ?? a.region ?? null,
          country,
          countryCode: a.country_code ? a.country_code.toUpperCase() : null,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }
      })
      .filter((r): r is GeoSearchResult => r !== null)

    // Dedupe by city+country
    const seen = new Set<string>()
    const deduped = results.filter((r) => {
      const k = `${r.city}|${r.country}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })

    return NextResponse.json(deduped)
  } catch {
    return NextResponse.json([])
  }
}
