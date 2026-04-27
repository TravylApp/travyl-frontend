import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, CACHE_1H, MissingParamError, rateLimit } from '@/lib/api-utils'

const GEONAMES_USER = process.env.GEONAMES_USERNAME || 'demo'

// ─── Response types ──────────────────────────────────────────────────────────

interface CityResult {
  id: string
  name: string
  country: string
  countryCode: string
  fullName: string
  population: number
  lat: number
  lng: number
}

interface ActivityResult {
  word: string
  score: number
}

// ─── Geonames city autocomplete ──────────────────────────────────────────────

interface GeonamesEntry {
  geonameId: number
  name: string
  countryName: string
  countryCode: string
  population: number
  lat: string
  lng: string
}

async function searchCities(query: string, limit: number): Promise<CityResult[]> {
  const url = `https://api.geonames.org/searchJSON?q=${encodeURIComponent(query)}&maxRows=${limit}&cities=cities5000&style=MEDIUM&orderby=relevance&username=${GEONAMES_USER}`
  const res = await fetch(url, CACHE_1H)
  if (!res.ok) throw new Error('Geonames search failed')

  const data = await res.json()
  return ((data.geonames ?? []) as GeonamesEntry[]).map((g) => ({
    id: String(g.geonameId),
    name: g.name,
    country: g.countryName,
    countryCode: g.countryCode,
    fullName: `${g.name}, ${g.countryName}`,
    population: g.population,
    lat: parseFloat(g.lat),
    lng: parseFloat(g.lng),
  }))
}

// ─── Datamuse activity suggestions ───────────────────────────────────────────

interface DatamuseWord {
  word?: string
  score?: number
}

async function searchActivities(query: string, limit: number): Promise<ActivityResult[]> {
  const encoded = encodeURIComponent(query)
  const [mlRes, sugRes] = await Promise.all([
    fetch(`https://api.datamuse.com/words?ml=${encoded}&max=${limit}&topics=travel,tourism`),
    fetch(`https://api.datamuse.com/sug?s=${encoded}&max=${limit}`),
  ])

  const mlData: DatamuseWord[] = mlRes.ok ? await mlRes.json() : []
  const sugData: DatamuseWord[] = sugRes.ok ? await sugRes.json() : []

  const seen = new Set<string>()
  return [...sugData, ...mlData]
    .filter((w) => {
      const word = w.word?.toLowerCase()
      if (!word || seen.has(word)) return false
      seen.add(word)
      return true
    })
    .slice(0, limit)
    .map((w) => ({ word: w.word!, score: w.score ?? 0 }))
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'autocomplete', 60, 60000)
  if (rl) return rl
  const sp = req.nextUrl.searchParams
  const q = sp.get('q')
  const mode = sp.get('mode') || 'destination'
  const limit = parseInt(sp.get('limit') || '8', 10)

  if (!q || q.length < 2) return jsonResponse([])

  try {
    if (mode === 'destination') {
      try {
        return jsonResponse(await searchCities(q, limit))
      } catch {
        // Geonames rate-limited or down — return empty instead of 500
        return jsonResponse([])
      }
    }
    if (mode === 'activity') return jsonResponse(await searchActivities(q, limit))
    return jsonResponse([])
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return jsonResponse([])
  }
}
