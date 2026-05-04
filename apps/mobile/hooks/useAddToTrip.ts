import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTrips, useTrip, supabase, mapToDbType } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';

export interface AddToTripState {
  visible: boolean;
  place: PlaceItem | null;
  tripId: string | null;
  tripDays: string[];
  trips: { id: string; name: string }[];
  step: 'pick-trip' | 'pick-day';
}

/**
 * Returns [addToTrip, sheetState, sheetActions] for rendering a custom bottom sheet.
 * When tripId is provided (inside a trip screen), skips trip picker.
 * Remembers the last-selected trip so repeat adds go straight to the day picker.
 */
export function useAddToTrip(tripId?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: trips } = useTrips();
  const resolvedTripId = typeof tripId === 'string' && tripId.length > 0 ? tripId : undefined;

  // Get trip data when inside a trip
  const { data: currentTrip } = useTrip(resolvedTripId);

  // Remember the last trip the user picked (persists across sheet opens)
  const lastTripIdRef = useRef<string | null>(null);

  const [state, setState] = useState<AddToTripState>({
    visible: false,
    place: null,
    tripId: null,
    tripDays: [],
    trips: [],
    step: 'pick-trip',
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  const getDays = useCallback((trip: any): string[] => {
    if (!trip?.start_date || !trip?.end_date) return ['Day 1', 'Day 2', 'Day 3'];
    const start = new Date(trip.start_date + 'T12:00:00');
    const end = new Date(trip.end_date + 'T12:00:00');
    const days: string[] = [];
    const d = new Date(start);
    let i = 1;
    while (d <= end) {
      days.push(`Day ${i} — ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`);
      d.setDate(d.getDate() + 1);
      i++;
    }
    return days.length > 0 ? days : ['Day 1', 'Day 2', 'Day 3'];
  }, []);

  const openDayPicker = useCallback((place: PlaceItem, tid: string, trip: any) => {
    setState({
      visible: true,
      place,
      tripId: tid,
      tripDays: getDays(trip),
      trips: [],
      step: 'pick-day',
    });
  }, [getDays]);

  const addToTrip = useCallback((place: PlaceItem) => {
    // 1. Inside a trip screen — always go straight to day picker
    if (resolvedTripId) {
      openDayPicker(place, resolvedTripId, currentTrip);
      return;
    }

    // 2. Remember last selected trip — skip trip picker on repeat adds
    if (lastTripIdRef.current) {
      const remembered = trips?.find(t => t.id === lastTripIdRef.current);
      if (remembered) {
        openDayPicker(place, remembered.id, remembered);
        return;
      }
      lastTripIdRef.current = null; // trip was deleted
    }

    // 3. No trips — show create option
    if (!trips?.length) {
      setState({
        visible: true,
        place,
        tripId: null,
        tripDays: [],
        trips: [],
        step: 'pick-trip',
      });
      return;
    }

    // 4. Single trip — skip to day picker
    if (trips.length === 1) {
      openDayPicker(place, trips[0].id, trips[0]);
      return;
    }

    // 5. Multiple trips — show trip picker
    setState({
      visible: true,
      place,
      tripId: null,
      tripDays: [],
      trips: trips.slice(0, 6).map(t => ({
        id: t.id,
        name: t.destination || t.title || 'Trip',
      })),
      step: 'pick-trip',
    });
  }, [resolvedTripId, currentTrip, trips, openDayPicker]);

  const selectTrip = useCallback((id: string) => {
    const trip = trips?.find(t => t.id === id);
    lastTripIdRef.current = id;
    setState(prev => ({
      ...prev,
      tripId: id,
      tripDays: getDays(trip),
      step: 'pick-day',
    }));
  }, [trips, getDays]);

  const selectDay = useCallback((_dayLabel: string, dayIndex: number) => {
    const { place, tripId: tid } = stateRef.current;
    if (!place || !tid) {
      setState(prev => ({ ...prev, visible: false }));
      return;
    }

    // Remember this trip for next add
    lastTripIdRef.current = tid;

    // Calculate the date for this day index
    const trip = resolvedTripId ? currentTrip : trips?.find(t => t.id === tid);
    let date = new Date().toISOString().split('T')[0];
    if (trip?.start_date) {
      const start = new Date(trip.start_date + 'T12:00:00');
      start.setDate(start.getDate() + dayIndex);
      date = start.toISOString().split('T')[0];
    }

    // Persist to activity table
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.id) {
        console.warn('[addToTrip] skipping insert — no authenticated user');
        return;
      }
      supabase.from('activity').insert({
        trip_id: tid,
        user_id: user.id,
        activity_name: place.name,
        activity_type: mapToDbType(place.type || 'other'),
        starting_date: date,
        ending_date: date,
        starting_time: '09:00',
        ending_time: '11:00',
        latitude: place.latitude ?? 0,
        longitude: place.longitude ?? 0,
        sort_order: 0,
        notes: place.description || '',
        activity_data: {
          image_url: place.image || (place.images?.[0] ?? ''),
          category: place.category || place.type || '',
          location_name: place.name,
          rating: place.rating,
          tags: place.tags,
        },
      }).then(({ error }) => {
        if (error) {
          console.warn('[addToTrip] insert failed:', error.message);
          return;
        }
        // Refetch the activities so it shows up on the calendar / tabs immediately
        queryClient.invalidateQueries({ queryKey: ['trip-activities', tid] });
      });
    });

    setState(prev => ({ ...prev, visible: false }));
  }, [resolvedTripId, currentTrip, trips]);

  const dismiss = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  const createTrip = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
    router.push('/(tabs)/trips');
  }, [router]);

  return { addToTrip, state, selectTrip, selectDay, dismiss, createTrip };
}
