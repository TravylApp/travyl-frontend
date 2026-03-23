import { describe, it, expect } from 'vitest'
import {
  ACTION_WEIGHTS,
  normalizeScores,
  rerank,
} from './affinity'
import type { SuggestionCard } from './types'

describe('ACTION_WEIGHTS', () => {
  it('maps actions to correct weights', () => {
    expect(ACTION_WEIGHTS.impression).toBe(0.1)
    expect(ACTION_WEIGHTS.click).toBe(0.3)
    expect(ACTION_WEIGHTS.drag).toBe(1.0)
    expect(ACTION_WEIGHTS.dismiss).toBe(-0.5)
  })
})

describe('normalizeScores', () => {
  it('normalizes scores to 0-1 range by dividing by max', () => {
    const scores = { dining: 10, sightseeing: 5, shopping: 2 }
    const result = normalizeScores(scores)
    expect(result).toEqual({ dining: 1.0, sightseeing: 0.5, shopping: 0.2 })
  })

  it('returns empty object for empty scores', () => {
    expect(normalizeScores({})).toEqual({})
  })

  it('returns 1.0 for single category', () => {
    expect(normalizeScores({ dining: 3 })).toEqual({ dining: 1.0 })
  })

  it('handles all-zero scores', () => {
    expect(normalizeScores({ dining: 0, shopping: 0 })).toEqual({})
  })
})

describe('rerank', () => {
  const makeSuggestion = (id: string, category: string, relevanceScore: number): SuggestionCard => ({
    id,
    name: `Place ${id}`,
    category,
    imageUrl: '',
    duration: 2,
    price: null,
    currency: 'USD',
    rating: null,
    location: '',
    latitude: 0,
    longitude: 0,
    description: '',
    source: 'search',
    relevanceScore,
  })

  it('boosts suggestions matching high-affinity categories', () => {
    const suggestions = [
      makeSuggestion('1', 'sightseeing', 1.0),
      makeSuggestion('2', 'dining', 0.8),
      makeSuggestion('3', 'shopping', 0.6),
    ]
    const affinityScores = { dining: 10, sightseeing: 2 }

    const result = rerank(suggestions, affinityScores)

    expect(result[0].id).toBe('2') // dining: 0.8*0.6 + 1.0*0.4 = 0.88
    expect(result[1].id).toBe('1') // sightseeing: 1.0*0.6 + 0.2*0.4 = 0.68
    expect(result[2].id).toBe('3') // shopping: 0.6*0.6 + 0*0.4 = 0.36
  })

  it('returns original order when no affinity data', () => {
    const suggestions = [
      makeSuggestion('1', 'sightseeing', 1.0),
      makeSuggestion('2', 'dining', 0.8),
    ]

    const result = rerank(suggestions, {})
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('adds reason for high-affinity categories (normalized > 0.5)', () => {
    const suggestions = [
      makeSuggestion('1', 'dining', 0.8),
      makeSuggestion('2', 'shopping', 0.6),
    ]
    const affinityScores = { dining: 10, shopping: 2 }

    const result = rerank(suggestions, affinityScores)

    const diningResult = result.find(s => s.id === '1')!
    expect(diningResult.reason).toBe('Matches your interest in dining')

    const shoppingResult = result.find(s => s.id === '2')!
    expect(shoppingResult.reason).toBeUndefined()
  })

  it('treats unknown categories as 0 affinity', () => {
    const suggestions = [makeSuggestion('1', 'nightlife', 0.5)]
    const affinityScores = { dining: 10 }

    const result = rerank(suggestions, affinityScores)
    expect(result[0].relevanceScore).toBeCloseTo(0.3) // 0.5*0.6 + 0*0.4
    expect(result[0].reason).toBeUndefined()
  })

  it('does not mutate the original array', () => {
    const suggestions = [
      makeSuggestion('1', 'dining', 1.0),
      makeSuggestion('2', 'sightseeing', 0.8),
    ]
    const original = [...suggestions]

    rerank(suggestions, { dining: 5 })

    expect(suggestions).toEqual(original)
  })
})
