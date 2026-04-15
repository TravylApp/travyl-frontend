import type { DbPackingItem } from '../types'

const PERCENTAGE_MULTIPLIER = 100

export function computePackingProgress(items: Pick<DbPackingItem, 'quantity' | 'packed_count'>[]) {
  const total = items.reduce((s, i) => s + i.quantity, 0)
  const packed = items.reduce((s, i) => s + i.packed_count, 0)
  return { total, packed, percent: total > 0 ? Math.round((packed / total) * PERCENTAGE_MULTIPLIER) : 0 }
}

export function clampPackedCount(currentPackedCount: number, newQuantity: number) {
  if (newQuantity <= currentPackedCount) {
    return { packed_count: newQuantity, is_packed: true }
  }
  return { packed_count: currentPackedCount, is_packed: false }
}
