import { NextRequest, NextResponse } from 'next/server'

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  if (!UNSPLASH_ACCESS_KEY) {
    // Fallback to source.unsplash.com if no API key
    return NextResponse.json({
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(query)},travel`,
    })
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' travel')}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
    )
    const data = await res.json()
    const photo = data.results?.[0]

    if (!photo) {
      return NextResponse.json({
        url: `https://source.unsplash.com/800x600/?${encodeURIComponent(query)},travel`,
      })
    }

    return NextResponse.json({
      url: photo.urls.regular,
      thumb: photo.urls.small,
      credit: photo.user.name,
      creditUrl: photo.user.links.html,
    })
  } catch {
    return NextResponse.json({
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(query)},travel`,
    })
  }
}
