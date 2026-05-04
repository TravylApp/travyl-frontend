import { useState, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import { Gray } from '@travyl/shared';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
import { useAddToTrip } from '@/hooks/useAddToTrip';

import { SectionHeader } from './SectionHeader';
import { usePlacesBatch } from '@/hooks/usePlacesBatch';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH * 0.75;
const CARD_H = CARD_W * 1.4;
const PREFETCH_THRESHOLD = 3;

export function GetInspired() {
  const { places, fetchBatch } = usePlacesBatch({ batchOffset: 5, limit: 6 });
  const { addToTrip, state: tripSheetState, selectTrip, selectDay, dismiss, createTrip } = useAddToTrip();
  const [favorites, setFavorites] = useState<string[]>([]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, []);

  const handleIndexChange = useCallback((idx: number) => {
    if (idx >= places.length - PREFETCH_THRESHOLD) {
      fetchBatch();
    }
  }, [places.length, fetchBatch]);

  return (
    <View style={{ paddingVertical: 40 }}>
      <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
        <SectionHeader eyebrow="Inspiration" title="Get Inspired" />
      </View>

      <CardStackCarousel
        places={places}
        favorites={favorites}
        onToggleFav={toggleFavorite}
        onAddToTrip={addToTrip}
        tripSheet={{ state: tripSheetState, selectTrip, selectDay, dismiss, createTrip }}
        onIndexChange={handleIndexChange}
        cardWidth={CARD_W}
        cardHeight={CARD_H}
        navColor={Gray[500]}
      />
    </View>
  );
}
