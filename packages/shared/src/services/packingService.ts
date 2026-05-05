/**
 * @module packingService
 * Supabase CRUD functions for collaborative packing list management.
 * Works with the `packing_items`, `packing_audit_log`, and `packing_suggestions` tables.
 * Supports multi-user ownership (claim/release/transfer), quantity tracking, and audit history.
 * Consumed by packing-related React Query hooks and the packing tab UI.
 */

import { supabase } from './supabase'
import type { DbPackingItem, PackingAuditEntry, PackingSuggestion } from '../types'

/**
 * Fetches all packing items for a trip, including display name and avatar of the assigned user
 * and owner. Items are ordered by category, then by sort_order ascending.
 * @param tripId - UUID of the trip
 * @returns Array of DbPackingItem objects with denormalized user fields
 * @throws PostgrestError if the query fails
 */
export async function fetchPackingItems(tripId: string): Promise<DbPackingItem[]> {
  const { data, error } = await supabase
    .from('packing_items')
    // Use the column-name disambiguator form (`profiles!user_id`) instead
    // of the explicit FK constraint name. PostgREST stopped resolving the
    // `packing_items_user_id_fkey` hint on prod, returning 400 — same root
    // cause as the trip_collaborators FK fix in #765.
    .select('*, user:profiles!user_id(display_name, avatar_url), owner:profiles!owner_id(display_name)')
    .eq('trip_id', tripId)
    .order('category')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    user_display_name: row.user?.display_name ?? null,
    user_avatar_url: row.user?.avatar_url ?? null,
    owner_display_name: row.owner?.display_name ?? null,
    user: undefined,
    owner: undefined,
  }))
}

/**
 * Fetches the packing audit log for a trip (recent actions first).
 * Denormalizes display names for both the acting user and target user.
 * @param tripId - UUID of the trip
 * @param limit - Maximum number of entries to return (default: 50)
 * @returns Array of PackingAuditEntry objects
 * @throws PostgrestError if the query fails
 */
export async function fetchPackingAuditLog(tripId: string, limit = 50): Promise<PackingAuditEntry[]> {
  const { data, error } = await supabase
    .from('packing_audit_log')
    .select('*, user:profiles!user_id(display_name,email), target:profiles!target_user_id(display_name,email)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    user_display_name: row.user?.display_name ?? row.user?.email ?? null,
    target_display_name: row.target?.display_name ?? row.target?.email ?? null,
    user: undefined,
    target: undefined,
  }))
}

/**
 * Inserts a new packing item for a trip.
 * @param tripId - UUID of the trip
 * @param userId - UUID of the user adding the item
 * @param name - Display name of the packing item
 * @param category - Category label (e.g. 'clothing', 'toiletries')
 * @param sortOrder - Display order within the category
 * @param ownerId - Optional UUID of the user responsible for packing this item
 * @param groupTag - Optional group tag for collaborative filtering
 * @returns The newly created DbPackingItem
 * @throws PostgrestError if the insert fails
 */
export async function insertPackingItem(
  tripId: string, userId: string, name: string, category: string, sortOrder: number,
  ownerId?: string | null, groupTag?: string | null, quantity: number = 1,
): Promise<DbPackingItem> {
  const { data, error } = await supabase
    .from('packing_items')
    .insert({
      trip_id: tripId, user_id: userId, name, category, sort_order: sortOrder,
      quantity, packed_count: 0,
      ...(ownerId !== undefined && { owner_id: ownerId }),
      ...(groupTag !== undefined && { group_tag: groupTag }),
    })
    .select().single()
  if (error) throw error
  return data
}

/**
 * Bulk-insert default packing items for a freshly-created trip. Builds
 * essentials, clothing (quantity-aware to trip duration), toiletries, and
 * electronics; conditional items based on weather (swimsuit if warm, jacket
 * if cold, umbrella if rain). Idempotent: callers should gate via the
 * `trip.trip_context.packing_seeded` flag so this runs at most once per trip.
 *
 * @param tripId - UUID of the trip
 * @param userId - UUID of the inserting user (used as user_id attribution)
 * @param opts - Trip-derived signals: `days`, `isWarm`, `isCold`, `hasRain`
 * @returns The inserted rows
 */
