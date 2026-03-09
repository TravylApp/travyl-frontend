import { useMutation, useQueryClient } from '@tanstack/react-query';
import { forkTrip } from '../services/api';
import type { Trip } from '../types';

interface ForkTripVariables {
  tripId: string;
}

export function useForkTrip() {
  const queryClient = useQueryClient();

  return useMutation<Trip, Error, ForkTripVariables>({
    mutationFn: ({ tripId }) => forkTrip(tripId),
    onSuccess: (newTrip) => {
      // Invalidate trips list to show the new forked trip
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      // Also invalidate any cached data for the new trip
      queryClient.invalidateQueries({ queryKey: ['trip', newTrip.id] });
    },
  });
}
