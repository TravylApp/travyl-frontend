import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMosaicTiles } from '../services/api';
import { pickFresh } from '../utils';
import { getShownIds } from '../utils/sessionTracker';
import type { MosaicTile } from '../types';

const MOSAIC_DISPLAY_COUNT = 10;

export function useMosaicTiles() {
  const mountId = useRef(Symbol());
  const pickedRef = useRef<MosaicTile[] | null>(null);

  const query = useQuery({
    queryKey: ['mosaic-tiles'],
    queryFn: fetchMosaicTiles,
  });

  const data = useMemo(() => {
    if (!query.data?.length) return query.data;

    if (!pickedRef.current) {
      pickedRef.current = pickFresh(query.data, MOSAIC_DISPLAY_COUNT, getShownIds('mosaic'));
    }
    return pickedRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, mountId.current]);

  return { ...query, data };
}
