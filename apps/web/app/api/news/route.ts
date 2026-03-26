import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const destination = req.nextUrl.searchParams.get('destination')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '10')

  if (!destination) {
    return NextResponse.json({ error: 'Missing destination parameter' }, { status: 400 })
  }

  try {
    // Google News RSS — free, no API key needed
    const query = `${destination} travel`
    const res = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
      { next: { revalidate: 3600 } } // Cache 1 hour
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'News fetch failed' }, { status: res.status })
    }

    const xml = await res.text()
    const articles = parseRSS(xml, limit)

    return NextResponse.json(articles)
  } catch {
    return NextResponse.json({ error: 'News service unavailable' }, { status: 500 })
  }
}

interface NewsArticle {
  id: string
  title: string
  source: string
  date: string
  url: string
  snippet: string
  category: 'news' | 'advisory' | 'event' | 'tip'
}

function parseRSS(xml: string, limit: number): NewsArticle[] {
  const articles: NewsArticle[] = []
  // Simple XML parsing without external deps
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null && articles.length < limit) {
    const item = match[1]
    const title = extractTag(item, 'title')
    const link = extractTag(item, 'link')
    const pubDate = extractTag(item, 'pubDate')
    const source = extractTag(item, 'source')
    const description = extractTag(item, 'description')

    if (!title) continue

    // Categorize based on keywords
    const lower = title.toLowerCase()
    let category: NewsArticle['category'] = 'news'
    if (lower.match(/warning|advisory|alert|danger|avoid|scam|safety/)) category = 'advisory'
    else if (lower.match(/festival|event|concert|celebration|parade|opening/)) category = 'event'
    else if (lower.match(/tip|guide|best|must|secret|hidden|how to|budget/)) category = 'tip'

    articles.push({
      id: `news-${articles.length}-${Date.now()}`,
      title: decodeHTMLEntities(title),
      source: source || 'Google News',
      date: pubDate || new Date().toISOString(),
      url: link || '',
      snippet: description ? decodeHTMLEntities(description).replace(/<[^>]*>/g, '').slice(0, 200) : '',
      category,
    })
  }

  return articles
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`)
  const cdataMatch = xml.match(cdataRegex)
  if (cdataMatch) return cdataMatch[1].trim()

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
  const match = xml.match(regex)
  return match ? match[1].trim() : ''
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}
