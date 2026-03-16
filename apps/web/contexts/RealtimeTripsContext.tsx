'use client';

import { createContext, useContext } from 'react';
import { useRealtimeTrips } from '@travyl/shared';
import type { CalendarTrip } from '@travyl/shared';

interface RealtimeTripsContextValue {
  trips: CalendarTrip[];
  isLoading: boolean;
  isError: boolean;
}

const RealtimeTripsContext = createContext<RealtimeTripsContextValue | null>(null);

export function RealtimeTripsProvider({ children }: { children: React.ReactNode }) {
  const { trips, isLoading, isError } = useRealtimeTrips();
  return (
    <RealtimeTripsContext.Provider value={{ trips, isLoading, isError }}>
      {children}
    </RealtimeTripsContext.Provider>
  );
}

export function useRealtimeTripsContext(): RealtimeTripsContextValue {
  const ctx = useContext(RealtimeTripsContext);
  if (!ctx) throw new Error('useRealtimeTripsContext must be used within RealtimeTripsProvider');
  return ctx;
}
