import { supabase } from './supabase'
import type { DbPackingItem, PackingAuditEntry, PackingCategory } from '../types'

export async function fetchPackingItems(tripId: string): Promise<DbPackingItem[]> {
  const { data, error } = await supabase
    .from('packing_items')
    .select('*, profiles:user_id(display_name, avatar_url)')
    .eq('trip_id', tripId)
    .order('category')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    user_display_name: row.profiles?.display_name ?? null,
    user_avatar_url: row.profiles?.avatar_url ?? null,
    profiles: undefined,
  }))
}

export async function fetchPackingAuditLog(tripId: string, limit = 50): Promise<PackingAuditEntry[]> {
  const { data, error } = await supabase
    .from('packing_audit_log')
    .select('*, profiles:user_id(display_name, avatar_url)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    user_display_name: row.profiles?.display_name ?? null,
    user_avatar_url: row.profiles?.avatar_url ?? null,
    profiles: undefined,
  }))
}

export async function insertPackingItem(tripId: string, userId: string, name: string, category: PackingCategory, sortOrder: number): Promise<DbPackingItem> {
  const { data, error } = await supabase.from('packing_items').insert({ trip_id: tripId, user_id: userId, name, category, sort_order: sortOrder }).select().single()
  if (error) throw error
  return data
}

export async function updatePackingItemPacked(itemId: string, isPacked: boolean, packedBy: string | null): Promise<void> {
  const { error } = await supabase.from('packing_items').update({ is_packed: isPacked, packed_by: isPacked ? packedBy : null, packed_at: isPacked ? new Date().toISOString() : null }).eq('id', itemId)
  if (error) throw error
}

export async function deletePackingItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('packing_items').delete().eq('id', itemId)
  if (error) throw error
}
