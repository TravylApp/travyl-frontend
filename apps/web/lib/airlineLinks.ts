// Outbound link helpers for the flight detail modal.
//
// Strategy after a few false starts:
// - Per-carrier "deep links" (e.g. building united.com/en/us/fsr/choose-flights
//   with origin/dest/date params) break constantly. Most airlines have moved
//   to JS-based booking flows that ignore query params; United returns a
//   "we couldn't process your request" page on the URL we used to build.
//   So carrier links just go to the homepage — the only thing that
//   consistently works.
// - For an actual deep link to flight results, we hand off to a meta-search
//   site that DOES support stable URL formats. Kayak's
//   `https://www.kayak.com/flights/{ORIG}-{DEST}/{YYYY-MM-DD}` is documented,
//   stable, and lands on the same itinerary the user clicked.
// - Google Flights gets a search-query URL too, since some users prefer it.

const HOMEPAGE: Record<string, string> = {
  // North America
  'alaska': 'https://www.alaskaair.com/',
  'alaska airlines': 'https://www.alaskaair.com/',
  'allegiant': 'https://www.allegiantair.com/',
  'allegiant air': 'https://www.allegiantair.com/',
  'american': 'https://www.aa.com/',
  'american airlines': 'https://www.aa.com/',
  'breeze airways': 'https://www.flybreeze.com/',
  'delta': 'https://www.delta.com/',
  'delta air lines': 'https://www.delta.com/',
  'frontier': 'https://www.flyfrontier.com/',
  'frontier airlines': 'https://www.flyfrontier.com/',
  'hawaiian airlines': 'https://www.hawaiianairlines.com/',
  'jetblue': 'https://www.jetblue.com/',
  'spirit': 'https://www.spirit.com/',
  'spirit airlines': 'https://www.spirit.com/',
  'sun country': 'https://www.suncountry.com/',
  'sun country airlines': 'https://www.suncountry.com/',
  'southwest': 'https://www.southwest.com/',
  'united': 'https://www.united.com/',
  'united airlines': 'https://www.united.com/',
  'air canada': 'https://www.aircanada.com/',
  'westjet': 'https://www.westjet.com/',
  'aeromexico': 'https://www.aeromexico.com/',
  'volaris': 'https://www.volaris.com/',

  // Europe
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

  // Middle East / Asia / Pacific
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

  // Latin America
  'latam': 'https://www.latamairlines.com/',
  'latam airlines': 'https://www.latamairlines.com/',
  'avianca': 'https://www.avianca.com/',
  'gol': 'https://www.voegol.com.br/en',
  'azul': 'https://www.voeazul.com.br/',
  'copa': 'https://www.copaair.com/',
  'copa airlines': 'https://www.copaair.com/',
}

function dateOnly(d: string): string {
  return d.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? d
}

/** Carrier homepage by airline name (case-insensitive). null when unknown. */
export function airlineHomepage(airline: string | null | undefined): string | null {
  if (!airline) return null
  return HOMEPAGE[airline.trim().toLowerCase()] ?? null
}

/**
 * Stable Kayak deep link to flight results for the route + date.
 * Format documented and consistent for years:
 *   https://www.kayak.com/flights/AUS-SFO/2026-05-15
 *   https://www.kayak.com/flights/AUS-SFO/2026-05-15/2026-05-22  (round trip)
 * Lands on the actual flight list including the carrier the user clicked.
 */
export function kayakSearchUrl(opts: {
  origin: string
  destination: string
  date: string
  returnDate?: string | null
}): string {
  const dep = dateOnly(opts.date)
  const ret = opts.returnDate ? `/${dateOnly(opts.returnDate)}` : ''
  return `https://www.kayak.com/flights/${opts.origin}-${opts.destination}/${dep}${ret}`
}

/** Google Flights search-query URL. Less precise than Kayak but works as a fallback. */
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
