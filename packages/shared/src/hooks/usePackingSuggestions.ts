import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { fetchPackingSuggestions, updateSuggestionStatus } from '../services/packingService'
import { useTrip } from './useTrip'
import type { PackingSuggestion, DbPackingItem } from '../types'

// Generate sensible default packing suggestions based on trip data
function generateLocalSuggestions(trip: any): PackingSuggestion[] {
  const dest = trip?.destination ?? ''
  const duration = trip?.start_date && trip?.end_date
    ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
    : 5
  const weather = trip?.trip_context?.weather?.forecast?.[0]
  const isWarm = weather ? weather.high > 20 : true
  const isCold = weather ? weather.low < 10 : false

  const items: { name: string; category: string }[] = [
    // Essentials
    { name: 'Passport', category: 'documents' },
    { name: 'Travel insurance docs', category: 'documents' },
    { name: 'Phone charger', category: 'electronics' },
    { name: 'Power adapter', category: 'electronics' },
    { name: 'Headphones', category: 'electronics' },
    { name: 'Wallet & cards', category: 'documents' },
    // Toiletries
    { name: 'Toothbrush & toothpaste', category: 'toiletries' },
    { name: 'Deodorant', category: 'toiletries' },
    { name: 'Sunscreen', category: 'toiletries' },
    { name: 'Shampoo (travel size)', category: 'toiletries' },
    { name: 'Medications', category: 'health' },
    // Clothing — adjust for weather
    { name: `T-shirts (${Math.min(duration, 7)})`, category: 'clothing' },
    { name: `Underwear (${Math.min(duration + 1, 8)})`, category: 'clothing' },
    { name: `Socks (${Math.min(duration, 7)} pairs)`, category: 'clothing' },
    { name: 'Comfortable walking shoes', category: 'clothing' },
    { name: 'Sleepwear', category: 'clothing' },
  ]

  if (isWarm) {
    items.push({ name: 'Shorts (2-3)', category: 'clothing' })
    items.push({ name: 'Sunglasses', category: 'accessories' })
    items.push({ name: 'Hat / cap', category: 'accessories' })
    items.push({ name: 'Sandals / flip-flops', category: 'clothing' })
    items.push({ name: 'Swimsuit', category: 'clothing' })
  }
  if (isCold) {
    items.push({ name: 'Warm jacket', category: 'clothing' })
    items.push({ name: 'Scarf', category: 'accessories' })
    items.push({ name: 'Gloves', category: 'accessories' })
    items.push({ name: 'Thermal layers', category: 'clothing' })
  }
  if (!isWarm && !isCold) {
    items.push({ name: 'Light jacket', category: 'clothing' })
    items.push({ name: 'Jeans / pants (2)', category: 'clothing' })
  }

  // Extras
  items.push({ name: 'Reusable water bottle', category: 'accessories' })
  items.push({ name: 'Day bag / backpack', category: 'accessories' })
  items.push({ name: 'Travel pillow', category: 'comfort' })

  return items.map((item, i) => ({
    id: `local-${i}`,
    trip_id: trip?.id ?? '',
    user_id: null as any,
    name: item.name,
    category: item.category,
    reason: null as any,
    source: 'auto' as const,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
  }))
}

