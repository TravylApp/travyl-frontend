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

// ─── SerpAPI Google News (returns real thumbnails) ──────────────────────────

const SERPAPI_KEY = process.env.SERPAPI_KEY

async function fetchSerpNews(destination: string, limit: number): Promise<NewsArticle[]> {
  if (!SERPAPI_KEY) return []

  const q = `${destination} travel`
  const url = `https://serpapi.com/search.json?engine=google_news&q=${encodeURIComponent(q)}&gl=us&hl=en&api_key=${SERPAPI_KEY}`
  const res = await fetch(url, CACHE_1H)
  if (!res.ok) return []

  const data = await res.json()
  const results: NewsArticle[] = []

  for (const item of data.news_results ?? []) {
    if (results.length >= limit) break
    const title = item.title
    if (!title) continue

    // Filter low-res Google-proxied thumbnails
    let image = item.thumbnail || ''
    if (image.includes('encrypted-tbn') || image.includes('news.google.com/api')) {
      image = ''
    }

    results.push({
      id: `serp-news-${results.length}`,
      title,
      source: item.source?.name || 'News',
      date: item.date || new Date().toISOString(),
      url: item.link || '',
      snippet: item.snippet || '',
      category: categorize(title),
      image: image || undefined,
    })
  }

  // Also check sub-stories
  for (const item of data.news_results ?? []) {
    for (const sub of item.stories ?? []) {
      if (results.length >= limit) break
      let image = sub.thumbnail || ''
      if (image.includes('encrypted-tbn')) image = ''

      results.push({
        id: `serp-news-${results.length}`,
        title: sub.title,
        source: sub.source?.name || 'News',
        date: sub.date || new Date().toISOString(),
        url: sub.link || '',
        snippet: sub.snippet || '',
        category: categorize(sub.title || ''),
        image: image || undefined,
      })
    }
  }

  return results.slice(0, limit)
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const destination = requireParam(req.nextUrl.searchParams, 'destination')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '10', 10)

    // Try SerpAPI first (has thumbnails), fall back to RSS
    const serpNews = await fetchSerpNews(destination, limit)
    if (serpNews.length > 0) return jsonResponse(serpNews)

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
