import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')

  if (!name) {
    return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fields=name,cca2,currencies,languages,timezones,idd,flags,capital,region,population`,
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

    // International dialing code (v3.1 uses idd.root + idd.suffixes)
    const idd = country.idd
    const callingCode = idd?.root
      ? `${idd.root}${idd.suffixes?.[0] ?? ''}`
      : null

    // Fetch emergency numbers for this country
    const cca2 = country.cca2 as string | undefined
    let emergency: string | null = null
    if (cca2) {
      try {
        const emergRes = await fetch(
          `https://emergencynumberapi.com/api/country/${cca2}`,
          { next: { revalidate: 86400 } }
        )
        if (emergRes.ok) {
          const emergData = await emergRes.json()
          const nums = emergData?.data?.country?.emergencyNumber
          // Prefer police, then ambulance, then general
          emergency = nums?.all || nums?.police || nums?.ambulance || nums?.fire || null
        }
      } catch {}
    }

    return NextResponse.json({
      name: country.name?.common ?? name,
      cca2: cca2 ?? null,
      currency: currencyInfo
        ? { code: currencyCode, symbol: currencyInfo.symbol, name: currencyInfo.name }
        : null,
      language,
      timezone: country.timezones?.[0] ?? null,
      callingCode,
      flag: country.flags?.svg ?? country.flags?.png ?? null,
      capital: country.capital?.[0] ?? null,
      region: country.region ?? null,
      population: country.population ?? null,
      emergency,
    })
  } catch {
    return NextResponse.json({ error: 'Country service unavailable' }, { status: 500 })
  }
}
