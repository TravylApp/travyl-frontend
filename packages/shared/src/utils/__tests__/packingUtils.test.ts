import { describe, it, expect } from 'vitest'
import { computePackingProgress, clampPackedCount } from '../packingUtils'

describe('computePackingProgress', () => {
  it('returns zeros when items list is empty', () => {
    expect(computePackingProgress([])).toEqual({ total: 0, packed: 0, percent: 0 })
  })

  it('sums quantity and packed_count across items', () => {
    const items = [
      { quantity: 3, packed_count: 2 },
      { quantity: 2, packed_count: 2 },
    ]
    expect(computePackingProgress(items)).toEqual({ total: 5, packed: 4, percent: 80 })
  })

  it('returns 100 percent when all items are fully packed', () => {
    const items = [{ quantity: 2, packed_count: 2 }]
    expect(computePackingProgress(items)).toEqual({ total: 2, packed: 2, percent: 100 })
  })

  it('rounds percent to nearest integer', () => {
    const items = [{ quantity: 3, packed_count: 1 }]
    const result = computePackingProgress(items)
    expect(result.percent).toBe(33)
  })
})

describe('clampPackedCount', () => {
  it('clamps packed_count to newQuantity when newQuantity <= currentPackedCount', () => {
    expect(clampPackedCount(3, 2)).toEqual({ packed_count: 2, is_packed: true })
  })

  it('marks fully packed when newQuantity equals currentPackedCount', () => {
    expect(clampPackedCount(3, 3)).toEqual({ packed_count: 3, is_packed: true })
  })

  it('preserves packed_count when newQuantity > currentPackedCount', () => {
    expect(clampPackedCount(2, 5)).toEqual({ packed_count: 2, is_packed: false })
  })

  it('returns not packed when currentPackedCount is zero', () => {
    expect(clampPackedCount(0, 3)).toEqual({ packed_count: 0, is_packed: false })
  })
})