export function usePackingSuggestions(
  tripId: string | undefined,
  items: DbPackingItem[],
  addItem: (name: string, category: string) => void,
) {
  const queryClient = useQueryClient()
  const hasAttemptedGeneration = useRef(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [localSuggestions, setLocalSuggestions] = useState<PackingSuggestion[]>([])
  const tripQuery = useTrip(tripId)

  const suggestionsQuery = useQuery({
    queryKey: ['packingSuggestions', tripId],
    queryFn: () => fetchPackingSuggestions(tripId!),
    enabled: !!tripId,
  })

  const dbSuggestions = suggestionsQuery.data ?? []
  const suggestions = dbSuggestions.length > 0 ? dbSuggestions : localSuggestions

  const suggestionsByCategory = useMemo(() => {
    const grouped: Record<string, PackingSuggestion[]> = {}
    for (const s of suggestions) {
      if (!grouped[s.category]) grouped[s.category] = []
      grouped[s.category].push(s)
    }
    return grouped
  }, [suggestions])

  const generateSuggestions = useCallback(async (refresh = false) => {
    if (!tripId || isGenerating) return
    setIsGenerating(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL
      if (!apiUrl) {
        console.warn('[usePackingSuggestions] NEXT_PUBLIC_RECOMMENDATION_API_URL not set')
        return
      }
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return

      await fetch(`${apiUrl}/packing-suggest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId, refresh }),
      })

      queryClient.invalidateQueries({ queryKey: ['packingSuggestions', tripId] })
    } catch (err) {
      console.error('[usePackingSuggestions] generate error:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [tripId, isGenerating, queryClient])

  // Auto-generate on first visit when packing list is empty
  useEffect(() => {
    if (!tripId) return
    if (suggestionsQuery.isLoading || tripQuery.isLoading) return
    if (items.length > 0) return
    if (suggestions.length > 0) return
    if (hasAttemptedGeneration.current) return

    // Try backend generation first (requires auth)
    const tryGenerate = async () => {
      const session = await supabase.auth.getSession()
      if (session.data.session?.access_token) {
        hasAttemptedGeneration.current = true
        generateSuggestions(false)
      } else if (tripQuery.data) {
        hasAttemptedGeneration.current = true
        setLocalSuggestions(generateLocalSuggestions(tripQuery.data))
      }
      // If neither auth nor trip data, don't mark as attempted — let it retry
    }
    tryGenerate()
  }, [tripId, suggestionsQuery.isLoading, tripQuery.isLoading, items.length, suggestions.length, generateSuggestions, tripQuery.data])

  const acceptMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const suggestion = suggestions.find((s) => s.id === suggestionId)
      if (!suggestion) return
      // Skip Supabase call for local suggestions (id starts with 'local-')
      if (!suggestionId.startsWith('local-')) {
        await updateSuggestionStatus(suggestionId, 'accepted')
      } else {
        // Remove from local state
        setLocalSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      }
      addItem(suggestion.name, suggestion.category)
    },
    onMutate: async (suggestionId: string) => {
      await queryClient.cancelQueries({ queryKey: ['packingSuggestions', tripId] })
      const previous = queryClient.getQueryData<PackingSuggestion[]>(['packingSuggestions', tripId])
      queryClient.setQueryData<PackingSuggestion[]>(['packingSuggestions', tripId], (old) =>
        (old ?? []).filter((s) => s.id !== suggestionId)
      )
      return { previous }
    },
    onError: (_err: unknown, _id: string, context: { previous?: PackingSuggestion[] } | undefined) => {
      if (context?.previous) queryClient.setQueryData(['packingSuggestions', tripId], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingSuggestions', tripId] })
    },
  })

  const dismissMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      if (!suggestionId.startsWith('local-')) {
        await updateSuggestionStatus(suggestionId, 'dismissed')
      } else {
        setLocalSuggestions(prev => prev.filter(s => s.id !== suggestionId))
      }
    },
    onMutate: async (suggestionId: string) => {
      await queryClient.cancelQueries({ queryKey: ['packingSuggestions', tripId] })
      const previous = queryClient.getQueryData<PackingSuggestion[]>(['packingSuggestions', tripId])
      queryClient.setQueryData<PackingSuggestion[]>(['packingSuggestions', tripId], (old) =>
        (old ?? []).filter((s) => s.id !== suggestionId)
      )
      return { previous }
    },
    onError: (_err: unknown, _id: string, context: { previous?: PackingSuggestion[] } | undefined) => {
      if (context?.previous) queryClient.setQueryData(['packingSuggestions', tripId], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingSuggestions', tripId] })
    },
  })

  const acceptSuggestion = useCallback((id: string) => acceptMutation.mutate(id), [acceptMutation])
  const dismissSuggestion = useCallback((id: string) => dismissMutation.mutate(id), [dismissMutation])

  const acceptAll = useCallback(async () => {
    const pending = [...suggestions]
    for (const s of pending) {
      try {
        if (!s.id.startsWith('local-')) {
          await updateSuggestionStatus(s.id, 'accepted')
        } else {
          setLocalSuggestions(prev => prev.filter(ls => ls.id !== s.id))
        }
        addItem(s.name, s.category)
      } catch (err) {
        console.error('[usePackingSuggestions] acceptAll error for:', s.name, err)
      }
    }
    queryClient.invalidateQueries({ queryKey: ['packingSuggestions', tripId] })
    queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
  }, [suggestions, addItem, queryClient, tripId])

  return {
    suggestions,
    suggestionsByCategory,
    isLoading: suggestionsQuery.isLoading,
    isGenerating,
    hasGenerated: hasAttemptedGeneration.current,
    generateSuggestions: useCallback(() => generateSuggestions(true), [generateSuggestions]),
    acceptSuggestion,
    dismissSuggestion,
    acceptAll,
  }
}
