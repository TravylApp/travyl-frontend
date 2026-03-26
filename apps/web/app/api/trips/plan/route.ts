import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function POST(req: NextRequest) {
  if (!API_URL) {
    return NextResponse.json({ error: 'API not configured' }, { status: 500 })
  }

  const body = await req.json()

  const res = await fetch(`${API_URL}/api/trips/plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(req.headers.get('authorization')
        ? { Authorization: req.headers.get('authorization')! }
        : {}),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
