// Country → default currency + measurement units, derived from the user's
// profile.country. Replaces the old "Display" settings tab — the user said
// these should be inherited from where you live (US = USD + miles + °F;
// rest of the world = local currency + km + °C).
//
// Country names use the canonical English forms returned by Nominatim
// /api/geo/search and ipapi /api/geo/me. Keys are stored lowercase-trimmed
// for case-insensitive lookup via the helpers below.

const CURRENCY_MAP: Record<string, string> = {
  // North America
  'united states': 'USD',
  'usa': 'USD',
  'canada': 'CAD',
  'mexico': 'MXN',

  // Europe (Eurozone first, then non-EUR)
  'austria': 'EUR',
  'belgium': 'EUR',
  'croatia': 'EUR',
  'cyprus': 'EUR',
  'estonia': 'EUR',
  'finland': 'EUR',
  'france': 'EUR',
  'germany': 'EUR',
  'greece': 'EUR',
  'ireland': 'EUR',
  'italy': 'EUR',
  'latvia': 'EUR',
  'lithuania': 'EUR',
  'luxembourg': 'EUR',
  'malta': 'EUR',
  'monaco': 'EUR',
  'netherlands': 'EUR',
  'portugal': 'EUR',
  'slovakia': 'EUR',
  'slovenia': 'EUR',
  'spain': 'EUR',
  'andorra': 'EUR',
  'united kingdom': 'GBP',
  'switzerland': 'CHF',
  'norway': 'NOK',
  'sweden': 'SEK',
  'denmark': 'DKK',
  'iceland': 'ISK',
  'poland': 'PLN',
  'czech republic': 'CZK',
  'czechia': 'CZK',
  'hungary': 'HUF',
  'romania': 'RON',
  'bulgaria': 'BGN',
  'serbia': 'RSD',
  'turkey': 'TRY',
  'ukraine': 'UAH',
  'russia': 'RUB',

  // Asia / Pacific
  'japan': 'JPY',
  'china': 'CNY',
  'hong kong': 'HKD',
  'taiwan': 'TWD',
  'south korea': 'KRW',
  'singapore': 'SGD',
  'malaysia': 'MYR',
  'thailand': 'THB',
  'vietnam': 'VND',
  'philippines': 'PHP',
  'indonesia': 'IDR',
  'india': 'INR',
  'australia': 'AUD',
  'new zealand': 'NZD',

  // Middle East / Africa
  'united arab emirates': 'AED',
  'uae': 'AED',
  'saudi arabia': 'SAR',
  'qatar': 'QAR',
  'israel': 'ILS',
  'egypt': 'EGP',
  'south africa': 'ZAR',
  'morocco': 'MAD',
  'kenya': 'KES',

  // Latin America
  'brazil': 'BRL',
  'argentina': 'ARS',
  'chile': 'CLP',
  'colombia': 'COP',
  'peru': 'PEN',
}

// Imperial-system holdouts. The whole rest of the world uses metric.
// Liberia and Myanmar are technically holdouts too but it's safe to assume
// any visitor selecting them in the country picker would prefer metric.
const IMPERIAL_COUNTRIES = new Set<string>([
  'united states',
  'usa',
])

export type DistanceUnits = 'miles' | 'kilometers'

/**
 * Look up the local currency for a country name. Case-insensitive.
 * Returns null when the country isn't in the table — caller decides
 * the fallback (typically "USD").
 */
export function currencyForCountry(country: string | null | undefined): string | null {
  if (!country) return null
  return CURRENCY_MAP[country.trim().toLowerCase()] ?? null
}

/**
 * Distance + temperature units for a country. US → miles/°F; everywhere
 * else → kilometers/°C. Falls back to kilometers when country is unset
 * (closer to a sensible global default than US-specific imperial).
 */
export function unitsForCountry(country: string | null | undefined): DistanceUnits {
  if (!country) return 'kilometers'
  return IMPERIAL_COUNTRIES.has(country.trim().toLowerCase()) ? 'miles' : 'kilometers'
}
