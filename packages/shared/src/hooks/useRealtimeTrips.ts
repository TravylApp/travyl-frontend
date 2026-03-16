import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { fetchTrips } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { Trip } from '../types';

export type CalendarTrip = Pick<
  Trip,
  'id' | 'title' | 'destination' | 'start_date' | 'end_date' | 'status' | 'theme' | 'custom_theme_color'
>;

function toCalendarTrip(trip: Trip): CalendarTrip {
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
    status: trip.status,
    theme: trip.theme,
    custom_theme_color: trip.custom_theme_color ?? null,
  };
}

export function useRealtimeTrips(): {
  trips: CalendarTrip[];
  isLoading: boolean;
  isError: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const [trips, setTrips] = useState<CalendarTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const rawTrips = await fetchTrips();
        if (!cancelled) {
          setTrips(rawTrips.map(toCalendarTrip));
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsError(true);
          setIsLoading(false);
        }
      }
    }

    load();

    const channel = supabase
      .channel('trips-realtime-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        fetchTrips().then((rawTrips) => {
          if (!cancelled) setTrips(rawTrips.map(toCalendarTrip));
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { trips, isLoading, isError };
}
