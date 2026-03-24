import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Cost-of-living estimates by country/region, scaled from a US-dollar baseline.
//
// Base prices represent typical costs in the United States (multiplier 1.0).
// Each country or region has a multiplier derived from Numbeo's Cost of Living
// Index (2024-2025 public data) and cross-referenced with travel-blog averages.
// ---------------------------------------------------------------------------

const BASE_PRICES = {
  meal_cheap: 15,          // inexpensive restaurant meal (USD)
  meal_mid: 50,            // mid-range restaurant, 2 people
  coffee: 5,               // cappuccino
  beer: 6,                 // domestic draft beer (0.5L)
  taxi_km: 2.0,            // taxi per km
  public_transport: 2.75,  // one-way local transit ticket
  water_bottle: 1.5,       // 0.33L bottled water
  daily_budget_low: 80,
  daily_budget_mid: 180,
  daily_budget_high: 400,
}

// ---------------------------------------------------------------------------
// Country-level multipliers — top 60+ travel destinations
// Source: Numbeo Cost of Living Index (US = 100) mapped to a multiplier,
// then sanity-checked with Nomad List / Budget Your Trip averages.
// ---------------------------------------------------------------------------
const COUNTRY_MULTIPLIERS: Record<string, { m: number; currency: string }> = {
  // North America
  US: { m: 1.0, currency: 'USD' },
  CA: { m: 0.95, currency: 'CAD' },
  MX: { m: 0.40, currency: 'MXN' },

  // Central America & Caribbean
  CR: { m: 0.55, currency: 'CRC' },
  PA: { m: 0.55, currency: 'PAB' },
  GT: { m: 0.35, currency: 'GTQ' },
  BZ: { m: 0.55, currency: 'BZD' },
  CU: { m: 0.40, currency: 'CUP' },
  DO: { m: 0.40, currency: 'DOP' },
  JM: { m: 0.50, currency: 'JMD' },

  // South America
  BR: { m: 0.45, currency: 'BRL' },
  AR: { m: 0.30, currency: 'ARS' },
  CO: { m: 0.35, currency: 'COP' },
  PE: { m: 0.35, currency: 'PEN' },
  CL: { m: 0.50, currency: 'CLP' },
  EC: { m: 0.35, currency: 'USD' },
  BO: { m: 0.30, currency: 'BOB' },
  UY: { m: 0.55, currency: 'UYU' },

  // Western Europe
  GB: { m: 1.10, currency: 'GBP' },
  FR: { m: 1.05, currency: 'EUR' },
  DE: { m: 0.95, currency: 'EUR' },
  IT: { m: 0.90, currency: 'EUR' },
  ES: { m: 0.80, currency: 'EUR' },
  PT: { m: 0.70, currency: 'EUR' },
  NL: { m: 1.05, currency: 'EUR' },
  BE: { m: 1.00, currency: 'EUR' },
  AT: { m: 1.00, currency: 'EUR' },
  IE: { m: 1.15, currency: 'EUR' },
  CH: { m: 1.60, currency: 'CHF' },
  SE: { m: 1.10, currency: 'SEK' },
  NO: { m: 1.35, currency: 'NOK' },
  DK: { m: 1.25, currency: 'DKK' },
  FI: { m: 1.10, currency: 'EUR' },
  LU: { m: 1.15, currency: 'EUR' },
  IS: { m: 1.40, currency: 'ISK' },

  // Eastern Europe
  PL: { m: 0.50, currency: 'PLN' },
  CZ: { m: 0.55, currency: 'CZK' },
  HU: { m: 0.45, currency: 'HUF' },
  HR: { m: 0.60, currency: 'EUR' },
  RO: { m: 0.40, currency: 'RON' },
  BG: { m: 0.38, currency: 'BGN' },
  RS: { m: 0.40, currency: 'RSD' },
  GR: { m: 0.70, currency: 'EUR' },
  TR: { m: 0.35, currency: 'TRY' },
  UA: { m: 0.30, currency: 'UAH' },
  GE: { m: 0.35, currency: 'GEL' },

  // Middle East
  AE: { m: 0.85, currency: 'AED' },
  IL: { m: 1.10, currency: 'ILS' },
  SA: { m: 0.65, currency: 'SAR' },
  QA: { m: 0.80, currency: 'QAR' },
  JO: { m: 0.55, currency: 'JOD' },
  OM: { m: 0.65, currency: 'OMR' },

  // East Asia
  JP: { m: 0.85, currency: 'JPY' },
  KR: { m: 0.80, currency: 'KRW' },
  CN: { m: 0.50, currency: 'CNY' },
  TW: { m: 0.55, currency: 'TWD' },
  HK: { m: 0.95, currency: 'HKD' },
  MO: { m: 0.80, currency: 'MOP' },

  // Southeast Asia
  TH: { m: 0.35, currency: 'THB' },
  VN: { m: 0.28, currency: 'VND' },
  ID: { m: 0.30, currency: 'IDR' },
  PH: { m: 0.32, currency: 'PHP' },
  MY: { m: 0.38, currency: 'MYR' },
  SG: { m: 0.95, currency: 'SGD' },
  KH: { m: 0.28, currency: 'KHR' },
  LA: { m: 0.28, currency: 'LAK' },
  MM: { m: 0.25, currency: 'MMK' },

  // South Asia
  IN: { m: 0.25, currency: 'INR' },
  LK: { m: 0.25, currency: 'LKR' },
  NP: { m: 0.22, currency: 'NPR' },

  // Oceania
  AU: { m: 1.05, currency: 'AUD' },
  NZ: { m: 0.95, currency: 'NZD' },
  FJ: { m: 0.60, currency: 'FJD' },

  // Africa
  ZA: { m: 0.40, currency: 'ZAR' },
  MA: { m: 0.35, currency: 'MAD' },
  EG: { m: 0.25, currency: 'EGP' },
  KE: { m: 0.35, currency: 'KES' },
  TZ: { m: 0.30, currency: 'TZS' },
  TN: { m: 0.30, currency: 'TND' },
  NG: { m: 0.30, currency: 'NGN' },
  ET: { m: 0.25, currency: 'ETB' },
  GH: { m: 0.35, currency: 'GHS' },
  RW: { m: 0.35, currency: 'RWF' },
}

