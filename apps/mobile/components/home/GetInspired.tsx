import { useState, useCallback } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Gray, type PlaceItem } from '@travyl/shared';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WEB_API = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://www.gotravyl.com';
const CARD_W = SCREEN_WIDTH * 0.75;
const CARD_H = CARD_W * 1.4;

const ALL_INSPIRE_CITIES = [
  { lat: '48.8566', lng: '2.3522' },   // Paris
  { lat: '35.6762', lng: '139.6503' }, // Tokyo
  { lat: '41.9028', lng: '12.4964' },  // Rome
  { lat: '-33.8688', lng: '151.2093' }, // Sydney
  { lat: '41.3874', lng: '2.1686' },   // Barcelona
  { lat: '51.5074', lng: '-0.1278' },  // London
  { lat: '40.7128', lng: '-74.0060' }, // New York
  { lat: '25.2048', lng: '55.2708' },  // Dubai
  { lat: '-8.4095', lng: '115.1889' }, // Bali
  { lat: '37.9838', lng: '23.7275' },  // Athens
  { lat: '13.7563', lng: '100.5018' }, // Bangkok
  { lat: '37.7749', lng: '-122.4194' }, // San Francisco
  { lat: '31.6295', lng: '-7.9811' },  // Marrakech
  { lat: '1.3521', lng: '103.8198' },  // Singapore
];

const INSPIRE_CATEGORIES = ['sightseeing', 'restaurant', 'museum', 'park', 'landmark', 'cafe'];

// Session seed for variety on each app launch
const INSPIRE_SEED = Date.now();

async function fetchInspiredPlaces(): Promise<PlaceItem[]> {
  // Pick 4 random cities and 2 random categories
  const shuffled = [...ALL_INSPIRE_CITIES].sort(() => Math.sin(INSPIRE_SEED + Math.random()) - 0.5);
  const cities = shuffled.slice(0, 4);
  const cats = [...INSPIRE_CATEGORIES].sort(() => Math.random() - 0.5).slice(0, 2);

  const results = await Promise.all(
    cities.flatMap((city) =>
      cats.map(async (cat) => {
        try {
          const res = await fetch(`${WEB_API}/api/places?lat=${city.lat}&lng=${city.lng}&category=${cat}&limit=3`);
          if (!res.ok) return [];
          return res.json() as Promise<PlaceItem[]>;
        } catch { return []; }
      })
    )
  );
  const seen = new Set<string>();
  const seenNames = new Set<string>();
  return results.flat().filter((p) => {
    if (!p.name || !p.image || seen.has(p.id)) return false;
    const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenNames.has(norm)) return false;
    seen.add(p.id);
    seenNames.add(norm);
    return true;
  });
}

export function GetInspired() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const { data: places = [] } = useQuery({
    queryKey: ['mobile-inspired', INSPIRE_SEED],
    queryFn: fetchInspiredPlaces,
    staleTime: 5 * 60 * 1000,
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
