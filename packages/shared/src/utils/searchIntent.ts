/**
 * Lightweight client-side intent inference for the Places search bar.
 *
 * Mirrors the regex fallback inside `apps/web/app/api/places/route.ts` so
 * the UI can show the user a "Searching: <category> near <where>" hint
 * the moment they hit submit, without waiting for the network round-trip.
 *
 * If the backend's category extraction ever diverges, the user-facing
 * label is still a good-faith guess; the actual search is whatever the
 * server returns.
 */

export type InferredCategory =
  | 'restaurants'
  | 'nightlife'
  | 'shopping'
  | 'parks'
  | 'museums'
  | 'hotels'
  | 'cafes'
  | 'entertainment'
  | 'sights'
  | 'places';

const CATEGORY_RULES: { rx: RegExp; label: InferredCategory }[] = [
  { rx: /restaurants?|food|dining|eat|meal|brunch|breakfast|lunch|dinner|cuisine|where to eat|places? to eat|food places?|grub|bites?/i, label: 'restaurants' },
  { rx: /nightlife|bars?\b|clubs?|lounges?|pubs?|cocktails?|drinks?|where to drink|places? to drink|brewery|breweries|wine bar|speakeasy/i, label: 'nightlife' },
  { rx: /shop|shopping|markets?|malls?|boutique|stores?|retail|outlet/i, label: 'shopping' },
  { rx: /beach|beaches|coast|coastal|seaside|outdoor|parks?\b|nature|hikes?|hiking|trails?|gardens?|botanical/i, label: 'parks' },
  { rx: /museums?|culture|cultural|arts?|galleries|gallery|exhibits?|exhibitions?|landmarks?|historic/i, label: 'museums' },
  { rx: /hotels?|stay|stays|accommodation|lodging|resorts?|airbnb|b&b|inn|hostel/i, label: 'hotels' },
  { rx: /cafes?|coffee|espresso|latte|tea house|bakery|bakeries|patisserie/i, label: 'cafes' },
  { rx: /entertainment|shows?|theaters?|theatre|concerts?|live music|performances?|comedy|sports? bar/i, label: 'entertainment' },
  { rx: /things? to do|fun|activities|attractions?|sights?|sightseeing|tours?|experiences?/i, label: 'sights' },
];

/**
 * Returns the best-guess category for a free-text search query, or 'places'
 * if no category keywords are detected.
 */
export function inferSearchCategory(query: string): InferredCategory {
  if (!query || !query.trim()) return 'places';
  for (const { rx, label } of CATEGORY_RULES) {
    if (rx.test(query)) return label;
  }
  return 'places';
}

/**
 * Returns a human-readable hint sentence for display while a search is
 * in flight. Examples:
 *   inferSearchHint('rooftop bars', 'San Francisco')
 *     → 'Searching nightlife near San Francisco…'
 *   inferSearchHint('best pizza', null)
 *     → 'Searching restaurants near you…'
 *   inferSearchHint('', null)
 *     → 'Searching places near you…'
 */
export function inferSearchHint(query: string, where: string | null): string {
  const category = inferSearchCategory(query);
  const location = where && where.trim() ? where.trim() : 'you';
  return `Searching ${category} near ${location}…`;
}
