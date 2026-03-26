import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function POST(req: NextRequest) {
  if (!API_URL) {
    return NextResponse.json({ error: 'API not configured' }, { status: 500 })
  }

  const body = await req.json()

  const res = await fetch(`${API_URL}/api/trips/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
