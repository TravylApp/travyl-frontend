import { useQuery } from '@tanstack/react-query';
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

export function useDayStory(req: DayStoryRequest | null) {
  const enabled = !!req && !!req.tripId;
  const hash = enabled ? hashActivities(req!) : '';

  return useQuery<DayStory>({
    queryKey: ['day-story', req?.tripId, req?.dayIndex, hash],
    queryFn: () => fetchDayStory(req!),
    enabled,
    staleTime: Infinity,        // story stays valid until activities change
    gcTime: 30 * 60_000,        // keep cached for 30 min after unmount
    retry: 1,
  });
}
