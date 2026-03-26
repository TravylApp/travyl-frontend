import { NextRequest, NextResponse } from 'next/server'

// Datamuse — word/phrase API for smart search autocomplete
// Free, unlimited, no API key
// Docs: https://www.datamuse.com/api/

// Also uses Geonames for city name autocomplete
const GEONAMES_USER = process.env.GEONAMES_USERNAME || 'demo'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q = sp.get('q')
  const mode = sp.get('mode') || 'destination' // destination | activity
  const limit = parseInt(sp.get('limit') || '8', 10)

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  try {
    if (mode === 'destination') {
      // City autocomplete via Geonames
      const res = await fetch(
        `https://api.geonames.org/searchJSON?q=${encodeURIComponent(q)}&maxRows=${limit}&cities=cities5000&style=MEDIUM&orderby=relevance&username=${GEONAMES_USER}`,
        { next: { revalidate: 3600 } }
      )
      if (!res.ok) throw new Error('Geonames search failed')
      const data = await res.json()
      const cities = (data.geonames || []).map((g: any) => ({
        id: String(g.geonameId),
        name: g.name,
        country: g.countryName,
        countryCode: g.countryCode,
        fullName: `${g.name}, ${g.countryName}`,
        population: g.population,
        lat: parseFloat(g.lat),
        lng: parseFloat(g.lng),
      }))
      return NextResponse.json(cities)
    }

    if (mode === 'activity') {
      // Activity/word suggestions via Datamuse
      // "ml" = meaning like (semantic similarity), "rel_trg" = triggered by (association)
      const [mlRes, trgRes] = await Promise.all([
        fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(q)}&max=${limit}&topics=travel,tourism`),
        fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(q)}&max=${limit}`),
      ])

      const mlData = mlRes.ok ? await mlRes.json() : []
      const trgData = trgRes.ok ? await trgRes.json() : []

      // Merge and deduplicate
      const seen = new Set<string>()
      const suggestions = [...trgData, ...mlData]
        .filter((w: any) => {
          const word = w.word?.toLowerCase()
          if (!word || seen.has(word)) return false
          seen.add(word)
          return true
        })
        .slice(0, limit)
        .map((w: any) => ({
          word: w.word,
          score: w.score || 0,
        }))

      return NextResponse.json(suggestions)
    }

    return NextResponse.json([])
  } catch {
    return NextResponse.json({ error: 'Autocomplete service unavailable' }, { status: 500 })
  }
}
