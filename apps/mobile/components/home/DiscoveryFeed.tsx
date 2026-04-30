import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, NativeSyntheticEvent, NativeScrollEvent, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TextStyles, Brand, type PlaceItem } from '@travyl/shared';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
import { SectionHeader } from './SectionHeader';
import { usePlacesBatch } from '@/hooks/usePlacesBatch';
import { useAddToTrip } from '@/hooks/useAddToTrip';
import { AddToTripSheet } from '@/components/AddToTripSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH;
const CARD_H = 300;
const ACCENT = Brand.gold;
const PREFETCH_THRESHOLD = 3;

export function DiscoveryFeed() {
  const { places, fetchBatch } = usePlacesBatch({ batchOffset: 0, limit: 10 });
  const [showcaseIdx, setShowcaseIdx] = useState(-1);
  const [favorites, setFavorites] = useState<string[]>([]);
  const { addToTrip, state: tripSheetState, selectTrip, selectDay, dismiss, createTrip } = useAddToTrip();

  const toggleFav = useCallback((id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  }, []);

  return (
    <View style={{ paddingTop: 24 }}>
      <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>
        <SectionHeader eyebrow="Discover" title="Explore the World" />
      </View>

      {places.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          contentContainerStyle={{ paddingHorizontal: 0 }}
          decelerationRate="fast"
          onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const cardIdx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
            if (cardIdx >= places.length - PREFETCH_THRESHOLD) {
              fetchBatch();
            }
          }}
        >
          {places.map((place, idx) => (
            <View key={place.id} style={{ width: CARD_W, paddingHorizontal: 16 }}>
              <Pressable
                onPress={() => setShowcaseIdx(idx)}
                style={{ width: CARD_W - 32, height: CARD_H, borderRadius: 14, overflow: 'hidden' }}
              >
                <Image
                  source={{ uri: place.image, headers: { Referer: '' } }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)']}
                  locations={[0, 0.4, 1]}
                  pointerEvents="none"
                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                />
                <Pressable
                  onPress={(e) => { e.stopPropagation(); addToTrip(place); }}
                  hitSlop={8}
                  style={{
                    position: 'absolute', top: 10, right: 10, width: 34, height: 34,
                    borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.4)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <FontAwesome name="plus" size={14} color="#fff" />
                </Pressable>
                <View style={{
                  position: 'absolute', top: 10, left: 10,
                  backgroundColor: 'rgba(200,169,106,0.15)', borderWidth: 1,
                  borderColor: 'rgba(200,169,106,0.2)', borderRadius: 12,
                  paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Text style={{
                    ...TextStyles.xs, fontWeight: '700', letterSpacing: 0.5,
                    textTransform: 'uppercase', color: ACCENT,
                  }}>{place.category}</Text>
                </View>
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14 }}>
                  <Text style={{
                    ...TextStyles.title, fontSize: 17, color: '#fff', marginBottom: 4,
                  }} numberOfLines={1}>{place.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {place.rating > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <FontAwesome name="star" size={11} color={ACCENT} />
                        <Text style={{ ...TextStyles.bodyEm, color: 'rgba(255,255,255,0.9)' }}>{place.rating}</Text>
                      </View>
                    )}
                    {place.tagline ? (
                      <Text style={{ ...TextStyles.body, color: 'rgba(255,255,255,0.65)', flex: 1 }} numberOfLines={1}>{place.tagline}</Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {showcaseIdx >= 0 && places[showcaseIdx] && (
        <CardStackCarousel
          places={places}
          initialIndex={showcaseIdx}
          favorites={favorites}
          onToggleFav={toggleFav}
          onAddToTrip={addToTrip}
          tripSheet={{ state: tripSheetState, selectTrip, selectDay, dismiss, createTrip }}
          overlay
          onClose={() => setShowcaseIdx(-1)}
        />
      )}
    </View>
  );
}
