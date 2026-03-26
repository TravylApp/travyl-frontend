/**
 * Simple fuzzy matching: checks if all characters of `query` appear in order in `text`.
 * Returns a score (higher = better) or null if no match.
 * Consecutive character matches score higher.
 */
export function fuzzyMatch(text: string, query: string): number | null {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (q.length === 0) return 0
  let ti = 0
  let score = 0
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti)
    if (found === -1) return null // no match
    score += found === ti ? 2 : 1 // consecutive chars score higher
    ti = found + 1
  }
  return score
}
