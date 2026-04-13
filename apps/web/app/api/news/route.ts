import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_1H } from '@/lib/api-utils'

// ─── Response types ──────────────────────────────────────────────────────────

type ArticleCategory = 'news' | 'advisory' | 'event' | 'tip'

interface NewsArticle {
  id: string
  title: string
  source: string
  date: string
  url: string
  snippet: string
  category: ArticleCategory
  image?: string
}

// ─── RSS parsing helpers ─────────────────────────────────────────────────────

const CATEGORY_PATTERNS: Array<[RegExp, ArticleCategory]> = [
  [/warning|advisory|alert|danger|avoid|scam|safety/, 'advisory'],
  [/festival|event|concert|celebration|parade|opening/, 'event'],
  [/tip|guide|best|must|secret|hidden|how to|budget/, 'tip'],
]

function categorize(title: string): ArticleCategory {
  const lower = title.toLowerCase()
  return CATEGORY_PATTERNS.find(([re]) => re.test(lower))?.[1] ?? 'news'
}

function extractTag(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`)
  const cdataMatch = xml.match(cdataRe)
  if (cdataMatch) return cdataMatch[1].trim()

  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
  const match = xml.match(re)
  return match ? match[1].trim() : ''
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
}

function extractImage(item: string): string | undefined {
  // Try <media:content url="...">
  const mediaMatch = item.match(/<media:content[^>]+url="([^"]+)"/)
  if (mediaMatch) return mediaMatch[1]
  // Try <enclosure url="...">
  const encMatch = item.match(/<enclosure[^>]+url="([^"]+)"/)
  if (encMatch) return encMatch[1]
  // Try <image><url>...</url></image>
  const imgTag = item.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/)
  if (imgTag) return imgTag[1]
  // Try img src in description HTML (Google News encodes as HTML entities)
  const desc = decodeHTMLEntities(extractTag(item, 'description'))
  const imgSrc = desc.match(/<img[^>]+src="([^"]+)"/)
  if (imgSrc) return imgSrc[1]
  return undefined
}

function parseRSS(xml: string, limit: number): NewsArticle[] {
  const articles: NewsArticle[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRe.exec(xml)) !== null && articles.length < limit) {
    const item = match[1]
    const title = extractTag(item, 'title')
    if (!title) continue

    const description = extractTag(item, 'description')
    const image = extractImage(item)

    articles.push({
      id: `news-${articles.length}-${Date.now()}`,
      title: decodeHTMLEntities(title),
      source: extractTag(item, 'source') || 'Google News',
      date: extractTag(item, 'pubDate') || new Date().toISOString(),
      url: extractTag(item, 'link') || '',
      snippet: description ? decodeHTMLEntities(description).replace(/<[^>]*>/g, '').slice(0, 200) : '',
      category: categorize(title),
      ...(image ? { image } : {}),
    })
  }

  return articles
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const destination = requireParam(req.nextUrl.searchParams, 'destination')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10)

    const query = `${destination} travel`
    const res = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
      CACHE_1H
    )

    if (!res.ok) return errorResponse('News fetch failed', res.status)

    const xml = await res.text()
    return jsonResponse(parseRSS(xml, limit))
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return errorResponse('News service unavailable', 500)
  }
}
