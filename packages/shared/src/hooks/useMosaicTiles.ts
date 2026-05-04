/**
 * @module useMosaicTiles
 * Fetches mosaic tile data from the API and selects a fresh subset of 10 tiles
 * that the user has not recently seen, using a session-level "shown IDs" tracker.
 * The selected subset is stable for the lifetime of the component mount.
 * Used by the web HomePage mosaic grid and the mobile HomeTab.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMosaicTiles } from '../services/api';
import { pickFresh } from '../utils';
import { getShownIds } from '../utils/sessionTracker';
import type { MosaicTile } from '../types';

/** Number of mosaic tiles to display at one time. */
const MOSAIC_DISPLAY_COUNT = 10;

/**
 * Fetches mosaic tiles and returns a session-fresh selection of up to
 * {@link MOSAIC_DISPLAY_COUNT} tiles that the user has not recently viewed.
 *
 * The selection is computed once per mount (guarded by `pickedRef`) so it
 * remains stable across re-renders. A `Symbol` stored in `mountId` is included
 * in the `useMemo` dependency array to force recomputation on remount.
 *
 * @returns React Query result with `data: MosaicTile[]`, `isLoading`, and `error`.
 *   `data` is a freshly-picked subset rather than the full API response.
 * @example
 * ```tsx
 * const { data: tiles, isLoading } = useMosaicTiles();
 * if (isLoading) return <MosaicSkeleton />;
 * return tiles?.map(t => <MosaicTile key={t.id} tile={t} />);
 * ```
 */
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
