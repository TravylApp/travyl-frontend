import type { SuggestionCard } from './types'

export const ACTION_WEIGHTS: Record<string, number> = {
  impression: 0.1,
  click: 0.3,
  drag: 1.0,
  dismiss: -0.5,
}

const SERP_WEIGHT = 0.6
const AFFINITY_WEIGHT = 0.4
const REASON_THRESHOLD = 0.5

export function normalizeScores(
  scores: Record<string, number>,
): Record<string, number> {
  const values = Object.values(scores)
  const max = Math.max(...values, 0)
  if (max === 0) return {}

  const normalized: Record<string, number> = {}
  for (const [category, score] of Object.entries(scores)) {
    normalized[category] = score / max
  }
  return normalized
}

export function rerank(
  suggestions: SuggestionCard[],
  categoryScores: Record<string, number>,
): SuggestionCard[] {
  const normalized = normalizeScores(categoryScores)

  if (Object.keys(normalized).length === 0) {
    return suggestions
  }

  return suggestions
    .map((s) => {
      const affinity = normalized[s.category] ?? 0
      const finalScore =
        s.relevanceScore * SERP_WEIGHT + affinity * AFFINITY_WEIGHT
      const reason =
        affinity > REASON_THRESHOLD
          ? `Matches your interest in ${s.category}`
          : undefined

      return { ...s, relevanceScore: finalScore, reason }
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
}
