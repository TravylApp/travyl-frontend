export interface SpotlightResult {
  id: string
  type: 'trip' | 'hotel' | 'flight' | 'restaurant' | 'activity' | 'destination' | 'navigation' | 'command' | 'setting' | 'action'
  title: string
  subtitle: string
  imageUrl?: string
  tripId?: string
  tripTitle?: string
  href: string
  score: number
  // Extended fields for rich cards & commands
  shortcut?: { key: string; meta?: boolean; shift?: boolean; display: string }
  execute?: () => void
  metadata?: Record<string, unknown>
}

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
