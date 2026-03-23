import { describe, it, expect } from 'vitest'
import { detectOperation, getConflictingActivities, computeNewTotalDays } from './rescoper'
import type { CalendarActivity } from '../types'

const d = (s: string) => new Date(s + 'T00:00:00Z')

describe('computeNewTotalDays', () => {
  it('returns 7 for a 7-night trip', () => {
    expect(computeNewTotalDays(d('2026-06-12'), d('2026-06-19'))).toBe(7)
  })
  it('returns 1 for same-day start/end', () => {
    expect(computeNewTotalDays(d('2026-06-12'), d('2026-06-13'))).toBe(1)
  })
})

describe('detectOperation', () => {
  const oldStart = d('2026-06-12')
  const oldEnd   = d('2026-06-19') // 7 nights

  it('returns metadata-only when dates are identical', () => {
    expect(detectOperation(oldStart, oldEnd, oldStart, oldEnd)).toBe('metadata-only')
  })
  it('detects expand when new range is longer', () => {
    expect(detectOperation(oldStart, oldEnd, oldStart, d('2026-06-20'))).toBe('expand')
    expect(detectOperation(oldStart, oldEnd, d('2026-06-11'), oldEnd)).toBe('expand')
  })
  it('detects shift when duration unchanged but start moved', () => {
    expect(detectOperation(oldStart, oldEnd, d('2026-06-14'), d('2026-06-21'))).toBe('shift')
  })
  it('detects shrink when new range is shorter', () => {
    expect(detectOperation(oldStart, oldEnd, oldStart, d('2026-06-18'))).toBe('shrink')
  })
  it('prefers shrink over expand when both ends moved asymmetrically resulting in shorter range', () => {
    // start moved +2, end moved +1 → net shrink by 1 day
    expect(detectOperation(oldStart, oldEnd, d('2026-06-14'), d('2026-06-20'))).toBe('shrink')
  })
})

describe('getConflictingActivities', () => {
  const acts: CalendarActivity[] = [
    { id: 'a', title: 'A', type: 'sightseeing', day: 3, startHour: 9, duration: 1 },
    { id: 'b', title: 'B', type: 'sightseeing', day: 6, startHour: 10, duration: 1 },
    { id: 'c', title: 'C', type: 'hotel', day: 4, endDay: 7, startHour: 14, duration: 2 },
  ]

  it('returns activities where day >= newTotalDays', () => {
    const conflicts = getConflictingActivities(acts, 6)
    expect(conflicts.map(a => a.id)).toEqual(expect.arrayContaining(['b']))
    expect(conflicts.map(a => a.id)).not.toContain('a')
  })

  it('includes activities where endDay >= newTotalDays', () => {
    const conflicts = getConflictingActivities(acts, 6)
    expect(conflicts.map(a => a.id)).toContain('c') // endDay 7 >= 6
  })

  it('returns empty array when all activities fit', () => {
    expect(getConflictingActivities(acts, 10)).toHaveLength(0)
  })
})
