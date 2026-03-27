import { supabase } from './supabase'
import type { DbPackingItem, PackingAuditEntry, PackingSuggestion } from '../types'

export async function fetchPackingItems(tripId: string): Promise<DbPackingItem[]> {
  const { data, error } = await supabase!
    .from('packing_items')
    .select('*, user:profiles!packing_items_user_id_fkey(display_name, avatar_url), owner:profiles!packing_items_owner_id_fkey(display_name)')
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

export async function fetchPackingAuditLog(tripId: string, limit = 50): Promise<PackingAuditEntry[]> {
  const { data, error } = await supabase!
    .from('packing_audit_log')
    .select('*, user:profiles!packing_audit_log_user_id_fkey(display_name,email), target:profiles!packing_audit_log_target_user_id_fkey(display_name,email)')
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

export async function insertPackingItem(
  tripId: string, userId: string, name: string, category: string, sortOrder: number,
  ownerId?: string | null, groupTag?: string | null,
): Promise<DbPackingItem> {
  const { data, error } = await supabase!
    .from('packing_items')
    .insert({
      trip_id: tripId, user_id: userId, name, category, sort_order: sortOrder,
      quantity: 1, packed_count: 0,
      ...(ownerId !== undefined && { owner_id: ownerId }),
      ...(groupTag !== undefined && { group_tag: groupTag }),
    })
    .select().single()
  if (error) throw error
  return data
}

export async function claimPackingItem(itemId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase!
    .from('packing_items')
    .update({ owner_id: userId, updated_at: new Date().toISOString() })
    .eq('id', itemId).is('owner_id', null)
    .select('id').single()
  if (error) return false
  return !!data
}

export async function releasePackingItem(itemId: string): Promise<void> {
  const { error } = await supabase!
    .from('packing_items')
    .update({ owner_id: null, updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) throw error
}

export async function transferPackingItem(itemId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase!
    .from('packing_items')
    .update({ owner_id: targetUserId, updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) throw error
}

export async function insertAuditEntry(
  tripId: string, userId: string, itemId: string | null,
  action: PackingAuditEntry['action'], itemName: string,
  targetUserId?: string | null,
): Promise<void> {
  const { error } = await supabase!
    .from('packing_audit_log')
    .insert({
      trip_id: tripId, user_id: userId, item_id: itemId, action, item_name: itemName,
      ...(targetUserId && { target_user_id: targetUserId }),
    })
  if (error) throw error
}

export async function updatePackingItemPacked(itemId: string, isPacked: boolean, packedBy: string | null, quantity: number): Promise<void> {
  const { error } = await supabase!.from('packing_items').update({
    is_packed: isPacked,
    packed_count: isPacked ? quantity : 0,
    packed_by: isPacked ? packedBy : null,
    packed_at: isPacked ? new Date().toISOString() : null,
  }).eq('id', itemId)
  if (error) throw error
}

export async function updatePackingQuantity(itemId: string, quantity: number, currentPackedCount: number): Promise<void> {
  const update = quantity <= currentPackedCount
    ? { quantity, packed_count: quantity, is_packed: true }
    : { quantity, is_packed: false }
  const { error } = await supabase!.from('packing_items').update(update).eq('id', itemId)
  if (error) throw error
}

export async function updatePackedCount(itemId: string, packedCount: number, quantity: number): Promise<void> {
  const { error } = await supabase!.from('packing_items').update({
    packed_count: packedCount,
    is_packed: packedCount >= quantity,
  }).eq('id', itemId)
  if (error) throw error
}

export async function deletePackingItem(itemId: string): Promise<void> {
  const { error } = await supabase!.from('packing_items').delete().eq('id', itemId)
  if (error) throw error
}

export async function fetchPackingSuggestions(tripId: string): Promise<PackingSuggestion[]> {
  const { data, error } = await supabase!
    .from('packing_suggestions')
    .select('*')
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .order('category')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function updateSuggestionStatus(suggestionId: string, status: 'accepted' | 'dismissed'): Promise<void> {
  const { error } = await supabase!.from('packing_suggestions').update({ status }).eq('id', suggestionId)
  if (error) throw error
}

export async function dismissAllSuggestions(tripId: string): Promise<void> {
  const { error } = await supabase!.from('packing_suggestions').update({ status: 'dismissed' }).eq('trip_id', tripId).eq('status', 'pending')
  if (error) throw error
}
