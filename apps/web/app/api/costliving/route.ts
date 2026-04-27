import { NextRequest, NextResponse } from 'next/server'
import { getRequiredParams, errorResponse, CACHE_24H, rateLimit } from '@/lib/api-utils'

// ---------------------------------------------------------------------------
// Cost-of-living estimates by country/region, scaled from a US-dollar baseline.
//
// Base prices represent typical costs in the United States (multiplier 1.0).
// Each country or region has a multiplier derived from Numbeo's Cost of Living
// Index (2024-2025 public data) and cross-referenced with travel-blog averages.
// ---------------------------------------------------------------------------

const BASE_PRICES = {
  meal_cheap: 15,
  meal_mid: 50,
  coffee: 5,
  beer: 6,
  taxi_km: 2.0,
  public_transport: 2.75,
  water_bottle: 1.5,
  daily_budget_low: 80,
  daily_budget_mid: 180,
  daily_budget_high: 400,
} as const

// ---------------------------------------------------------------------------
// Country-level multipliers -- top 60+ travel destinations
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
// ---------------------------------------------------------------------------
const REGION_FALLBACKS: Record<string, { m: number; currency: string }> = {
  'Western Europe':           { m: 1.00, currency: 'EUR' },
  'Northern Europe':          { m: 1.15, currency: 'EUR' },
  'Southern Europe':          { m: 0.80, currency: 'EUR' },
  'Eastern Europe':           { m: 0.45, currency: 'EUR' },
  'Central America':          { m: 0.45, currency: 'USD' },
  'Caribbean':                { m: 0.55, currency: 'USD' },
  'South America':            { m: 0.40, currency: 'USD' },
  'North America':            { m: 1.00, currency: 'USD' },
  'Central Asia':             { m: 0.35, currency: 'USD' },
  'Eastern Asia':             { m: 0.75, currency: 'USD' },
  'South-Eastern Asia':       { m: 0.35, currency: 'USD' },
  'Southern Asia':            { m: 0.25, currency: 'USD' },
  'Western Asia':             { m: 0.65, currency: 'USD' },
  'Australia and New Zealand': { m: 1.00, currency: 'AUD' },
  'Melanesia':                { m: 0.60, currency: 'USD' },
  'Polynesia':                { m: 0.70, currency: 'USD' },
  'Northern Africa':          { m: 0.30, currency: 'USD' },
  'Western Africa':           { m: 0.30, currency: 'USD' },
  'Eastern Africa':           { m: 0.30, currency: 'USD' },
  'Southern Africa':          { m: 0.40, currency: 'ZAR' },
  'Middle Africa':            { m: 0.35, currency: 'USD' },
}

const DEFAULT_ENTRY = { m: 0.60, currency: 'USD' }

// ---------------------------------------------------------------------------
// REST Countries API -- resolve country name to alpha-2 code + subregion
// ---------------------------------------------------------------------------
interface RestCountryResult {
  cca2: string
  subregion?: string
  currencies?: Record<string, { name: string; symbol: string }>
}

async function resolveCountry(
  country: string,
): Promise<{ code: string; subregion: string; currencyCode: string | null }> {
  const empty = { code: '', subregion: '', currencyCode: null }
  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=cca2,subregion,currencies`,
      CACHE_24H,
    )
    if (!res.ok) return empty

    const data: RestCountryResult[] = await res.json()
    if (!data.length) return empty

    const best = data[0]
    return {
      code: best.cca2,
      subregion: best.subregion ?? '',
      currencyCode: best.currencies ? Object.keys(best.currencies)[0] : null,
    }
  } catch {
    return empty
  }
}

// ---------------------------------------------------------------------------
// Scale base prices by a multiplier and round to 2 decimal places
// ---------------------------------------------------------------------------
function scalePrices(multiplier: number) {
  const round = (v: number) => Math.round(v * 100) / 100
  return Object.fromEntries(
    Object.entries(BASE_PRICES).map(([key, base]) => [key, round(base * multiplier)]),
  ) as Record<keyof typeof BASE_PRICES, number>
}

// ---------------------------------------------------------------------------
// GET /api/costliving?city=Tokyo&country=Japan
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'costliving', 60, 60000)
  if (rl) return rl
  const params = getRequiredParams(req, 'city', 'country')
  if (params instanceof NextResponse) return params

  try {
    const { code, subregion, currencyCode } = await resolveCountry(params.country)

    const entry =
      (code ? COUNTRY_MULTIPLIERS[code] : undefined) ??
      (subregion ? REGION_FALLBACKS[subregion] : undefined) ??
      DEFAULT_ENTRY

    const currency = entry.currency ?? currencyCode ?? 'USD'

    return NextResponse.json({
      city: params.city,
      country: params.country,
      country_code: code || null,
      ...scalePrices(entry.m),
      currency,
      source: code && COUNTRY_MULTIPLIERS[code] ? 'estimated' : 'regional_estimate',
    })
  } catch {
    return errorResponse('Cost of living service unavailable', 500)
  }
}
