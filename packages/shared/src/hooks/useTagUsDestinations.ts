import { useMemo } from 'react';
import { useMosaicTiles } from './useMosaicTiles';
import { useInspirationCards } from './useInspirationCards';

const FALLBACK_DESTINATIONS = ['Santorini', 'Tokyo', 'Bali', 'Barcelona'];
const TAG_US_COUNT = 4;

/**
 * Returns destination labels for the TagUs section.
 * Pulls from already-randomized mosaic tiles and inspiration cards.
 * Falls back to hardcoded defaults while loading.
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
