import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')

  if (!q) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Wikipedia fetch failed' }, { status: res.status })
    }

    const data = await res.json()

    return NextResponse.json({
      title: data.title ?? null,
      extract: data.extract ?? null,
      thumbnail: data.thumbnail?.source ?? null,
      description: data.description ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Wikipedia service unavailable' }, { status: 500 })
  }
}
