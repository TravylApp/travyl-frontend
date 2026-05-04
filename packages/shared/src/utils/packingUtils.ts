/**
 * @module packingUtils
 * Utility functions for the packing list feature.
 * Computes overall packing progress across a list of items and clamps
 * packed counts when item quantities are reduced.
 */

import type { DbPackingItem } from '../types'

/**
 * Computes overall packing progress across an array of packing items.
 * Sums all item quantities and packed counts, then derives a percentage.
 *
 * @param items - Array of packing items (only `quantity` and `packed_count` fields are needed)
 * @returns Object with `total` items, `packed` items, and `percent` (0–100, rounded)
 * @example
 * computePackingProgress([
 *   { quantity: 3, packed_count: 2 },
 *   { quantity: 2, packed_count: 2 },
 * ])
 * // → { total: 5, packed: 4, percent: 80 }
 */
export function computePackingProgress(items: Pick<DbPackingItem, 'quantity' | 'packed_count'>[]) {
  const total = items.reduce((s, i) => s + i.quantity, 0)
  const packed = items.reduce((s, i) => s + i.packed_count, 0)
  return { total, packed, percent: total > 0 ? Math.round((packed / total) * 100) : 0 }
}

/**
 * Clamps the `packed_count` to the new quantity when a user reduces an item's
 * quantity below its current packed count. Also updates `is_packed` accordingly.
 *
 * @param currentPackedCount - The current number of packed units for the item
 * @param newQuantity - The new total quantity the user has set
 * @returns Updated `{ packed_count, is_packed }` fields for the DB row
 * @example
 * clampPackedCount(5, 3) // → { packed_count: 3, is_packed: true }
 * clampPackedCount(2, 5) // → { packed_count: 2, is_packed: false }
 */
export function clampPackedCount(currentPackedCount: number, newQuantity: number) {
  if (newQuantity <= currentPackedCount) {
    return { packed_count: newQuantity, is_packed: true }
  }
  return { packed_count: currentPackedCount, is_packed: false }
}
