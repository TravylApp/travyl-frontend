import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addToItinerary as apiAddToItinerary,
  removeFromItinerary as apiRemoveFromItinerary,
  toggleFavorite as apiToggleFavorite,
  addBudgetExpense as apiAddBudgetExpense,
} from '../services/api';

/**
 * Centralized trip mutation actions.
 * Replace console.log placeholders — when Supabase tables exist,
 * these will hit real APIs and invalidate the relevant queries.
 */
export function useTripActions(tripId: string) {
  const queryClient = useQueryClient();

  const invalidateTrip = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
    queryClient.invalidateQueries({ queryKey: ['itinerary-days', tripId] });
  }, [queryClient, tripId]);

  const addToItinerary = useMutation({
    mutationFn: ({ itemId, dayNumber, timeSlot }: { itemId: string; dayNumber: number; timeSlot?: string }) =>
      apiAddToItinerary(tripId, itemId, dayNumber, timeSlot),
    onSuccess: invalidateTrip,
  });

  const removeFromItinerary = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      apiRemoveFromItinerary(tripId, itemId),
    onSuccess: invalidateTrip,
  });

  const toggleFavorite = useMutation({
    mutationFn: ({ itemId, isFavorited }: { itemId: string; isFavorited: boolean }) =>
      apiToggleFavorite(tripId, itemId, isFavorited),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', tripId] });
    },
  });

  const addExpense = useMutation({
    mutationFn: ({ category, amount, note }: { category: string; amount: number; note: string }) =>
      apiAddBudgetExpense(tripId, category, amount, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', tripId] });
    },
  });

  return {
    addToItinerary: addToItinerary.mutate,
    removeFromItinerary: removeFromItinerary.mutate,
    toggleFavorite: toggleFavorite.mutate,
    addExpense: addExpense.mutate,
    isAddingToItinerary: addToItinerary.isPending,
    isRemovingFromItinerary: removeFromItinerary.isPending,
    isTogglingFavorite: toggleFavorite.isPending,
  };
}
