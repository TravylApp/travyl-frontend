import { NextRequest, NextResponse } from 'next/server'

interface PexelsPhoto {
  src: {
    large2x: string
    large: string
  }
}

interface PexelsResponse {
  photos: PexelsPhoto[]
}

export async function GET(req: NextRequest) {
  const destination = req.nextUrl.searchParams.get('destination')

  if (!destination) {
    return NextResponse.json({ url: null }, { status: 400 })
  }

  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    console.error('PEXELS_API_KEY not configured')
    return NextResponse.json({ url: null })
  }

  try {
    const query = encodeURIComponent(`${destination} travel`)
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=15&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    )

    if (!res.ok) {
      console.error(`Pexels API error: ${res.status}`)
      return NextResponse.json({ url: null })
    }

    const data: PexelsResponse = await res.json()

    if (!data.photos || data.photos.length === 0) {
      return NextResponse.json({ url: null })
    }

    const photo = data.photos[Math.floor(Math.random() * data.photos.length)]
    const res_out = NextResponse.json({ url: photo.src.large2x })
    res_out.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800')
    return res_out
  } catch (err) {
    console.error('Pexels fetch failed:', err)
    return NextResponse.json({ url: null })
  }
}
