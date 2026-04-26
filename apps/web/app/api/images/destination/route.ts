import { NextRequest, NextResponse } from 'next/server'

interface PexelsPhoto {
  id: number
  src: {
    original: string
    large2x: string
    large: string
    landscape: string
  }
  alt: string
  photographer: string
}

interface PexelsResponse {
  photos: PexelsPhoto[]
  total_results: number
}

export async function GET(req: NextRequest) {
  const destination = req.nextUrl.searchParams.get('destination')
  if (!destination) {
    return NextResponse.json({ error: 'Missing destination param' }, { status: 400 })
  }

  const PEXELS_API_KEY = process.env.PEXELS_API_KEY || process.env.PEXEL_API_KEY
  if (!PEXELS_API_KEY) {
    return NextResponse.json({ error: 'Pexels API key not configured' }, { status: 500 })
  }

  try {
    // Search for high-quality landscape/travel photos of the destination
    const query = `${destination} city travel landmark`
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape`

    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
      next: { revalidate: 86400 }, // cache 24h
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Pexels API error' }, { status: 502 })
    }

    const data: PexelsResponse = await res.json()

    if (!data.photos?.length) {
      // Fallback: try simpler query with just the destination name
      const fallbackUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(destination)}&per_page=8&orientation=landscape`
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { Authorization: PEXELS_API_KEY },
        next: { revalidate: 86400 },
      })

      if (fallbackRes.ok) {
        const fallbackData: PexelsResponse = await fallbackRes.json()
        if (fallbackData.photos?.length) {
          const images = fallbackData.photos.map((p) => p.src.large2x)
          return NextResponse.json({
            url: images[0],
            images,
          })
        }
      }

      return NextResponse.json({ url: null, images: [] })
    }

    const images = data.photos.map((p) => p.src.large2x)

    return NextResponse.json({
      url: images[0],        // primary hero image
      images,                // all images for mosaic / carousel
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 })
  }
}
