import { useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../stores';
import { useTrips } from './useTrips';
import { buildTripCardViewModel } from '../viewmodels/tripViewModel';

export function useHomeScreen() {
  const [tripQuery, setTripQuery] = useState('');
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const { data: trips, isLoading } = useTrips();

  const recentTrips = useMemo(
    () => (trips ?? []).slice(0, 3).map(buildTripCardViewModel),
    [trips],
  );

  const handleSearch = useCallback(() => {
    return !!tripQuery.trim();
  }, [tripQuery]);

  return {
    tripQuery,
    setTripQuery,
    handleSearch,
    recentTrips,
    showRecentTrips: !!user && !!trips && trips.length > 0,
    showLoadingSkeleton: !!user && isLoading,
    showEmptyState: !!user && !isLoading && !!trips && trips.length === 0,
    showCta: !authLoading && !user,
  };
}
