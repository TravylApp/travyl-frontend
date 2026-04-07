import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')
  const intent = searchParams.get('intent')
  const location = searchParams.get('location')
  const entityType = searchParams.get('entityType')
  const auth = req.headers.get('authorization')

  if (!q || !auth || !API_URL) {
    return NextResponse.json({ results: {} })
  }

  const params = new URLSearchParams({ q, intent: intent ?? 'unknown' })
  if (location) params.set('location', location)
  if (entityType) params.set('entityType', entityType)

  const res = await fetch(`${API_URL}/search/deep?${params}`, {
    headers: { Authorization: auth },
  })

  if (!res.ok) {
    console.error('[search/deep proxy] Lambda error:', res.status, await res.text().catch(() => ''))
    return NextResponse.json({ results: {} })
  }

  return NextResponse.json(await res.json())
}
