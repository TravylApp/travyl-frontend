import { NextRequest, NextResponse } from 'next/server'
import { getRequiredParams, errorResponse, CACHE_1H, CACHE_24H, rateLimit } from '@/lib/api-utils'

interface CountryResponse {
  name: string
  cca2: string | null
  currency: { code: string; symbol: string; name: string } | null
  language: string | null
  timezone: string | null
  callingCode: string | null
  flag: string | null
  capital: string | null
  region: string | null
  population: number | null
  emergency: string | null
}

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'country', 60, 60000)
  if (rl) return rl
  const params = getRequiredParams(req, 'name')
  if (params instanceof NextResponse) return params

  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(params.name)}?fields=name,cca2,currencies,languages,timezones,idd,flags,capital,region,population`,
      CACHE_1H,
    )

    if (!res.ok) return errorResponse('Country fetch failed', res.status)

    const data = await res.json()
    const country = Array.isArray(data) ? data[0] : data

    const currencyCode = country.currencies ? Object.keys(country.currencies)[0] : null
    const currencyInfo = currencyCode ? country.currencies[currencyCode] : null
    const language = country.languages
      ? (Object.values(country.languages)[0] as string)
      : null
    const idd = country.idd
    const callingCode = idd?.root
      ? `${idd.root}${idd.suffixes?.[0] ?? ''}`
      : null
    const cca2: string | null = country.cca2 ?? null

    // Fetch emergency numbers (non-critical -- swallow errors)
    let emergency: string | null = null
    if (cca2) {
      try {
        const emergRes = await fetch(
          `https://emergencynumberapi.com/api/country/${cca2}`,
          CACHE_24H,
        )
        if (emergRes.ok) {
          const emergData = await emergRes.json()
          const nums = emergData?.data?.country?.emergencyNumber
          emergency = nums?.all || nums?.police || nums?.ambulance || nums?.fire || null
        }
      } catch {
        // Non-critical -- proceed without emergency number
      }
    }

    return NextResponse.json<CountryResponse>({
      name: country.name?.common ?? params.name,
      cca2,
      currency: currencyInfo
        ? { code: currencyCode!, symbol: currencyInfo.symbol, name: currencyInfo.name }
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
    return errorResponse('Country service unavailable', 500)
  }
}
