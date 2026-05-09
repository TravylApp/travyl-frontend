import { rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from '@travyl/shared'

const DUFFEL_TOKEN = process.env.DUFFEL_API_TOKEN

const airportsQuerySchema = z.object({
  q: z.string().min(2).max(100),
})

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'airports', 60, 60000)
  if (rl) return rl
  const parsed = parseQuery(req, airportsQuerySchema)
  if (!parsed.ok) return NextResponse.json([])
  const { q } = parsed.data

  if (!DUFFEL_TOKEN) {
    return NextResponse.json([])
  }

  try {
    const res = await fetch(
      `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(q)}&types[]=airport&types[]=city`,
      {
        headers: {
          Authorization: `Bearer ${DUFFEL_TOKEN}`,
          'Duffel-Version': 'v2',
          Accept: 'application/json',
        },
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const results = (data.data ?? []).map((p: any) => ({
      iata: p.iata_code,
      name: p.name ?? '',
      city: p.city_name ?? p.city?.name ?? '',
      country: p.city?.country_name ?? '',
      type: p.type,
    })).filter((r: any) => r.iata)

    return NextResponse.json(results.slice(0, 8))
  } catch {
    return NextResponse.json([])
  }
}
