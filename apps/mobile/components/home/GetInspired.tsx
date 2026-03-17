import { useState, useCallback } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { MOCK_PLACES, Gray } from '@travyl/shared';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const INSPIRED_PLACES = MOCK_PLACES.slice(0, 8);
const CARD_W = SCREEN_WIDTH * 0.62;
const CARD_H = CARD_W * 1.35;

export function GetInspired() {
  const [favorites, setFavorites] = useState<string[]>([]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }, []);

  return (
    <View style={{ paddingVertical: 40 }}>
      {/* Title */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 24, color: Gray[900], marginBottom: 4 }}>
          <Text style={{ fontWeight: '800' }}>Get</Text>{' '}
          <Text style={{ fontStyle: 'italic' }}>Inspired</Text>
        </Text>
        <Text style={{ fontSize: 14, color: Gray[500], textAlign: 'center' }}>
          Explore popular destinations and start travyling.
        </Text>
      </View>

      <CardStackCarousel
        places={INSPIRED_PLACES}
        favorites={favorites}
        onToggleFav={toggleFavorite}
        cardWidth={CARD_W}
        cardHeight={CARD_H}
        navColor={Gray[500]}
      />
    </View>
  );
}
