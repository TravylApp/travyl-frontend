import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')

  if (!name) {
    return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fields=name,currencies,languages,timezones,callingCodes,flags,capital,region,population`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Country fetch failed' }, { status: res.status })
    }

    const data = await res.json()
    const country = Array.isArray(data) ? data[0] : data

    // Extract currency info from the currencies object
    const currencyCode = country.currencies ? Object.keys(country.currencies)[0] : null
    const currencyInfo = currencyCode ? country.currencies[currencyCode] : null

    // Extract first language
    const language = country.languages ? Object.values(country.languages)[0] : null

    return NextResponse.json({
      name: country.name?.common ?? name,
      currency: currencyInfo
        ? { code: currencyCode, symbol: currencyInfo.symbol, name: currencyInfo.name }
        : null,
      language,
      timezone: country.timezones?.[0] ?? null,
      callingCode: country.callingCodes?.[0] ?? null,
      flag: country.flags?.svg ?? country.flags?.png ?? null,
      capital: country.capital?.[0] ?? null,
      region: country.region ?? null,
      population: country.population ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Country service unavailable' }, { status: 500 })
  }
}