export async function seedDefaultPackingItems(
  tripId: string,
  userId: string,
  opts: { days: number; isWarm: boolean; isCold: boolean; hasRain: boolean },
): Promise<DbPackingItem[]> {
  const days = Math.max(1, opts.days || 5)
  const clothesQty = Math.min(days + 1, 7)
  const bottomsQty = Math.min(Math.ceil(days / 2), 4)
  type Seed = { name: string; category: string; quantity?: number }
  const seeds: Seed[] = [
    // Essentials
    { name: 'Passport / ID', category: 'essentials' },
    { name: 'Phone & charger', category: 'essentials' },
    { name: 'Wallet & cards', category: 'essentials' },
    { name: 'Travel insurance docs', category: 'documents' },
    { name: 'Boarding pass / tickets', category: 'documents' },
    // Clothing
    { name: 'T-shirts / tops', category: 'clothing', quantity: clothesQty },
    { name: 'Underwear', category: 'clothing', quantity: clothesQty },
    { name: 'Socks (pairs)', category: 'clothing', quantity: clothesQty },
    { name: 'Pants / shorts', category: 'clothing', quantity: bottomsQty },
    { name: 'Sleepwear', category: 'clothing' },
    ...(opts.isWarm ? [
      { name: 'Swimsuit', category: 'clothing' },
      { name: 'Sunglasses', category: 'accessories' },
    ] : []),
    ...(opts.isCold ? [
      { name: 'Warm jacket', category: 'clothing' },
      { name: 'Scarf & gloves', category: 'accessories' },
    ] : []),
    ...(opts.hasRain ? [{ name: 'Rain jacket / umbrella', category: 'clothing' }] : []),
    // Toiletries
    { name: 'Toothbrush & toothpaste', category: 'toiletries' },
    { name: 'Shampoo & conditioner', category: 'toiletries' },
    { name: 'Deodorant', category: 'toiletries' },
    { name: 'Sunscreen', category: 'toiletries' },
    { name: 'Medications', category: 'toiletries' },
    // Electronics
    { name: 'Power adapter', category: 'electronics' },
    { name: 'Headphones', category: 'electronics' },
    { name: 'Camera', category: 'electronics' },
  ]
  const sortByCategory: Record<string, number> = {}
  const rows = seeds.map((s) => {
    const idx = sortByCategory[s.category] ?? 0
    sortByCategory[s.category] = idx + 1
    return {
      trip_id: tripId,
      user_id: userId,
      name: s.name,
      category: s.category,
      sort_order: idx,
      quantity: s.quantity ?? 1,
      packed_count: 0,
    }
  })
  const { data, error } = await supabase.from('packing_items').insert(rows).select()
  if (error) throw error
  return data ?? []
}

/**
 * Claims an unclaimed packing item for a user.
 * Uses an atomic conditional update (only sets `owner_id` if currently null).
 * @param itemId - UUID of the packing item
 * @param userId - UUID of the user claiming ownership
 * @returns true if the claim succeeded, false if already claimed by someone else
 */
export async function claimPackingItem(itemId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('packing_items')
    .update({ owner_id: userId, updated_at: new Date().toISOString() })
    .eq('id', itemId).is('owner_id', null)
    .select('id').single()
  if (error) return false
  return !!data
}

/**
 * Releases ownership of a packing item back to unclaimed state.
 * @param itemId - UUID of the packing item to release
 * @throws PostgrestError if the update fails
 */
export async function releasePackingItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('packing_items')
    .update({ owner_id: null, updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) throw error
}

/**
 * Transfers ownership of a packing item to another user.
 * @param itemId - UUID of the packing item
 * @param targetUserId - UUID of the user to transfer ownership to
 * @throws PostgrestError if the update fails
 */
