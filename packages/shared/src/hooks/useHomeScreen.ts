/**
 * @module useHomeScreen
 * Aggregates all state required to render the home/dashboard screen:
 * auth state, the user's three most-recent trips, a trip search query,
 * and conditional visibility flags for loading skeletons, empty states,
 * and the sign-in CTA.
 * Used by the web HomePage and mobile HomeTab.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '../stores';
import { useTrips } from './useTrips';
import { buildTripCardViewModel } from '../viewmodels/tripViewModel';

/**
 * Provides all view state required to render the home screen.
 * Combines auth, trips data, and a local trip search query into a single
 * object so the UI layer remains free of data-fetching concerns.
 *
 * @returns Object containing:
 *   - `tripQuery` — current value of the trip search input
 *   - `setTripQuery` — setter for `tripQuery`
 *   - `handleSearch()` — returns `true` if `tripQuery` contains non-whitespace text
 *   - `recentTrips` — up to 3 most-recent trips mapped to `TripCardViewModel`
 *   - `showRecentTrips` — `true` when the user is logged in and has at least one trip
 *   - `showLoadingSkeleton` — `true` while trips are loading for an authenticated user
 *   - `showEmptyState` — `true` when the authenticated user has no trips after loading
 *   - `showCta` — `true` when auth has resolved and no user is logged in
 * @example
 * ```tsx
 * const { recentTrips, showLoadingSkeleton, showCta } = useHomeScreen();
 * if (showLoadingSkeleton) return <TripSkeleton />;
 * if (showCta) return <SignInBanner />;
 * return recentTrips.map(t => <TripCard key={t.id} {...t} />);
 * ```
 */
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
