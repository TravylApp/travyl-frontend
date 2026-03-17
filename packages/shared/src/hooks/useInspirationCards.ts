import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchInspirationCards } from '../services/api';
import { pickFresh } from '../utils';
import { getShownIds } from '../utils/sessionTracker';
import type { InspirationCard } from '../types';

const INSPIRATION_DISPLAY_COUNT = 8;

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
