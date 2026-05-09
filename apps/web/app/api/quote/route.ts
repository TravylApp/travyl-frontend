import { NextRequest, NextResponse } from 'next/server'
import { CACHE_1H, rateLimit } from '@/lib/api-utils'
import { parseQuery } from '@/lib/zod-helpers'
import { z } from '@travyl/shared'

const quoteQuerySchema = z.object({
  tag: z.string().max(50).optional(),
})

interface Quote {
  content: string
  author: string
}

const FALLBACK_QUOTES: Quote[] = [
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

function randomFallback(): Quote {
  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'quote', 60, 60000)
  if (rl) return rl
  try {
    const parsed = parseQuery(req, quoteQuerySchema)
    const tag = parsed.ok ? parsed.data.tag : null
    const url = tag
      ? `https://api.quotable.io/quotes/random?tags=${encodeURIComponent(tag)}`
      : 'https://api.quotable.io/quotes/random'

    const res = await fetch(url, CACHE_1H)
    if (!res.ok) return NextResponse.json(randomFallback())

    const data = await res.json()
    const quote = Array.isArray(data) ? data[0] : data

    if (!quote?.content) return NextResponse.json(randomFallback())

    return NextResponse.json<Quote>({ content: quote.content, author: quote.author })
  } catch {
    return NextResponse.json(randomFallback())
  }
}
