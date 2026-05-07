// Airline name → either a homepage URL (string) or a deep-link template
// (function) that builds the carrier's booking-search URL with the
// route + date pre-filled.
//
// Why a per-carrier table: every airline's search URL is bespoke, with
// its own param names and casings (Delta: tripType=ONE_WAY,
// Southwest: tripType=oneway, Alaska: searchType=oneWay…). There's no
// universal protocol. A handful of major carriers cover most users;
// the rest fall back to the homepage. Update freely when a deep link
// breaks — they're string-template fragile by nature.

export interface FlightLinkContext {
  /** Origin IATA, e.g. "AUS" */
  origin: string
  /** Destination IATA, e.g. "SFO" */
  destination: string
  /** Outbound date — ISO yyyy-mm-dd or full timestamp; we slice */
  date: string
  /** Optional return date — same format. Triggers round-trip URL when present. */
  returnDate?: string | null
  /** Number of adult passengers. Defaults to 1. */
  passengers?: number
}

type Builder = (ctx: FlightLinkContext) => string

const MAP: Record<string, string | Builder> = {
  // ─── North America (deep-linked) ─────────────────────────────
  'alaska': (c) => alaska(c),
  'alaska airlines': (c) => alaska(c),
  'american': (c) => american(c),
  'american airlines': (c) => american(c),
  'delta': (c) => delta(c),
  'delta air lines': (c) => delta(c),
  'frontier': (c) => frontier(c),
  'frontier airlines': (c) => frontier(c),
  'jetblue': (c) => jetblue(c),
  'southwest': (c) => southwest(c),
  'spirit': (c) => spirit(c),
  'spirit airlines': (c) => spirit(c),
  'sun country': (c) => sunCountry(c),
  'sun country airlines': (c) => sunCountry(c),
  'united': (c) => united(c),
  'united airlines': (c) => united(c),
  'air canada': (c) => airCanada(c),
  'westjet': (c) => westjet(c),

  // ─── North America (homepage) ────────────────────────────────
  'allegiant': 'https://www.allegiantair.com/',
  'allegiant air': 'https://www.allegiantair.com/',
  'breeze airways': 'https://www.flybreeze.com/',
  'hawaiian airlines': 'https://www.hawaiianairlines.com/',
  'aeromexico': 'https://www.aeromexico.com/',
  'volaris': 'https://www.volaris.com/',

  // ─── Europe ──────────────────────────────────────────────────
  'air france': 'https://www.airfrance.com/',
  'klm': 'https://www.klm.com/',
  'lufthansa': 'https://www.lufthansa.com/',
  'british airways': 'https://www.britishairways.com/',
  'virgin atlantic': 'https://www.virginatlantic.com/',
  'iberia': 'https://www.iberia.com/',
  'tap air portugal': 'https://www.flytap.com/',
  'tap portugal': 'https://www.flytap.com/',
  'aer lingus': 'https://www.aerlingus.com/',
  'finnair': 'https://www.finnair.com/',
  'sas': 'https://www.flysas.com/',
  'scandinavian airlines': 'https://www.flysas.com/',
  'norwegian': 'https://www.norwegian.com/',
  'norwegian air': 'https://www.norwegian.com/',
  'icelandair': 'https://www.icelandair.com/',
  'swiss': 'https://www.swiss.com/',
  'austrian': 'https://www.austrian.com/',
  'austrian airlines': 'https://www.austrian.com/',
  'lot polish airlines': 'https://www.lot.com/',
  'turkish airlines': 'https://www.turkishairlines.com/',
  'ryanair': 'https://www.ryanair.com/',
  'easyjet': 'https://www.easyjet.com/',
  'wizz air': 'https://wizzair.com/',
  'vueling': 'https://www.vueling.com/',
  'iberia express': 'https://www.iberiaexpress.com/',
  'condor': 'https://www.condor.com/',
  'eurowings': 'https://www.eurowings.com/',
  'aegean': 'https://en.aegeanair.com/',
  'aegean airlines': 'https://en.aegeanair.com/',
  'ita airways': 'https://www.ita-airways.com/',

  // ─── Middle East / Asia / Pacific ────────────────────────────
  'emirates': 'https://www.emirates.com/',
  'qatar airways': 'https://www.qatarairways.com/',
  'etihad': 'https://www.etihad.com/',
  'etihad airways': 'https://www.etihad.com/',
  'singapore airlines': 'https://www.singaporeair.com/',
  'cathay pacific': 'https://www.cathaypacific.com/',
  'japan airlines': 'https://www.jal.com/',
  'jal': 'https://www.jal.com/',
  'all nippon airways': 'https://www.ana.co.jp/en/',
  'ana': 'https://www.ana.co.jp/en/',
  'korean air': 'https://www.koreanair.com/',
  'asiana': 'https://flyasiana.com/',
  'asiana airlines': 'https://flyasiana.com/',
  'china airlines': 'https://www.china-airlines.com/',
  'eva air': 'https://www.evaair.com/',
  'air china': 'https://www.airchina.us/',
  'china eastern': 'https://www.ceair.com/',
  'china southern': 'https://www.csair.com/',
  'thai airways': 'https://www.thaiairways.com/',
  'malaysia airlines': 'https://www.malaysiaairlines.com/',
  'philippine airlines': 'https://www.philippineairlines.com/',
  'vietnam airlines': 'https://www.vietnamairlines.com/',
  'air india': 'https://www.airindia.com/',
  'indigo': 'https://www.goindigo.in/',
  'qantas': 'https://www.qantas.com/',
  'jetstar': 'https://www.jetstar.com/',
  'air new zealand': 'https://www.airnewzealand.com/',
  'fiji airways': 'https://www.fijiairways.com/',

  // ─── Latin America ───────────────────────────────────────────
  'latam': 'https://www.latamairlines.com/',
  'latam airlines': 'https://www.latamairlines.com/',
  'avianca': 'https://www.avianca.com/',
  'gol': 'https://www.voegol.com.br/en',
  'azul': 'https://www.voeazul.com.br/',
  'copa': 'https://www.copaair.com/',
  'copa airlines': 'https://www.copaair.com/',
}

