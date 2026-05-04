/**
 * @module useInspirationCards
 * Fetches inspiration cards from the API and selects a fresh subset of 8 that
 * the user has not recently seen, using a session-level "shown IDs" tracker.
 * The selected subset is stable for the lifetime of the component mount.
 * Used by the web HomePage inspiration carousel and the mobile HomeTab.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchInspirationCards } from '../services/api';
import { pickFresh } from '../utils';
import { getShownIds } from '../utils/sessionTracker';
import type { InspirationCard } from '../types';

/** Number of inspiration cards to display at one time. */
const INSPIRATION_DISPLAY_COUNT = 8;

/**
 * Fetches inspiration cards and returns a session-fresh selection of up to
 * {@link INSPIRATION_DISPLAY_COUNT} cards that the user has not recently viewed.
 *
 * The selection is computed once per mount (guarded by `pickedRef`) so it
 * remains stable across re-renders. A `Symbol` stored in `mountId` is included
 * in the `useMemo` dependency array to force recomputation on remount.
 *
 * @returns React Query result with `data: InspirationCard[]`, `isLoading`, and `error`.
 *   `data` is a freshly-picked subset rather than the full API response.
 * @example
 * ```tsx
 * const { data: cards, isLoading } = useInspirationCards();
 * if (isLoading) return <CardSkeleton />;
 * return cards?.map(c => <InspirationCard key={c.id} card={c} />);
 * ```
 */
export function useInspirationCards() {
  const mountId = useRef(Symbol());
  const pickedRef = useRef<InspirationCard[] | null>(null);

  const query = useQuery({
    queryKey: ['inspiration-cards'],
    queryFn: fetchInspirationCards,
  });

  const data = useMemo(() => {
    if (!query.data?.length) return query.data;

    if (!pickedRef.current) {
      pickedRef.current = pickFresh(query.data, INSPIRATION_DISPLAY_COUNT, getShownIds('inspiration'));
    }
    return pickedRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, mountId.current]);

  return { ...query, data };
}
