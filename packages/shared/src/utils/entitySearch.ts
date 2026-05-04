/**
 * @module entitySearch
 * Utilities for merging and deduplicating Spotlight / global-search results
 * from multiple data sources. Used by the web Spotlight command palette and
 * the conversational search system.
 */

/**
 * A single result item returned by the Spotlight / global search system.
 * Results can represent trips, hotels, flights, restaurants, navigation targets,
 * commands, settings, or inline actions.
 */
export interface SpotlightResult {
  /** Stable identifier used for deduplication across sources */
  id: string
  /** The kind of result, determines card rendering and grouping */
  type: 'trip' | 'hotel' | 'flight' | 'restaurant' | 'activity' | 'destination' | 'navigation' | 'command' | 'setting' | 'action'
  /** Primary display label */
  title: string
  /** Secondary display label (e.g. destination, category) */
  subtitle: string
  /** Optional thumbnail URL */
  imageUrl?: string
  /** Parent trip UUID, if this result belongs to a specific trip */
  tripId?: string
  /** Parent trip title, for contextual display */
  tripTitle?: string
  /** Navigation href — used by the router when the result is selected */
  href: string
  /** Relevance score; higher scores sort first within a category */
  score: number
  /** Optional keyboard shortcut for command-type results */
  shortcut?: { key: string; meta?: boolean; shift?: boolean; display: string }
  /** Optional inline handler for action-type results (e.g. "Open settings") */
  execute?: () => void
  /** Arbitrary extra data for rich card rendering */
  metadata?: Record<string, unknown>
}

/**
 * Merges results from multiple search sources into a single categorized map.
 * Within each category, results are deduplicated (higher-scoring duplicate wins),
 * sorted by score descending, and capped at `maxPerCategory`.
 *
 * @param sources - Array of per-source result maps (category → results)
 * @param options.maxPerCategory - Maximum results to keep per category (default: unlimited)
 * @returns Merged, deduplicated, sorted result map keyed by category
 * @example
 * const merged = mergeSearchResults(
 *   [tripsResults, placesResults],
 *   { maxPerCategory: 5 }
 * )
 */
export function mergeSearchResults(
  sources: Record<string, SpotlightResult[]>[],
  options?: { maxPerCategory?: number },
): Record<string, SpotlightResult[]> {
  const maxPerCategory = options?.maxPerCategory ?? Infinity
  const merged: Record<string, SpotlightResult[]> = {}
  for (const source of sources) {
    for (const [type, items] of Object.entries(source)) {
      if (!merged[type]) merged[type] = []
      merged[type].push(...items)
    }
  }
  // Deduplicate within each category, sort by score desc, cap
  for (const type of Object.keys(merged)) {
    merged[type] = deduplicateResults(merged[type])
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPerCategory)
  }
  return merged
}

/**
 * Removes duplicate results from an array, keeping the entry with the highest
 * score when multiple results share the same `id`.
 *
 * @param results - Flat array of SpotlightResult items (possibly with duplicates)
 * @returns Array with duplicates removed; order is not guaranteed
 */
export function deduplicateResults(results: SpotlightResult[]): SpotlightResult[] {
  const seen = new Map<string, SpotlightResult>()
  for (const r of results) {
    const existing = seen.get(r.id)
    if (!existing || r.score > existing.score) {
      seen.set(r.id, r)
    }
  }
  return Array.from(seen.values())
}
