import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { fetchPackingSuggestions, updateSuggestionStatus } from '../services/packingService'
import type { PackingSuggestion, PackingCategory, DbPackingItem } from '../types'
import { PACKING_CATEGORIES } from '../types'

export function usePackingSuggestions(
  tripId: string | undefined,
  items: DbPackingItem[],
  addItem: (name: string, category: PackingCategory) => void,
) {
  const queryClient = useQueryClient()
  const hasAttemptedGeneration = useRef(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const suggestionsQuery = useQuery({
    queryKey: ['packingSuggestions', tripId],
    queryFn: () => fetchPackingSuggestions(tripId!),
    enabled: !!tripId,
  })

  const suggestions = suggestionsQuery.data ?? []

  const suggestionsByCategory = useMemo(() => {
    const grouped: Record<string, PackingSuggestion[]> = {}
    for (const cat of PACKING_CATEGORIES) {
      const catSuggestions = suggestions.filter((s) => s.category === cat)
      if (catSuggestions.length > 0) grouped[cat] = catSuggestions
    }
    return grouped
  }, [suggestions])

  const generateSuggestions = useCallback(async (refresh = false) => {
    if (!tripId || isGenerating) return
    setIsGenerating(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return

      const apiUrl = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL
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
    if (suggestionsQuery.isLoading) return
    if (items.length > 0) return
    if (suggestions.length > 0) return
    if (hasAttemptedGeneration.current) return

    hasAttemptedGeneration.current = true
    generateSuggestions(false)
  }, [tripId, suggestionsQuery.isLoading, items.length, suggestions.length, generateSuggestions])

  const acceptMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const suggestion = suggestions.find((s) => s.id === suggestionId)
      if (!suggestion) return
      await updateSuggestionStatus(suggestionId, 'accepted')
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
    mutationFn: (suggestionId: string) => updateSuggestionStatus(suggestionId, 'dismissed'),
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
        await updateSuggestionStatus(s.id, 'accepted')
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