export async function transferPackingItem(itemId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase
    .from('packing_items')
    .update({ owner_id: targetUserId, updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) throw error
}

/**
 * Appends an entry to the packing audit log.
 * @param tripId - UUID of the trip
 * @param userId - UUID of the user performing the action
 * @param itemId - UUID of the affected packing item (null for bulk actions)
 * @param action - Action type (e.g. 'added', 'packed', 'claimed', 'transferred')
 * @param itemName - Display name of the affected item (for human-readable log)
 * @param targetUserId - Optional UUID of a second user involved (for transfers)
 * @throws PostgrestError if the insert fails
 */
export async function insertAuditEntry(
  tripId: string, userId: string, itemId: string | null,
  action: PackingAuditEntry['action'], itemName: string,
  targetUserId?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('packing_audit_log')
    .insert({
      trip_id: tripId, user_id: userId, item_id: itemId, action, item_name: itemName,
      ...(targetUserId && { target_user_id: targetUserId }),
    })
  if (error) throw error
}

/**
 * Updates the packed state of an item (marks packed or unpacked).
 * Sets `packed_count` to `quantity` when packed, and 0 when unpacked.
 * @param itemId - UUID of the packing item
 * @param isPacked - Whether the item is being marked as packed
 * @param packedBy - UUID of the user who packed it (null when unpacking)
 * @param quantity - Total quantity of the item
 * @throws PostgrestError if the update fails
 */
export async function updatePackingItemPacked(itemId: string, isPacked: boolean, packedBy: string | null, quantity: number): Promise<void> {
  const { error } = await supabase.from('packing_items').update({
    is_packed: isPacked,
    packed_count: isPacked ? quantity : 0,
    packed_by: isPacked ? packedBy : null,
    packed_at: isPacked ? new Date().toISOString() : null,
  }).eq('id', itemId)
  if (error) throw error
}

/**
 * Updates the quantity of a packing item.
 * If the new quantity is less than or equal to the current packed count, marks the item fully packed.
 * @param itemId - UUID of the packing item
 * @param quantity - New total quantity
 * @param currentPackedCount - Current number of units already packed
 * @throws PostgrestError if the update fails
 */
export async function updatePackingQuantity(itemId: string, quantity: number, currentPackedCount: number): Promise<void> {
  const update = quantity <= currentPackedCount
    ? { quantity, packed_count: quantity, is_packed: true }
    : { quantity, is_packed: false }
  const { error } = await supabase.from('packing_items').update(update).eq('id', itemId)
  if (error) throw error
}

/**
 * Updates the packed_count for an item and derives is_packed from the ratio.
 * @param itemId - UUID of the packing item
 * @param packedCount - New number of units packed
 * @param quantity - Total quantity of the item (used to determine is_packed)
 * @throws PostgrestError if the update fails
 */
export async function updatePackedCount(itemId: string, packedCount: number, quantity: number): Promise<void> {
  const { error } = await supabase.from('packing_items').update({
    packed_count: packedCount,
    is_packed: packedCount >= quantity,
  }).eq('id', itemId)
  if (error) throw error
}

/**
 * Deletes a packing item row by its primary key.
 * @param itemId - UUID of the packing item to delete
 * @throws PostgrestError if the delete fails
 */
export async function deletePackingItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('packing_items').delete().eq('id', itemId)
  if (error) throw error
}

/**
 * Fetches all pending packing suggestions for a trip, ordered by category then creation date.
 * Only returns suggestions with status 'pending' (not accepted or dismissed).
 * @param tripId - UUID of the trip
 * @returns Array of PackingSuggestion objects
 * @throws PostgrestError if the query fails
 */
export async function fetchPackingSuggestions(tripId: string): Promise<PackingSuggestion[]> {
  const { data, error } = await supabase
    .from('packing_suggestions')
    .select('*')
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .order('category')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * Updates the status of a packing suggestion (accept or dismiss).
 * @param suggestionId - UUID of the packing_suggestions row
 * @param status - New status ('accepted' or 'dismissed')
 * @throws PostgrestError if the update fails
 */
export async function updateSuggestionStatus(suggestionId: string, status: 'accepted' | 'dismissed'): Promise<void> {
  const { error } = await supabase.from('packing_suggestions').update({ status }).eq('id', suggestionId)
  if (error) throw error
}

/**
 * Dismisses all pending packing suggestions for a trip in a single update.
 * @param tripId - UUID of the trip
 * @throws PostgrestError if the update fails
 */
export async function dismissAllSuggestions(tripId: string): Promise<void> {
  const { error } = await supabase.from('packing_suggestions').update({ status: 'dismissed' }).eq('trip_id', tripId).eq('status', 'pending')
  if (error) throw error
}
