import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const auth = req.headers.get('authorization')

  if (!q || !auth || !API_URL) {
    return NextResponse.json({ intent: { intent: 'unknown', rawQuery: q ?? '' }, results: {} })
  }

  const res = await fetch(`${API_URL}/search/quick?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: auth },
  })

  if (!res.ok) {
    console.error('[search/quick proxy] Lambda error:', res.status, await res.text().catch(() => ''))
    return NextResponse.json({ intent: { intent: 'unknown', rawQuery: q }, results: {} })
  }

  return NextResponse.json(await res.json())
}
