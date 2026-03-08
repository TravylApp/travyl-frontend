import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchExploreRows } from '../services/api';
import { shuffle, pickFresh } from '../utils';
import { getShownIds } from '../utils/sessionTracker';
import type { ExploreRow } from '../types';

export function useExploreData() {
  const mountId = useRef(Symbol());
  const pickedRef = useRef<ExploreRow[] | null>(null);

  const query = useQuery({
    queryKey: ['explore-rows'],
    queryFn: fetchExploreRows,
  });

  const data = useMemo(() => {
    if (!query.data?.length) return query.data;

    if (!pickedRef.current) {
      pickedRef.current = shuffle(query.data).map((row) => ({
        ...row,
        items: pickFresh(row.items, row.items.length, getShownIds(`explore-${row.title}`)),
      }));
    }
    return pickedRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, mountId.current]);

  return { ...query, data };
}
