import { useState, useCallback } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Gray, type PlaceItem } from '@travyl/shared';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WEB_API = process.env.EXPO_PUBLIC_WEB_API_URL || 'http://localhost:3000';
const CARD_W = SCREEN_WIDTH * 0.75;
const CARD_H = CARD_W * 1.4;

const INSPIRE_CITIES = [
  { lat: '48.8566', lng: '2.3522' },
  { lat: '35.6762', lng: '139.6503' },
  { lat: '41.9028', lng: '12.4964' },
  { lat: '-33.8688', lng: '151.2093' },
];

async function fetchInspiredPlaces(): Promise<PlaceItem[]> {
  const results = await Promise.all(
    INSPIRE_CITIES.map(async (city) => {
      try {
        const res = await fetch(`${WEB_API}/api/places?lat=${city.lat}&lng=${city.lng}&category=sightseeing&limit=3`);
        if (!res.ok) return [];
        return res.json() as Promise<PlaceItem[]>;
      } catch { return []; }
    })
  );
  const seen = new Set<string>();
  return results.flat().filter((p) => {
    if (!p.name || !p.image || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export function GetInspired() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const { data: places = [] } = useQuery({
    queryKey: ['mobile-inspired'],
    queryFn: fetchInspiredPlaces,
    staleTime: 10 * 60 * 1000,
  });

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
        places={places}
        favorites={favorites}
        onToggleFav={toggleFavorite}
        cardWidth={CARD_W}
        cardHeight={CARD_H}
        navColor={Gray[500]}
      />
    </View>
  );
}
