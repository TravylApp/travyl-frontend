/**
 * @module useTagUsDestinations
 * Derives up to 4 destination labels for the home page TagUs / social-share section.
 * Pulls from already-fetched mosaic tiles (category 'destination') first, then fills
 * remaining slots from inspiration cards, and finally from a static fallback list.
 * Used exclusively by the web home page TagUs component.
 */

'use client';

import { useMemo } from 'react';
import { useMosaicTiles } from './useMosaicTiles';
import { useInspirationCards } from './useInspirationCards';

/** Static destination names used when mosaic/inspiration data is still loading. */
const FALLBACK_DESTINATIONS = ['Santorini', 'Tokyo', 'Bali', 'Barcelona'];
/** Number of destination labels to return for the TagUs section. */
const TAG_US_COUNT = 4;

/**
 * Returns destination labels for the TagUs section.
 * Pulls from already-randomized mosaic tiles and inspiration cards.
 * Falls back to hardcoded defaults while loading.
 * @returns Array of up to 4 unique destination name strings
 * @example
 * ```tsx
 * const destinations = useTagUsDestinations();
 * destinations.map(d => <TagUsChip key={d} label={d} />);
 * ```
 */
export function useTagUsDestinations(): string[] {
  const { data: tiles } = useMosaicTiles();
  const { data: cards } = useInspirationCards();

  return useMemo(() => {
    const destinations: string[] = [];

    // Prefer mosaic tiles with category 'destination'
    if (tiles) {
      for (const tile of tiles) {
        if (tile.category === 'destination' && !destinations.includes(tile.name)) {
          destinations.push(tile.name);
        }
        if (destinations.length >= TAG_US_COUNT) return destinations;
      }
    }

    // Fill remaining from inspiration cards
    if (cards) {
      for (const card of cards) {
        if (!destinations.includes(card.destination)) {
          destinations.push(card.destination);
        }
        if (destinations.length >= TAG_US_COUNT) return destinations;
      }
    }

    // Fill remaining from fallback
    for (const name of FALLBACK_DESTINATIONS) {
      if (!destinations.includes(name)) {
        destinations.push(name);
      }
      if (destinations.length >= TAG_US_COUNT) return destinations;
    }

    return destinations;
  }, [tiles, cards]);
}
