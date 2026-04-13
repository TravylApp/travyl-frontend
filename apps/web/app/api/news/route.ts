import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_1H } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY

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

// ─── Category detection ─────────────────────────────────────────────────────

const CATEGORY_PATTERNS: Array<[RegExp, ArticleCategory]> = [
  [/warning|advisory|alert|danger|avoid|scam|safety/, 'advisory'],
  [/festival|event|concert|celebration|parade|opening/, 'event'],
  [/tip|guide|best|must|secret|hidden|how to|budget/, 'tip'],
]

function categorize(title: string): ArticleCategory {
  const lower = title.toLowerCase()
  return CATEGORY_PATTERNS.find(([re]) => re.test(lower))?.[1] ?? 'news'
}

// ─── SerpAPI Google News (1 credit — returns real thumbnails) ───────────────

async function fetchSerpNews(destination: string, limit: number): Promise<NewsArticle[]> {
  if (!SERPAPI_KEY) return []

  const params = new URLSearchParams({
    engine: 'google_news',
    q: `${destination} travel`,
    api_key: SERPAPI_KEY,
    hl: 'en',
    gl: 'us',
  })

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []

    const data = await res.json()
    const results = data.news_results ?? []

    return results.slice(0, limit).map((item: any, i: number) => ({
      id: `news-${i}-${Date.now()}`,
      title: item.title ?? '',
      source: item.source?.name ?? item.source ?? 'News',
      date: item.date ?? new Date().toISOString(),
      url: item.link ?? '',
      snippet: item.snippet ?? item.title ?? '',
      category: categorize(item.title ?? ''),
      ...(item.thumbnail ? { image: item.thumbnail } : {}),
    }))
  } catch {
    return []
  }
}

// ─── RSS fallback (free, no images) ─────────────────────────────────────────

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

function parseRSS(xml: string, limit: number): NewsArticle[] {
  const articles: NewsArticle[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRe.exec(xml)) !== null && articles.length < limit) {
    const item = match[1]
    const title = extractTag(item, 'title')
    if (!title) continue

    const description = extractTag(item, 'description')

    articles.push({
      id: `news-${articles.length}-${Date.now()}`,
      title: decodeHTMLEntities(title),
      source: extractTag(item, 'source') || 'Google News',
      date: extractTag(item, 'pubDate') || new Date().toISOString(),
      url: extractTag(item, 'link') || '',
      snippet: description ? decodeHTMLEntities(description).replace(/<[^>]*>/g, '').slice(0, 200) : '',
      category: categorize(title),
    })
  }

  return articles
}

async function fetchRSSNews(destination: string, limit: number): Promise<NewsArticle[]> {
  const query = `${destination} travel`
  const res = await fetch(
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
    CACHE_1H
  )
  if (!res.ok) return []
  const xml = await res.text()
  return parseRSS(xml, limit)
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const destination = requireParam(req.nextUrl.searchParams, 'destination')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10)

    // Try SerpAPI first (returns real thumbnail images)
    const serpNews = await fetchSerpNews(destination, limit)
    if (serpNews.length > 0) return jsonResponse(serpNews)

    // Fallback to free Google News RSS (no images)
    const rssNews = await fetchRSSNews(destination, limit)
    return jsonResponse(rssNews)
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return errorResponse('News service unavailable', 500)
  }
}
