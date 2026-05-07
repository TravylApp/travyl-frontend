// Country → ISO 4217 currency code lookup.
// Used to default booking currencies from the user's profile.country
// (e.g. "United States" → "USD") so we don't ask people to pick the
// obvious thing every time. Returns null when the country is unknown
// — callers should fall back to USD.
//
// Country names use the canonical English forms returned by Nominatim
// /api/geo/search and ipapi /api/geo/me. Keep keys lowercase-trimmed
// for case-insensitive lookup via the helper below.

const MAP: Record<string, string> = {
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

/**
 * Look up the local currency for a country name. Case-insensitive.
 * Returns null when the country isn't in the table — caller decides
 * the fallback (typically "USD").
 */
export function currencyForCountry(country: string | null | undefined): string | null {
  if (!country) return null
  return MAP[country.trim().toLowerCase()] ?? null
}
