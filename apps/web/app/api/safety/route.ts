import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')

  if (!country) {
    return NextResponse.json(
      { error: 'Missing country parameter (2-letter ISO code)' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(
      `https://www.travel-advisory.info/api?countrycode=${encodeURIComponent(country.toUpperCase())}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Travel advisory fetch failed' },
        { status: res.status }
      )
    }

    const data = await res.json()

    const countryCode = country.toUpperCase()
    const entry = data?.data?.[countryCode]

    if (!entry) {
      return NextResponse.json(
        { error: `No advisory data found for country: ${countryCode}` },
        { status: 404 }
      )
    }

    const advisory = entry.advisory

    return NextResponse.json({
      score: advisory.score ?? 0,
      message: advisory.message ?? '',
      source: advisory.source ?? '',
      updated: advisory.updated ?? '',
    })
  } catch {
    return NextResponse.json(
      { error: 'Travel advisory service unavailable' },
      { status: 500 }
    )
  }
}
