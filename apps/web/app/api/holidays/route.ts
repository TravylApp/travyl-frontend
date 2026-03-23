import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')
  const year = req.nextUrl.searchParams.get('year')

  if (!country || !year) {
    return NextResponse.json(
      { error: 'Missing country or year parameter' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/publicholidays/${encodeURIComponent(year)}/${encodeURIComponent(country)}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Holidays fetch failed' }, { status: res.status })
    }

    const data = await res.json()

    const holidays = (data ?? []).map((h: any) => ({
      date: h.date,
      name: h.name,
      localName: h.localName,
      fixed: h.fixed,
      global: h.global,
    }))

    return NextResponse.json(holidays)
  } catch {
    return NextResponse.json({ error: 'Holidays service unavailable' }, { status: 500 })
  }
}
