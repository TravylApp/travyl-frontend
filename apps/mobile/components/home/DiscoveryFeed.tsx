import { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { upscaleGoogleImage, TextStyles, FontFamily, type PlaceItem, useTrips } from '@travyl/shared';
import PlaceDetailModal from '@/components/places/PlaceDetailModal';

const WEB_API = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://www.gotravyl.com';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding + gap
const ACCENT = '#d4b57a';

// Diverse cities to pull from — rotates through as user scrolls
const CITIES = [
  { name: 'Paris', lat: '48.8566', lng: '2.3522' },
  { name: 'Tokyo', lat: '35.6762', lng: '139.6503' },
  { name: 'New York', lat: '40.7128', lng: '-74.0060' },
  { name: 'Barcelona', lat: '41.3874', lng: '2.1686' },
  { name: 'Bangkok', lat: '13.7563', lng: '100.5018' },
  { name: 'Rome', lat: '41.9028', lng: '12.4964' },
  { name: 'London', lat: '51.5074', lng: '-0.1278' },
  { name: 'Dubai', lat: '25.2048', lng: '55.2708' },
  { name: 'Sydney', lat: '-33.8688', lng: '151.2093' },
  { name: 'Bali', lat: '-8.4095', lng: '115.1889' },
  { name: 'Istanbul', lat: '41.0082', lng: '28.9784' },
  { name: 'Lisbon', lat: '38.7223', lng: '-9.1393' },
  { name: 'Mexico City', lat: '19.4326', lng: '-99.1332' },
  { name: 'Seoul', lat: '37.5665', lng: '126.9780' },
  { name: 'Cape Town', lat: '-33.9249', lng: '18.4241' },
  { name: 'Marrakech', lat: '31.6295', lng: '-7.9811' },
];

const CATEGORIES = ['sightseeing', 'restaurant', 'museum', 'landmark', 'cafe', 'nightlife', 'park'];

interface Props {
  onEndReachedThreshold?: number;
}

export function DiscoveryFeed({ onEndReachedThreshold }: Props) {
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const seenIds = useRef(new Set<string>());
  const seenNames = useRef(new Set<string>());
  const batchIndex = useRef(0);
  const hasMore = useRef(true);
  const router = useRouter();
  const { data: trips } = useTrips();

  const fetchBatch = useCallback(async () => {
    if (loading || !hasMore.current) return;
    setLoading(true);

    try {
      const cityIdx = batchIndex.current % CITIES.length;
      const catIdx = batchIndex.current % CATEGORIES.length;
      const city = CITIES[cityIdx];
      const cat = CATEGORIES[catIdx];
      // Also fetch a second category for variety
      const cat2 = CATEGORIES[(catIdx + 3) % CATEGORIES.length];

      const [res1, res2] = await Promise.all([
        fetch(`${WEB_API}/api/places?lat=${city.lat}&lng=${city.lng}&category=${cat}&limit=6`)
          .then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`${WEB_API}/api/places?lat=${city.lat}&lng=${city.lng}&category=${cat2}&limit=4`)
          .then(r => r.ok ? r.json() : []).catch(() => []),
      ]);

      const raw: PlaceItem[] = [...(res1 || []), ...(res2 || [])];
      const fresh = raw.filter(p => {
        if (!p.name || !p.image) return false;
        const normName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (seenIds.current.has(p.id) || seenNames.current.has(normName)) return false;
        seenIds.current.add(p.id);
        seenNames.current.add(normName);
        return true;
      }).map(p => ({
        ...p,
        image: upscaleGoogleImage(p.image) || p.image,
      }));

      if (fresh.length === 0 && batchIndex.current > CITIES.length * 2) {
        hasMore.current = false;
      }

      batchIndex.current++;
      setPlaces(prev => [...prev, ...fresh]);
    } catch {}
    setLoading(false);
  }, [loading]);

  // Initial load
  if (places.length === 0 && !loading) {
    fetchBatch();
  }

  const toggleFav = useCallback((id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, []);

  const handleAddToTrip = useCallback((place: PlaceItem) => {
    if (!trips?.length) {
      Alert.alert('No trips yet', 'Create a trip first to add places to it.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create Trip', onPress: () => router.push('/(tabs)/trips') },
      ]);
      return;
    }
    if (trips.length === 1) {
      router.push(`/trip/${trips[0].id}`);
      return;
    }
    // Multiple trips — let user pick
    Alert.alert('Add to Trip', `Add "${place.name}" to which trip?`,
      trips.slice(0, 5).map(t => ({
        text: t.destination || t.title || 'Trip',
        onPress: () => router.push(`/trip/${t.id}`),
      })).concat([{ text: 'Cancel', style: 'cancel' as const, onPress: () => {} }])
    );
  }, [trips, router]);

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
      {/* Header */}
      <View style={{ marginBottom: 16, paddingHorizontal: 4 }}>
        <Text style={{
          ...TextStyles.xs, fontWeight: '700', letterSpacing: 1.5,
          textTransform: 'uppercase', color: ACCENT, marginBottom: 4,
        }}>Discover</Text>
        <Text style={{
          fontFamily: FontFamily.serif, fontSize: 24, color: '#1a1a1a',
        }}>Explore the World</Text>
      </View>

      {/* Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {places.map((place) => (
          <Pressable
            key={place.id}
            onPress={() => setSelectedPlace(place)}
            style={{ width: CARD_W, height: CARD_W * 1.3, borderRadius: 14, overflow: 'hidden', marginBottom: 4 }}
          >
            <Image
              source={{ uri: place.image, headers: { Referer: '' } }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
            {/* Add to trip button */}
            <Pressable
              onPress={(e) => { e.stopPropagation(); handleAddToTrip(place); }}
              hitSlop={8}
              style={{
                position: 'absolute', top: 8, right: 8, width: 32, height: 32,
                borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FontAwesome name="plus" size={14} color="#fff" />
            </Pressable>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              locations={[0.45, 1]}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 }}
            >
              <Text style={{
                fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2,
              }} numberOfLines={1}>{place.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {place.rating > 0 && (
                  <>
                    <FontAwesome name="star" size={10} color={ACCENT} />
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{place.rating}</Text>
                  </>
                )}
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }} numberOfLines={1}>
                  {place.category}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        ))}
      </View>

      {/* Load more trigger */}
      {hasMore.current && (
        <Pressable
          onPress={fetchBatch}
          style={{
            paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 24,
            borderRadius: 12, borderWidth: 1,
            borderColor: 'rgba(212,181,122,0.3)', backgroundColor: 'rgba(212,181,122,0.08)',
          }}
        >
          {loading ? (
            <ActivityIndicator color={ACCENT} />
          ) : (
            <Text style={{ ...TextStyles.subhead, color: ACCENT, fontWeight: '700' }}>
              Load More
            </Text>
          )}
        </Pressable>
      )}

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          allPlaces={places}
          onClose={() => setSelectedPlace(null)}
          favorites={favorites}
          onToggleFav={toggleFav}
          onSearchTag={() => {}}
        />
      )}
    </View>
  );
}
