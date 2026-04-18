/**
 * @module usePackingSuggestions
 * Provides AI-generated packing suggestions for a trip. On first visit with an
 * empty packing list, automatically tries to generate suggestions via the backend
 * recommendation API (requires auth), falling back to local catalog-based suggestions
 * when the user is unauthenticated or the API URL is not configured.
 *
 * Suggestions can be accepted (which calls `addItem`) or dismissed, both with
 * optimistic UI updates. The `acceptAll` helper accepts the full pending list in sequence.
 *
 * Used by the web and mobile Packing screens to populate the suggestions carousel.
 */

'use client';

import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { fetchPackingSuggestions, updateSuggestionStatus } from '../services/packingService'
import { generatePackingSuggestions } from '../services/packingSuggestions'
import { useTrip } from './useTrip'
import type { PackingSuggestion, DbPackingItem } from '../types'

/**
 * Generates catalog-based packing suggestions locally without a network call.
 * Used as a fallback when the user is unauthenticated or the recommendation
 * API URL is not configured. Derives duration and weather context from the trip row.
 * @param trip - The full trip row (used for destination, dates, and weather context)
 * @returns Array of `PackingSuggestion` objects with synthetic local IDs (`local-N`)
 */
// Generate sensible default packing suggestions based on trip data
// Uses the smart catalog-based generator from packingSuggestions.ts
function generateLocalSuggestions(trip: any): PackingSuggestion[] {
  if (!trip) return []

  const duration = trip.start_date && trip.end_date
    ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
    : 5

  const weather = trip.trip_context?.weather
  return generatePackingSuggestions(
    {
      destination: trip.destination ?? '',
      country: undefined,
      startDate: trip.start_date ?? undefined,
      endDate: trip.end_date ?? undefined,
      durationDays: duration,
      weather: weather ? {
        current: weather.current ? { temp_f: weather.current.temp_f, conditions: weather.current.conditions } : undefined,
        forecast: weather.forecast?.map((d: any) => ({ high: d.high, low: d.low, conditions: d.conditions })),
      } : undefined,
    },
    trip.user_id ?? '',
  ).map((s, i) => ({
    ...s,
    id: `local-${i}`,
    created_at: new Date().toISOString(),
  }))
}

/**
 * Manages the packing suggestions flow for a trip.
 *
 * On mount (when the packing list is empty), automatically attempts to generate
 * suggestions. Authenticated users get backend AI suggestions; unauthenticated
 * users get local catalog suggestions derived from trip data.
 *
 * DB suggestions (fetched via React Query) take priority over local suggestions.
 * Both types support the same accept/dismiss/acceptAll interface.
 *
 * @param tripId - UUID of the trip, or undefined while loading
 * @param items - Current packing list items (used to skip auto-generation when non-empty)
 * @param addItem - Callback to add an item to the packing list (called on accept)
 * @returns Object with:
 *   - `suggestions` — combined suggestion list (DB or local)
 *   - `suggestionsByCategory` — suggestions grouped by category string
 *   - `isLoading` — true while the suggestions query is pending
 *   - `isGenerating` — true while a backend generation request is in flight
 *   - `hasGenerated` — whether generation has been attempted this session
 *   - `generateSuggestions` — manually trigger a (re-)generation
 *   - `acceptSuggestion(id)` — add the item to the packing list and remove the suggestion
 *   - `dismissSuggestion(id)` — remove the suggestion without adding the item
 *   - `acceptAll` — accept all pending suggestions in sequence
 *
 * @example
 * ```tsx
 * const { suggestions, acceptSuggestion, dismissSuggestion, acceptAll } =
 *   usePackingSuggestions(tripId, items, addItem);
 * ```
 */
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

  /**
   * Calls the backend recommendation API to generate or refresh packing suggestions.
   * Requires a valid Supabase auth token; silently returns if unauthenticated
   * or if `NEXT_PUBLIC_RECOMMENDATION_API_URL` is not configured.
   * @param refresh - When true, instructs the backend to discard cached suggestions and regenerate
   */
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
        await generateSuggestions(false)
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