// ─── Helpers ──────────────────────────────────────────────────

function dateOnly(d: string): string {
  return d.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? d
}
const slash = (d: string) => dateOnly(d).split('-').reverse().slice(0, 2).reverse().join('/') // unused but kept for future formats

// ─── Carrier deep-link builders ───────────────────────────────

function delta({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  const tripType = returnDate ? 'ROUND_TRIP' : 'ONE_WAY'
  const u = new URL('https://www.delta.com/flight-search/book-a-flight')
  u.searchParams.set('tripType', tripType)
  u.searchParams.set('priceSchedule', 'PRICE')
  u.searchParams.set('originCity', origin)
  u.searchParams.set('destinationCity', destination)
  u.searchParams.set('departureDate', dateOnly(date))
  if (returnDate) u.searchParams.set('returnDate', dateOnly(returnDate))
  u.searchParams.set('paxCount', String(passengers))
  return u.toString()
}

function united({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  const u = new URL('https://www.united.com/en/us/fsr/choose-flights')
  u.searchParams.set('f', origin)
  u.searchParams.set('t', destination)
  u.searchParams.set('d', dateOnly(date))
  if (returnDate) {
    u.searchParams.set('r', dateOnly(returnDate))
    u.searchParams.set('tt', '1') // round trip
  } else {
    u.searchParams.set('tt', '2') // one-way
  }
  u.searchParams.set('px', String(passengers))
  u.searchParams.set('clm', '7')
  u.searchParams.set('st', 'bestmatches')
  return u.toString()
}

function american({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  const u = new URL('https://www.aa.com/booking/find-flights')
  u.searchParams.set('locale', 'en_US')
  u.searchParams.set('pax', String(passengers))
  u.searchParams.set('adult', String(passengers))
  u.searchParams.set('type', returnDate ? 'RoundTrip' : 'OneWay')
  u.searchParams.set('cabin', 'COACH')
  u.searchParams.set('originAirport', origin)
  u.searchParams.set('destinationAirport', destination)
  u.searchParams.set('departDate', dateOnly(date))
  if (returnDate) u.searchParams.set('returnDate', dateOnly(returnDate))
  return u.toString()
}

function southwest({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  // Southwest's booking URL accepts these params and lands on results
  const u = new URL('https://www.southwest.com/air/booking/select.html')
  u.searchParams.set('originationAirportCode', origin)
  u.searchParams.set('destinationAirportCode', destination)
  u.searchParams.set('departureDate', dateOnly(date))
  if (returnDate) {
    u.searchParams.set('returnDate', dateOnly(returnDate))
    u.searchParams.set('tripType', 'roundtrip')
  } else {
    u.searchParams.set('tripType', 'oneway')
    u.searchParams.set('returnDate', '')
  }
  u.searchParams.set('adultPassengersCount', String(passengers))
  u.searchParams.set('seniorPassengersCount', '0')
  u.searchParams.set('passengerType', 'ADULT')
  u.searchParams.set('fareType', 'USD')
  u.searchParams.set('promoCode', '')
  u.searchParams.set('international', 'false')
  return u.toString()
}

function alaska({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  const u = new URL('https://www.alaskaair.com/planbook')
  u.searchParams.set('searchType', returnDate ? 'roundTrip' : 'oneWay')
  u.searchParams.set('fromCity', origin)
  u.searchParams.set('toCity', destination)
  u.searchParams.set('fromDate', dateOnly(date))
  if (returnDate) u.searchParams.set('toDate', dateOnly(returnDate))
  u.searchParams.set('numAdults', String(passengers))
  return u.toString()
}

function jetblue({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  const u = new URL('https://www.jetblue.com/booking/flights')
  u.searchParams.set('from', origin)
  u.searchParams.set('to', destination)
  u.searchParams.set('depart', dateOnly(date))
  if (returnDate) u.searchParams.set('return', dateOnly(returnDate))
  u.searchParams.set('isMultiCity', 'false')
  u.searchParams.set('adults', String(passengers))
  u.searchParams.set('children', '0')
  u.searchParams.set('infants', '0')
  return u.toString()
}

function frontier({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  const u = new URL('https://booking.flyfrontier.com/Flight/InternalSelect')
  u.searchParams.set('o1', origin)
  u.searchParams.set('d1', destination)
  u.searchParams.set('dd1', dateOnly(date))
  if (returnDate) {
    u.searchParams.set('o2', destination)
    u.searchParams.set('d2', origin)
    u.searchParams.set('dd2', dateOnly(returnDate))
    u.searchParams.set('rt', 'true')
  }
  u.searchParams.set('ADT', String(passengers))
  u.searchParams.set('CHD', '0')
  return u.toString()
}

function spirit({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  // Spirit's homepage accepts a query-string-driven search via `book-a-trip/search-flights`
  const u = new URL('https://www.spirit.com/book/flights')
  u.searchParams.set('tripType', returnDate ? 'RT' : 'OW')
  u.searchParams.set('from', origin)
  u.searchParams.set('to', destination)
  u.searchParams.set('departure', dateOnly(date))
  if (returnDate) u.searchParams.set('return', dateOnly(returnDate))
  u.searchParams.set('adults', String(passengers))
  return u.toString()
}

function sunCountry({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  const u = new URL('https://book.suncountry.com/Flight/InternalSelect')
  u.searchParams.set('o1', origin)
  u.searchParams.set('d1', destination)
  u.searchParams.set('dd1', dateOnly(date))
  if (returnDate) {
    u.searchParams.set('o2', destination)
    u.searchParams.set('d2', origin)
    u.searchParams.set('dd2', dateOnly(returnDate))
    u.searchParams.set('rt', 'true')
  }
  u.searchParams.set('ADT', String(passengers))
  return u.toString()
}

function airCanada({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  // Air Canada's booking flow accepts these params on the search page
  const u = new URL('https://www.aircanada.com/aco/en_CA/aco/home/book.html')
  u.searchParams.set('org0', origin)
  u.searchParams.set('dest0', destination)
  u.searchParams.set('departureDate0', dateOnly(date))
  if (returnDate) u.searchParams.set('departureDate1', dateOnly(returnDate))
  u.searchParams.set('tripType', returnDate ? 'RT' : 'OW')
  u.searchParams.set('NUMADT', String(passengers))
  return u.toString()
}

function westjet({ origin, destination, date, returnDate, passengers = 1 }: FlightLinkContext): string {
  const u = new URL('https://www.westjet.com/en-ca/book-trip/index')
  u.searchParams.set('origin', origin)
  u.searchParams.set('destination', destination)
  u.searchParams.set('departureDate', dateOnly(date))
  if (returnDate) u.searchParams.set('returnDate', dateOnly(returnDate))
  u.searchParams.set('tripType', returnDate ? 'roundTrip' : 'oneWay')
  u.searchParams.set('adults', String(passengers))
  return u.toString()
}

// silence unused warning for the slash helper if we ever drop carriers
void slash

// ─── Public API ───────────────────────────────────────────────

/**
 * Resolve an airline + route into a clickable booking URL.
 * Returns the deepest link we can build (carrier search results when
 * possible, otherwise the carrier homepage). Falls back to null when
 * the airline isn't in our table — caller can then offer Google Flights.
 */
export function airlineBookingUrl(
  airline: string | null | undefined,
  ctx: FlightLinkContext,
): string | null {
  if (!airline) return null
  const entry = MAP[airline.trim().toLowerCase()]
  if (!entry) return null
  return typeof entry === 'string' ? entry : entry(ctx)
}

/** Backwards-compat for callers that only need the homepage. */
export function airlineHomepage(airline: string | null | undefined): string | null {
  if (!airline) return null
  const entry = MAP[airline.trim().toLowerCase()]
  if (!entry) return null
  if (typeof entry === 'string') return entry
  // Builder entry — return the URL origin only
  try {
    return new URL(entry({ origin: 'AAA', destination: 'BBB', date: '2030-01-01' })).origin
  } catch {
    return null
  }
}

/**
 * Build a Google Flights search URL for the route + date so users can
 * verify pricing on a public site even when we don't have the carrier
 * mapped. Format is the public search query that Google interprets.
 */
export function googleFlightsSearchUrl(opts: {
  origin: string
  destination: string
  date: string
  returnDate?: string | null
}): string {
  const dep = dateOnly(opts.date)
  const ret = opts.returnDate ? ` returning ${dateOnly(opts.returnDate)}` : ''
  const q = `Flights from ${opts.origin} to ${opts.destination} on ${dep}${ret}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`
}
