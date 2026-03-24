import { describe, it, expect } from 'vitest'
import { computeOverlapLayout } from './overlapLayout'

function activity(id: string, startHour: number, duration: number) {
  return { id, startHour, duration }
}

describe('computeOverlapLayout', () => {
  it('returns full width for non-overlapping activities', () => {
    const result = computeOverlapLayout([
      activity('a', 9, 1),
      activity('b', 11, 1),
    ])
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 1 })
    expect(result.get('b')).toEqual({ column: 0, totalColumns: 1 })
  })

  it('splits two overlapping activities into 2 columns', () => {
    const result = computeOverlapLayout([
      activity('a', 9, 2),
      activity('b', 10, 2),
    ])
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 2 })
    expect(result.get('b')).toEqual({ column: 1, totalColumns: 2 })
  })

  it('splits three overlapping activities into 3 columns', () => {
    const result = computeOverlapLayout([
      activity('a', 9, 3),
      activity('b', 10, 3),
      activity('c', 11, 1.5),
    ])
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 3 })
    expect(result.get('b')).toEqual({ column: 1, totalColumns: 3 })
    expect(result.get('c')).toEqual({ column: 2, totalColumns: 3 })
  })

  it('caps at 3 visible columns, hides 4th+ with column -1', () => {
    const result = computeOverlapLayout([
      activity('a', 10, 3),
      activity('b', 10, 3),
      activity('c', 10, 2),
      activity('d', 10, 1.5),
      activity('e', 10, 3.5),
    ])
    const visible = [...result.values()].filter(v => v.column >= 0)
    const hidden = [...result.values()].filter(v => v.column === -1)
    expect(visible).toHaveLength(3)
    expect(hidden).toHaveLength(2)
    visible.forEach(v => expect(v.totalColumns).toBe(3))
    hidden.forEach(v => expect(v.totalColumns).toBe(3))
  })

  it('treats adjacent non-overlapping activities as separate (A ends when B starts)', () => {
    const result = computeOverlapLayout([
      activity('a', 9, 2),
      activity('b', 11, 2),
    ])
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 1 })
    expect(result.get('b')).toEqual({ column: 0, totalColumns: 1 })
  })

  it('clusters transitively (A overlaps B, B overlaps C, A does not overlap C)', () => {
    const result = computeOverlapLayout([
      activity('a', 9, 2),
      activity('b', 10, 2),
      activity('c', 11.5, 1),
    ])
    expect(result.get('a')!.totalColumns).toBe(3)
    expect(result.get('b')!.totalColumns).toBe(3)
    expect(result.get('c')!.totalColumns).toBe(3)
  })

  it('returns empty map for empty input', () => {
    const result = computeOverlapLayout([])
    expect(result.size).toBe(0)
  })

  it('returns full width for a single activity', () => {
    const result = computeOverlapLayout([activity('a', 9, 1)])
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 1 })
  })

  it('assigns earlier columns to longer activities', () => {
    const result = computeOverlapLayout([
      activity('short', 10, 1),
      activity('long', 10, 3),
    ])
    expect(result.get('long')).toEqual({ column: 0, totalColumns: 2 })
    expect(result.get('short')).toEqual({ column: 1, totalColumns: 2 })
  })

  it('handles phantom activity replacing original without double-counting', () => {
    const withPhantom = [
      activity('b', 10, 2),
      activity('a', 14, 2),
    ]
    const result = computeOverlapLayout(withPhantom)
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 1 })
    expect(result.get('b')).toEqual({ column: 0, totalColumns: 1 })
  })
})
