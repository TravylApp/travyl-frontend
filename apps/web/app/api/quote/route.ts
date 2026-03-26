import { NextRequest, NextResponse } from 'next/server'

const FALLBACK_QUOTES = [
  { content: 'The world is a book and those who do not travel read only one page.', author: 'Saint Augustine' },
  { content: 'Not all those who wander are lost.', author: 'J.R.R. Tolkien' },
  { content: 'Travel is the only thing you buy that makes you richer.', author: 'Anonymous' },
  { content: 'Life is either a daring adventure or nothing at all.', author: 'Helen Keller' },
  { content: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { content: 'To travel is to live.', author: 'Hans Christian Andersen' },
  { content: 'Adventure is worthwhile in itself.', author: 'Amelia Earhart' },
  { content: 'Travel makes one modest. You see what a tiny place you occupy in the world.', author: 'Gustave Flaubert' },
  { content: 'Once a year, go someplace you have never been before.', author: 'Dalai Lama' },
  { content: 'Jobs fill your pocket, but adventures fill your soul.', author: 'Jaime Lyn Beatty' },
]

export async function GET(req: NextRequest) {
  const tag = req.nextUrl.searchParams.get('tag')

  try {
    const url = tag
      ? `https://api.quotable.io/quotes/random?tags=${encodeURIComponent(tag)}`
      : 'https://api.quotable.io/quotes/random'

    const res = await fetch(url, { next: { revalidate: 3600 } })

    if (!res.ok) {
      // API is down — use fallback
      const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
      return NextResponse.json(fallback)
    }

    const data = await res.json()
    const quote = Array.isArray(data) ? data[0] : data

    if (!quote?.content) {
      const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
      return NextResponse.json(fallback)
    }

    return NextResponse.json({
      content: quote.content,
      author: quote.author,
    })
  } catch {
    // Network error or timeout — use fallback
    const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
    return NextResponse.json(fallback)
  }
}
