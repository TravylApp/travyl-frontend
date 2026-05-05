/**
 * @module useTripActivities
 * Reads user-added activities from the `activity` table for a given trip.
 * These rows are written by `useAddToTrip` and live alongside (not inside)
 * `trip_context.itinerary`. Consumers merge these into the day view models
 * so user-added items appear on the calendar and respective tabs.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export interface TripActivityRow {
  id: string;
  trip_id: string;
  user_id: string | null;
  activity_name: string;
  activity_type: string | null;
  starting_date: string | null;
  ending_date: string | null;
  starting_time: string | null;
  ending_time: string | null;
  latitude: number | null;
  longitude: number | null;
  sort_order: number | null;
  notes: string | null;
  activity_data: any;
  created_at?: string;
}

export function useTripActivities(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip-activities', tripId],
    queryFn: async (): Promise<TripActivityRow[]> => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('trip_id', tripId)
        .order('starting_date', { ascending: true })
        .order('starting_time', { ascending: true });
      if (error) return [];
      return (data ?? []) as TripActivityRow[];
    },
    enabled: !!tripId,
    staleTime: 30 * 1000,
  });
}
