import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDayStory } from '../services/dayStory';
import type { DayStory, DayStoryRequest } from '../types';

/**
 * Stable cache key — only changes when activities for this day change.
 * Reorders within the same day still re-key (intentional: the story narrates
 * the order of moments, so reorders should regenerate).
 */
function hashActivities(req: DayStoryRequest): string {
  return req.activities
    .map((a) => `${a.name}|${a.type}|${a.startHour}`)
    .join('::');
}

/**
 * Fetches the editorial day-story for a single day.
 *
 * Refresh semantics — when activities change (typical flow: user edits in
 * Calendar, navigates back to Overview):
 * - The cache key embeds a hash of `(name | type | startHour)` per activity.
 * - Days whose activities are unchanged keep the same hash → React Query
 *   returns the cached story with no network call.
 * - Days whose activities changed have a new hash → a fresh fetch fires for
 *   that day only when its slide is rendered (so unviewed days never spend
 *   network budget).
 *
 * In short: per-day, lazy, change-driven. No redundant calls on return-to-view.
 */
export function useDayStory(req: DayStoryRequest | null) {
  const enabled = !!req && !!req.tripId;
  const hash = enabled ? hashActivities(req!) : '';
  const queryClient = useQueryClient();

  // Evict superseded stories for the same (tripId, dayIndex) so the cache
  // doesn't accumulate one entry per past edit during a long session.
  useEffect(() => {
    if (!enabled || !req) return;
    const stale = queryClient.getQueriesData<DayStory>({
      queryKey: ['day-story', req.tripId, req.dayIndex],
    });
    for (const [key] of stale) {
      if (Array.isArray(key) && key[3] !== hash) {
        queryClient.removeQueries({ queryKey: key, exact: true });
      }
    }
  }, [enabled, hash, queryClient, req]);

  return useQuery<DayStory>({
    queryKey: ['day-story', req?.tripId, req?.dayIndex, hash],
    queryFn: () => fetchDayStory(req!),
    enabled,
    staleTime: Infinity,        // story stays valid until activities change
    gcTime: 30 * 60_000,        // keep cached for 30 min after unmount
    retry: 1,
  });
}
