'use client';

import { useRealtimeTripsContext } from '@/contexts/RealtimeTripsContext';
import { CalendarGrid } from '@/components/trips/CalendarGrid';

export default function TripsCalendarPage() {
  const { trips, isLoading, isError } = useRealtimeTripsContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)] text-sm text-gray-500">
        Loading trips…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)] text-sm text-red-500">
        Failed to load trips.
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-48px)]">
      <CalendarGrid trips={trips} />
    </div>
  );
}
