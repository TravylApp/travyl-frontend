import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')
  const auth = req.headers.get('authorization')

  if (!q || !auth || !API_URL) {
    return NextResponse.json({ results: {} })
  }

  const upstream = new URL(`${API_URL}/entity-search`)
  upstream.search = searchParams.toString()

  const res = await fetch(upstream.toString(), {
    headers: { Authorization: auth },
  })

  if (!res.ok) {
    console.error('[entity-search proxy] Lambda error:', res.status, await res.text().catch(() => ''))
    return NextResponse.json({ results: {} }, { status: res.status })
  }

  return NextResponse.json(await res.json())
}