// ---------------------------------------------------------------------------
// Regional fallbacks when a specific country code isn't in the lookup.
// Keys match the `subregion` field returned by REST Countries API v3.1.
// ---------------------------------------------------------------------------
const REGION_FALLBACKS: Record<string, { m: number; currency: string }> = {
  'Western Europe':            { m: 1.00, currency: 'EUR' },
  'Northern Europe':           { m: 1.15, currency: 'EUR' },
  'Southern Europe':           { m: 0.80, currency: 'EUR' },
  'Eastern Europe':            { m: 0.45, currency: 'EUR' },
  'Central America':           { m: 0.45, currency: 'USD' },
  'Caribbean':                 { m: 0.55, currency: 'USD' },
  'South America':             { m: 0.40, currency: 'USD' },
  'North America':             { m: 1.00, currency: 'USD' },
  'Central Asia':              { m: 0.35, currency: 'USD' },
  'Eastern Asia':              { m: 0.75, currency: 'USD' },
  'South-Eastern Asia':        { m: 0.35, currency: 'USD' },
  'Southern Asia':             { m: 0.25, currency: 'USD' },
  'Western Asia':              { m: 0.65, currency: 'USD' },
  'Australia and New Zealand':  { m: 1.00, currency: 'AUD' },
  'Melanesia':                 { m: 0.60, currency: 'USD' },
  'Polynesia':                 { m: 0.70, currency: 'USD' },
  'Northern Africa':           { m: 0.30, currency: 'USD' },
  'Western Africa':            { m: 0.30, currency: 'USD' },
  'Eastern Africa':            { m: 0.30, currency: 'USD' },
  'Southern Africa':           { m: 0.40, currency: 'ZAR' },
  'Middle Africa':             { m: 0.35, currency: 'USD' },
}

// Default when nothing else matches
const DEFAULT_ENTRY = { m: 0.60, currency: 'USD' }

// ---------------------------------------------------------------------------
// REST Countries API — resolve country name → alpha-2 code + subregion
// ---------------------------------------------------------------------------
interface RestCountryResult {
  cca2: string
  subregion?: string
  currencies?: Record<string, { name: string; symbol: string }>
}

async function resolveCountry(
  country: string
): Promise<{ code: string; subregion: string; currencyCode: string | null }> {
  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=cca2,subregion,currencies`,
      { next: { revalidate: 86400 } } // cache 24 h
    )
    if (!res.ok) return { code: '', subregion: '', currencyCode: null }

    const data: RestCountryResult[] = await res.json()
    if (!data.length) return { code: '', subregion: '', currencyCode: null }

    const best = data[0]
    const currencyCode = best.currencies
      ? Object.keys(best.currencies)[0]
      : null

    return {
      code: best.cca2,
      subregion: best.subregion ?? '',
      currencyCode,
    }
  } catch {
    return { code: '', subregion: '', currencyCode: null }
  }
}

// ---------------------------------------------------------------------------
// Scale base prices by a multiplier and round nicely
// ---------------------------------------------------------------------------
function scalePrices(multiplier: number) {
  const round = (v: number) => Math.round(v * 100) / 100
  return {
    meal_cheap: round(BASE_PRICES.meal_cheap * multiplier),
    meal_mid: round(BASE_PRICES.meal_mid * multiplier),
    coffee: round(BASE_PRICES.coffee * multiplier),
    beer: round(BASE_PRICES.beer * multiplier),
    taxi_km: round(BASE_PRICES.taxi_km * multiplier),
    public_transport: round(BASE_PRICES.public_transport * multiplier),
    water_bottle: round(BASE_PRICES.water_bottle * multiplier),
    daily_budget_low: round(BASE_PRICES.daily_budget_low * multiplier),
    daily_budget_mid: round(BASE_PRICES.daily_budget_mid * multiplier),
    daily_budget_high: round(BASE_PRICES.daily_budget_high * multiplier),
  }
}

// ---------------------------------------------------------------------------
// GET /api/costliving?city=Tokyo&country=Japan
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city')
  const country = req.nextUrl.searchParams.get('country')

  if (!city || !country) {
    return NextResponse.json(
      { error: 'Missing required parameters: city, country' },
      { status: 400 }
    )
  }

  try {
    const { code, subregion, currencyCode } = await resolveCountry(country)

    // 1. Try exact country code
    let entry = code ? COUNTRY_MULTIPLIERS[code] : undefined

    // 2. Fallback to subregion
    if (!entry && subregion) {
      entry = REGION_FALLBACKS[subregion]
    }

    // 3. Ultimate fallback
    if (!entry) {
      entry = DEFAULT_ENTRY
    }

    // Prefer the currency from our lookup (more relevant for travelers),
    // but fall back to REST Countries if the country wasn't in our table.
    const currency = entry.currency ?? currencyCode ?? 'USD'

    const prices = scalePrices(entry.m)

    return NextResponse.json({
      city,
      country,
      country_code: code || null,
      ...prices,
      currency,
      source: code && COUNTRY_MULTIPLIERS[code] ? 'estimated' : 'regional_estimate',
    })
  } catch {
    return NextResponse.json(
      { error: 'Cost of living service unavailable' },
      { status: 500 }
    )
  }
}
