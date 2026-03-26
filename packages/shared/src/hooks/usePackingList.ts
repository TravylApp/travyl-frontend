import { useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { fetchPackingItems, fetchPackingAuditLog, insertPackingItem, insertAuditEntry, updatePackingItemPacked, updatePackingQuantity, updatePackedCount, deletePackingItem, claimPackingItem, releasePackingItem, transferPackingItem } from '../services/packingService'
import type { DbPackingItem, PackingCategory } from '../types'
import { PACKING_CATEGORIES } from '../types'
import { computePackingProgress } from '../utils/packingUtils'

export function usePackingList(tripId: string | undefined, userId: string | undefined, filterBy?: string) {
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

  const items = itemsQuery.data ?? []

  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, DbPackingItem[]> = {}
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = []
      grouped[item.category].push(item)
    }
    return grouped
  }, [items])

  const orderedCategories = useMemo(() => {
    const allCats = Object.keys(itemsByCategory)
    const staticOrder = PACKING_CATEGORIES.filter((c) => allCats.includes(c))
    const dynamic = allCats.filter((c) => !(PACKING_CATEGORIES as readonly string[]).includes(c)).sort()
    return [...staticOrder, ...dynamic]
  }, [itemsByCategory])

  const filteredItems = useMemo(() => {
    if (!filterBy || filterBy === 'all') return items
    switch (filterBy) {
      case 'mine': return items.filter((i) => i.owner_id === userId)
      case 'shared': return items.filter((i) => !i.owner_id && !i.group_tag)
      case 'kids': return items.filter((i) => i.group_tag === 'kids')
      case 'adults': return items.filter((i) => i.group_tag === 'adults')
      default: return items
    }
  }, [items, filterBy, userId])

  const progress = useMemo(() => computePackingProgress(items), [items])

  const addItemMutation = useMutation({
    mutationFn: async ({ name, category }: { name: string; category: PackingCategory }) => {
      const catItems = items.filter((i) => i.category === category)
      const maxSort = catItems.length > 0 ? Math.max(...catItems.map((i) => i.sort_order)) : -1
      const newItem = await insertPackingItem(tripId!, userId!, name, category, maxSort + 1)
      await insertAuditEntry(tripId!, userId!, newItem.id, 'added', name).catch(() => {})
      return newItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
      queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
    },
  })

  // quantity = 1 path: full toggle with packed_by/packed_at attribution
  const togglePackedMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const item = items.find((i) => i.id === itemId)
      if (!item) return
      const newPacked = !item.is_packed
      await updatePackingItemPacked(itemId, newPacked, userId ?? null, item.quantity)
      await insertAuditEntry(tripId!, userId!, itemId, newPacked ? 'packed' : 'unpacked', item.name).catch(() => {})
    },
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['packingItems', tripId] })
      const previous = queryClient.getQueryData<DbPackingItem[]>(['packingItems', tripId])
      queryClient.setQueryData<DbPackingItem[]>(['packingItems', tripId], (old) =>
        (old ?? []).map((item) => {
          if (item.id !== itemId) return item
          const newPacked = !item.is_packed
          return {
            ...item,
            is_packed: newPacked,
            packed_count: newPacked ? item.quantity : 0,
            packed_by: newPacked ? userId ?? null : null,
            packed_at: newPacked ? new Date().toISOString() : null,
          }
        })
      )
      return { previous }
    },
    onError: (_err: unknown, _id: string, context: { previous: DbPackingItem[] | undefined } | undefined) => {
      if (context?.previous) queryClient.setQueryData(['packingItems', tripId], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
      queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
    },
  })

  // quantity > 1 path: increment packed_count, cycle back to 0 when full
  const incrementPackedMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const item = items.find((i) => i.id === itemId)
      if (!item) return
      const newPackedCount = item.packed_count >= item.quantity ? 0 : item.packed_count + 1
      const newIsPacked = newPackedCount >= item.quantity
      await updatePackedCount(itemId, newPackedCount, item.quantity)
      if (newIsPacked && !item.is_packed) {
        await insertAuditEntry(tripId!, userId!, itemId, 'packed', item.name).catch(() => {})
      } else if (!newIsPacked && item.is_packed) {
        await insertAuditEntry(tripId!, userId!, itemId, 'unpacked', item.name).catch(() => {})
      }
    },
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['packingItems', tripId] })
      const previous = queryClient.getQueryData<DbPackingItem[]>(['packingItems', tripId])
      queryClient.setQueryData<DbPackingItem[]>(['packingItems', tripId], (old) =>
        (old ?? []).map((item) => {
          if (item.id !== itemId) return item
          const newPackedCount = item.packed_count >= item.quantity ? 0 : item.packed_count + 1
          return { ...item, packed_count: newPackedCount, is_packed: newPackedCount >= item.quantity }
        })
      )
      return { previous }
    },
    onError: (_err: unknown, _id: string, context: { previous: DbPackingItem[] | undefined } | undefined) => {
      if (context?.previous) queryClient.setQueryData(['packingItems', tripId], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
    },
  })

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const item = items.find((i) => i.id === id)
      const previousPackedCount = item?.packed_count ?? 0
      await updatePackingQuantity(id, quantity, previousPackedCount)
    },
    onMutate: async ({ id, quantity }: { id: string; quantity: number }) => {
      await queryClient.cancelQueries({ queryKey: ['packingItems', tripId] })
      const previous = queryClient.getQueryData<DbPackingItem[]>(['packingItems', tripId])
      queryClient.setQueryData<DbPackingItem[]>(['packingItems', tripId], (old) =>
        (old ?? []).map((item) => {
          if (item.id !== id) return item
          if (quantity <= item.packed_count) {
            return { ...item, quantity, packed_count: quantity, is_packed: true }
          }
          return { ...item, quantity }
        })
      )
      return { previous }
    },
    onError: (_err: unknown, _vars: { id: string; quantity: number }, context: { previous: DbPackingItem[] | undefined } | undefined) => {
      if (context?.previous) queryClient.setQueryData(['packingItems', tripId], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const item = items.find((i) => i.id === itemId)
      await deletePackingItem(itemId)
      if (item) await insertAuditEntry(tripId!, userId!, itemId, 'removed', item.name).catch(() => {})
    },
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

  const togglePacked = useCallback((itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    if (item.quantity === 1) {
      togglePackedMutation.mutate(itemId)
    } else {
      incrementPackedMutation.mutate(itemId)
    }
  }, [items, togglePackedMutation, incrementPackedMutation])

  const incrementPacked = useCallback((itemId: string) => incrementPackedMutation.mutate(itemId), [incrementPackedMutation])
  const updateQuantity = useCallback((id: string, quantity: number) => updateQuantityMutation.mutate({ id, quantity }), [updateQuantityMutation])
  const removeItem = useCallback((itemId: string) => removeItemMutation.mutate(itemId), [removeItemMutation])

  const claimItem = useCallback(async (itemId: string) => {
    if (!tripId || !userId) return
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    const success = await claimPackingItem(itemId, userId)
    if (!success) {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
      return
    }
    await insertAuditEntry(tripId, userId, itemId, 'claimed', item.name).catch(() => {})
    queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
    queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
  }, [items, tripId, userId, queryClient])

  const releaseItem = useCallback(async (itemId: string) => {
    if (!tripId || !userId) return
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    await releasePackingItem(itemId)
    await insertAuditEntry(tripId, userId, itemId, 'released', item.name).catch(() => {})
    queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
    queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
  }, [items, tripId, userId, queryClient])

  const transferItem = useCallback(async (itemId: string, targetUserId: string) => {
    if (!tripId || !userId) return
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    await transferPackingItem(itemId, targetUserId)
    await insertAuditEntry(tripId, userId, itemId, 'transferred', item.name, targetUserId).catch(() => {})
    queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
    queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
  }, [items, tripId, userId, queryClient])

  return { items, itemsByCategory, orderedCategories, filteredItems, auditLog: auditQuery.data ?? [], progress, isLoading: itemsQuery.isLoading, error: itemsQuery.error, addItem, togglePacked, incrementPacked, updateQuantity, removeItem, claimItem, releaseItem, transferItem }
}
