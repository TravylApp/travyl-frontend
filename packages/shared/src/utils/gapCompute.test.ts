import { describe, it, expect } from 'vitest'
import { computeGaps } from './gapCompute'

describe('computeGaps', () => {
  it('returns full day as one gap when no activities', () => {
    const result = computeGaps([])
    expect(result).toEqual([{ startHour: 8, endHour: 22, durationHours: 14 }])
  })

  it('returns gap before first activity', () => {
    const result = computeGaps([{ startHour: 11, duration: 1 }])
    expect(result).toContainEqual({ startHour: 8, endHour: 11, durationHours: 3 })
  })

  it('returns gap after last activity', () => {
    const result = computeGaps([{ startHour: 9, duration: 2 }])
    expect(result).toContainEqual({ startHour: 11, endHour: 22, durationHours: 11 })
  })

  it('returns gap between two activities', () => {
    const result = computeGaps([
      { startHour: 9, duration: 1 },
      { startHour: 14, duration: 2 },
    ])
    expect(result).toContainEqual({ startHour: 10, endHour: 14, durationHours: 4 })
  })

  it('filters out gaps shorter than 1 hour', () => {
    const result = computeGaps([
      { startHour: 9, duration: 1 },
      { startHour: 9.5, duration: 2 },  // overlapping; leaves 0.5h before
    ])
    // The gap before (8–9) is 1h, included
    // The gap after (11.5–22) is included
    // No sub-1h gaps
    result.forEach((g) => expect(g.durationHours).toBeGreaterThanOrEqual(1))
  })

  it('handles activities that overlap (cursor advances past overlapping end)', () => {
    const result = computeGaps([
      { startHour: 9, duration: 3 },  // 9–12
      { startHour: 10, duration: 1 }, // 10–11 (inside first)
    ])
    // Cursor ends at 12, not 11
    const afterGap = result.find((g) => g.startHour === 12)
    expect(afterGap).toBeDefined()
    expect(afterGap?.endHour).toBe(22)
  })

  it('respects custom dayStart and dayEnd', () => {
    const result = computeGaps([], 6, 24)
    expect(result).toEqual([{ startHour: 6, endHour: 24, durationHours: 18 }])
  })

  it('returns empty when day is fully scheduled', () => {
    const result = computeGaps([{ startHour: 8, duration: 14 }]) // 8–22
    expect(result).toHaveLength(0)
  })
})
