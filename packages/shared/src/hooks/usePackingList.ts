import { useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { fetchPackingItems, fetchPackingAuditLog, insertPackingItem, updatePackingItemPacked, deletePackingItem } from '../services/packingService'
import type { DbPackingItem, PackingCategory } from '../types'
import { PACKING_CATEGORIES } from '../types'

export function usePackingList(tripId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  const itemsQuery = useQuery({
    queryKey: ['packingItems', tripId],
    queryFn: () => fetchPackingItems(tripId!),
    enabled: !!tripId,
  })

  const auditQuery = useQuery({
    queryKey: ['packingAuditLog', tripId],
    queryFn: () => fetchPackingAuditLog(tripId!),
    enabled: !!tripId,
  })

  useEffect(() => {
    if (!tripId || !userId) return
    const channel = supabase
      .channel(`packing-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packing_items', filter: `trip_id=eq.${tripId}` }, (payload) => {
        const record = (payload.new ?? payload.old) as any
        if (record?.user_id === userId) return
        queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
        queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId, userId, queryClient])

  const itemsByCategory = useMemo(() => {
    const items = itemsQuery.data ?? []
    const grouped: Record<string, DbPackingItem[]> = {}
    for (const cat of PACKING_CATEGORIES) {
      const catItems = items.filter((item) => item.category === cat)
      if (catItems.length > 0) grouped[cat] = catItems
    }
    return grouped
  }, [itemsQuery.data])

  const progress = useMemo(() => {
    const items = itemsQuery.data ?? []
    const total = items.length
    const packed = items.filter((i) => i.is_packed).length
    return { total, packed, percent: total > 0 ? Math.round((packed / total) * 100) : 0 }
  }, [itemsQuery.data])

  const addItemMutation = useMutation({
    mutationFn: async ({ name, category }: { name: string; category: PackingCategory }) => {
      const items = itemsQuery.data ?? []
      const catItems = items.filter((i) => i.category === category)
      const maxSort = catItems.length > 0 ? Math.max(...catItems.map((i) => i.sort_order)) : -1
      return insertPackingItem(tripId!, userId!, name, category, maxSort + 1)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
      queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
    },
  })

  const togglePackedMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const items = itemsQuery.data ?? []
      const item = items.find((i) => i.id === itemId)
      if (!item) return
      return updatePackingItemPacked(itemId, !item.is_packed, userId ?? null)
    },
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['packingItems', tripId] })
      const previous = queryClient.getQueryData<DbPackingItem[]>(['packingItems', tripId])
      queryClient.setQueryData<DbPackingItem[]>(['packingItems', tripId], (old) =>
        (old ?? []).map((item) => item.id === itemId ? { ...item, is_packed: !item.is_packed, packed_by: !item.is_packed ? userId ?? null : null, packed_at: !item.is_packed ? new Date().toISOString() : null } : item)
      )
      return { previous }
    },
    onError: (_err: unknown, _id: string, context: { previous: DbPackingItem[] | undefined } | undefined) => { if (context?.previous) queryClient.setQueryData(['packingItems', tripId], context.previous) },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
      queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => deletePackingItem(itemId),
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['packingItems', tripId] })
      const previous = queryClient.getQueryData<DbPackingItem[]>(['packingItems', tripId])
      queryClient.setQueryData<DbPackingItem[]>(['packingItems', tripId], (old) => (old ?? []).filter((item) => item.id !== itemId))
      return { previous }
    },
    onError: (_err: unknown, _id: string, context: { previous: DbPackingItem[] | undefined } | undefined) => { if (context?.previous) queryClient.setQueryData(['packingItems', tripId], context.previous) },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
      queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
    },
  })

  const addItem = useCallback((name: string, category: PackingCategory) => addItemMutation.mutate({ name, category }), [addItemMutation])
  const togglePacked = useCallback((itemId: string) => togglePackedMutation.mutate(itemId), [togglePackedMutation])
  const removeItem = useCallback((itemId: string) => removeItemMutation.mutate(itemId), [removeItemMutation])

  return { items: itemsQuery.data ?? [], itemsByCategory, auditLog: auditQuery.data ?? [], progress, isLoading: itemsQuery.isLoading, error: itemsQuery.error, addItem, togglePacked, removeItem }
}
