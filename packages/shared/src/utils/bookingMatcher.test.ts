import { describe, it, expect } from 'vitest'
import { routeProvider, nameSimScore, proximityScore, calculateConfidence } from './bookingMatcher'

describe('routeProvider', () => {
  it('routes dining to null (opentable disabled)', () => {
    expect(routeProvider('dining')).toBeNull()
  })
  it('routes former viator/amadeus types to null (no provider)', () => {
    expect(routeProvider('sightseeing')).toBeNull()
    expect(routeProvider('tour')).toBeNull()
    expect(routeProvider('museum')).toBeNull()
    expect(routeProvider('cultural')).toBeNull()
    expect(routeProvider('outdoor')).toBeNull()
  })
  it('routes event to ticketmaster', () => {
    expect(routeProvider('event')).toBe('ticketmaster')
  })
  it('routes concert to ticketmaster', () => {
    expect(routeProvider('concert')).toBe('ticketmaster')
  })
  it('routes show to ticketmaster', () => {
    expect(routeProvider('show')).toBe('ticketmaster')
  })
  it('routes nightlife to ticketmaster', () => {
    expect(routeProvider('nightlife')).toBe('ticketmaster')
  })
  it('routes entertainment to ticketmaster', () => {
    expect(routeProvider('entertainment')).toBe('ticketmaster')
  })
  it('routes unknown types to null', () => {
    expect(routeProvider('shopping')).toBeNull()
    expect(routeProvider('unknown')).toBeNull()
    expect(routeProvider('')).toBeNull()
  })
  it('is case-insensitive', () => {
    expect(routeProvider('Dining')).toBeNull()
    expect(routeProvider('TOUR')).toBeNull()
  })
})

describe('nameSimScore', () => {
  it('returns 1 for identical strings', () => {
    expect(nameSimScore('Eiffel Tower', 'Eiffel Tower')).toBe(1)
  })
  it('returns 1 for identical strings case-insensitively', () => {
    expect(nameSimScore('eiffel tower', 'Eiffel Tower')).toBe(1)
  })
  it('returns 0 for completely different strings', () => {
    expect(nameSimScore('abc', 'xyz')).toBe(0)
  })
  it('returns value between 0 and 1 for similar strings', () => {
    const score = nameSimScore('Eiffel Tower', 'Eiffel Tower Restaurant')
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })
  it('handles empty strings without throwing', () => {
    expect(() => nameSimScore('', '')).not.toThrow()
    expect(() => nameSimScore('abc', '')).not.toThrow()
  })
})

describe('proximityScore', () => {
  it('returns 1 for same location', () => {
    expect(proximityScore(48.8584, 2.2945, 48.8584, 2.2945)).toBe(1)
  })
  it('returns 1 for distance <= 100m', () => {
    // ~50m north
    expect(proximityScore(48.8584, 2.2945, 48.8589, 2.2945)).toBe(1)
  })
  it('returns 0 for distance >= 500m', () => {
    // ~1km away
    expect(proximityScore(48.8584, 2.2945, 48.8674, 2.2945)).toBe(0)
  })
  it('returns value between 0 and 1 for 100-500m range', () => {
    // ~300m away
    const score = proximityScore(48.8584, 2.2945, 48.8611, 2.2945)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })
})

describe('calculateConfidence', () => {
  it('returns 1 for perfect name and proximity', () => {
    expect(calculateConfidence(1, 1)).toBe(1)
  })
  it('returns 0 for no name match and no proximity', () => {
    expect(calculateConfidence(0, 0)).toBe(0)
  })
  it('weights name 70% and proximity 30%', () => {
    expect(calculateConfidence(1, 0)).toBeCloseTo(0.7)
    expect(calculateConfidence(0, 1)).toBeCloseTo(0.3)
  })
  it('reaches 0.6 threshold with good name match and moderate proximity', () => {
    // nameSim=0.8, proxScore=0.2 → 0.7*0.8 + 0.3*0.2 = 0.56 + 0.06 = 0.62
    expect(calculateConfidence(0.8, 0.2)).toBeGreaterThanOrEqual(0.6)
  })
})
