import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import SupabaseProvider from 'y-supabase';
import { supabase } from '../services/supabase';
import { fetchTrips } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { Trip } from '../types';

export type CalendarTrip = Pick<
  Trip,
  'id' | 'title' | 'destination' | 'start_date' | 'end_date' | 'status' | 'theme' | 'custom_theme_color'
>;

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

    // Capture user.id in a stable local variable so the async closure
    // doesn't have to re-read the possibly-null reactive value.
    const userId = user.id;
    let cancelled = false;
    const ydoc = new Y.Doc();
    const tripsMap = ydoc.getMap<Y.Map<unknown>>('trips');
    let provider: InstanceType<typeof SupabaseProvider> | null = null;

    function deriveTrips() {
      if (cancelled) return;
      const result: CalendarTrip[] = [];
      tripsMap.forEach((tripYMap) => {
        result.push({
          id: tripYMap.get('id') as string,
          title: tripYMap.get('title') as string,
          destination: tripYMap.get('destination') as string,
          start_date: tripYMap.get('start_date') as string,
          end_date: tripYMap.get('end_date') as string,
          status: tripYMap.get('status') as Trip['status'],
          theme: tripYMap.get('theme') as string,
          custom_theme_color: (tripYMap.get('custom_theme_color') as string | null) ?? null,
        });
      });
      setTrips(result);
    }

    async function init() {
      try {
        // Seed from Supabase REST before connecting provider (no race with remote updates)
        const rawTrips = await fetchTrips();
        if (cancelled) return;

        ydoc.transact(() => {
          for (const trip of rawTrips) {
            const tripYMap = new Y.Map<unknown>();
            tripsMap.set(trip.id, tripYMap); // insert first, then set values
            tripYMap.set('id', trip.id);
            tripYMap.set('title', trip.title);
            tripYMap.set('destination', trip.destination);
            tripYMap.set('start_date', trip.start_date);
            tripYMap.set('end_date', trip.end_date);
            tripYMap.set('status', trip.status);
            tripYMap.set('theme', trip.theme);
            tripYMap.set('custom_theme_color', trip.custom_theme_color ?? null);
          }
        });

        deriveTrips();
        if (cancelled) return;

        // Connect provider — merges any remote CRDT updates automatically.
        // y-supabase requires tableName/columnName/id even for channel-only
        // usage; these values are nominal since we use Presence channels.
        provider = new SupabaseProvider(ydoc, supabase, {
          channel: 'trips-' + userId,
          tableName: 'trips',
          columnName: 'data',
          id: userId,
        });

        tripsMap.observe(deriveTrips);
        if (!cancelled) setIsLoading(false);
      } catch {
        if (!cancelled) {
          setIsError(true);
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      tripsMap.unobserve(deriveTrips);
      provider?.destroy();
      ydoc.destroy();
    };
  }, [user]);

  return { trips, isLoading, isError };
}
