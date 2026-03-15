import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import type { PlaceItem } from '@travyl/shared';

const FLIP_SPRING = { damping: 18, stiffness: 180, mass: 0.6 };

interface MagazineCurtainProps {
  place: PlaceItem;
  totalCount: number;
  placeIndex: number;
  isFav: boolean;
  onToggleFav: () => void;
  width: number;
  height: number;
}

export function MagazineCurtain({
  place,
  totalCount,
  placeIndex,
  isFav,
  onToggleFav,
  width,
  height,
}: MagazineCurtainProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const images = place.images?.length ? place.images : [place.image];

  // Reset on place change
  useEffect(() => {
    setImgIdx(0);
    setIsFlipped(false);
  }, [place.id]);

  // Auto-cycle images every 4s when not flipped
  useEffect(() => {
    if (isFlipped || images.length <= 1) return;
    const interval = setInterval(() => setImgIdx((i) => (i + 1) % images.length), 4000);
    return () => clearInterval(interval);
  }, [isFlipped, images.length, place.id]);

  // Flip animation
  const flipRotation = useSharedValue(0);
  const isPastHalf = useDerivedValue(() => flipRotation.value > 90);

  // Reset flip rotation when place changes
  useEffect(() => {
    flipRotation.value = withTiming(0, { duration: 0 });
  }, [place.id]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipRotation.value, [0, 180], [0, 180])}deg` }],
    opacity: isPastHalf.value ? 0 : 1,
    zIndex: isPastHalf.value ? 0 : 1,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipRotation.value, [0, 180], [180, 360])}deg` }],
    opacity: isPastHalf.value ? 1 : 0,
    zIndex: isPastHalf.value ? 1 : 0,
  }));

  const toggleFlip = useCallback(() => {
    const next = !isFlipped;
    setIsFlipped(next);
    flipRotation.value = withSpring(next ? 180 : 0, FLIP_SPRING);
  }, [isFlipped]);

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={{
        width, height, borderRadius: 20, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
      }}
    >
      {/* ── Front — magazine editorial ── */}
      <Animated.View style={[{ position: 'absolute', width, height }, frontStyle]}>
        <Pressable onPress={toggleFlip} style={{ flex: 1 }}>
          {/* Background image */}
          <Image
            source={images[imgIdx]}
            style={{ position: 'absolute', width, height }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />

          {/* Gradient overlays */}
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.7)']}
            locations={[0, 0.35, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Image nav tap zones */}
          {images.length > 1 && (
            <>
              <Pressable
                onPress={() => setImgIdx((i) => (i === 0 ? images.length - 1 : i - 1))}
                style={{ position: 'absolute', left: 0, top: 0, width: '33%', height: '60%', zIndex: 15 }}
              />
              <Pressable
                onPress={() => setImgIdx((i) => (i + 1) % images.length)}
                style={{ position: 'absolute', right: 0, top: 0, width: '33%', height: '60%', zIndex: 15 }}
              />
            </>
          )}

          {/* Counter — top right */}
          <View style={{ position: 'absolute', top: 14, right: 14, zIndex: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
              {String(placeIndex + 1).padStart(2, '0')}
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginHorizontal: 5 }}>/</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {String(totalCount).padStart(2, '0')}
            </Text>
          </View>

          {/* Flip hint — top left */}
          <View style={{ position: 'absolute', top: 14, left: 14, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <FontAwesome name="repeat" size={10} color="rgba(255,255,255,0.4)" />
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Tap to flip</Text>
          </View>

          {/* Favorite button */}
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onToggleFav(); }}
            style={{
              position: 'absolute', top: 14, right: 56, zIndex: 20,
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: isFav ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.9)',
              borderWidth: isFav ? 1 : 0, borderColor: 'rgba(239,68,68,0.5)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={14} color={isFav ? '#ef4444' : '#9ca3af'} />
          </Pressable>

          {/* Editorial content — bottom */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }} pointerEvents="box-none">
            {/* Type */}
            <Text style={{
              fontSize: 9, fontWeight: '700', color: '#7dd3fc',
              textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6,
            }}>
              {place.type}
            </Text>

            {/* Large name */}
            <Text style={{
              fontSize: 34, fontWeight: '800', color: '#fff',
              lineHeight: 34, letterSpacing: -1.5, marginBottom: 4,
            }} numberOfLines={2}>
              {place.name}
            </Text>

            {/* Tagline */}
            {place.tagline && (
              <Text style={{
                fontSize: 11, color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase', letterSpacing: 3, marginBottom: 8,
              }} numberOfLines={1}>
                {place.tagline}
              </Text>
            )}

            {/* Description — italic editorial */}
            {place.description && (
              <Text style={{
                fontSize: 14, color: 'rgba(255,255,255,0.8)',
                fontStyle: 'italic', lineHeight: 20, marginBottom: 12,
              }} numberOfLines={2}>
                {place.description}
              </Text>
            )}

            {/* Tags with numbering */}
            {place.tags && place.tags.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 20, marginBottom: 12 }}>
                {place.tags.slice(0, 3).map((tag, i) => (
                  <View key={tag}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#d4af37', marginBottom: 2 }}>
                      0{i + 1}
                    </Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 16 }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 24 }}>
              {place.bestTimeToVisit && (
                <View>
                  <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Best Time</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{place.bestTimeToVisit}</Text>
                </View>
              )}
              {place.rating != null && (
                <View>
                  <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Rating</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <FontAwesome name="star" size={10} color="#facc15" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{place.rating.toFixed(1)}</Text>
                  </View>
                </View>
              )}
              {place.priceLevel && (
                <View>
                  <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Price</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>
                    {'$'.repeat(place.priceLevel)}
                    <Text style={{ color: 'rgba(255,255,255,0.3)' }}>{'$'.repeat(4 - place.priceLevel)}</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Image dots */}
            {images.length > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }} pointerEvents="auto">
                {images.slice(0, 6).map((_, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setImgIdx(i)}
                    style={{
                      width: i === imgIdx ? 18 : 5, height: 5, borderRadius: 3,
                      backgroundColor: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>

      {/* ── Back — detailed info ── */}
      <Animated.View style={[{ position: 'absolute', width, height, backgroundColor: '#1e3a5f', borderRadius: 20 }, backStyle]}>
        <Pressable onPress={toggleFlip} style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 4 }}>
            {place.type}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 }}>
            {place.name}
          </Text>
          {place.tagline && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
              <FontAwesome name="map-marker" size={11} color="rgba(255,255,255,0.5)" />
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{place.tagline}</Text>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12 }} />

          {/* Stats grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {place.rating != null && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, width: '47%' }}>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>Rating</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FontAwesome name="star" size={11} color="#facc15" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{place.rating.toFixed(1)}</Text>
                  {place.reviewCount != null && (
                    <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>({place.reviewCount.toLocaleString()})</Text>
                  )}
                </View>
              </View>
            )}
            {place.priceLevel && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, width: '47%' }}>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>Price</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
                  {'$'.repeat(place.priceLevel)}
                  <Text style={{ color: 'rgba(255,255,255,0.3)' }}>{'$'.repeat(4 - place.priceLevel)}</Text>
                </Text>
              </View>
            )}
            {place.duration && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, width: '47%' }}>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>Duration</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{place.duration}</Text>
              </View>
            )}
            {place.bestTimeToVisit && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, width: '47%' }}>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 3 }}>Best Time</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff', lineHeight: 15 }}>{place.bestTimeToVisit}</Text>
              </View>
            )}
          </View>

          {place.hours && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <FontAwesome name="clock-o" size={11} color="rgba(255,255,255,0.5)" />
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>{place.hours}</Text>
            </View>
          )}

          {place.description && (
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19, marginBottom: 8 }} numberOfLines={3}>
              {place.description}
            </Text>
          )}

          {place.tips && place.tips.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <FontAwesome name="lightbulb-o" size={11} color="rgba(255,255,255,0.5)" />
                <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}>Tips</Text>
              </View>
              {place.tips.map((tip, i) => (
                <Text key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 16, paddingLeft: 12, marginBottom: 4 }}>
                  {'\u2022'} {tip}
                </Text>
              ))}
            </View>
          )}

          <View style={{ alignItems: 'center', marginTop: 'auto', paddingBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <FontAwesome name="repeat" size={10} color="rgba(255,255,255,0.4)" />
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Tap to flip back</Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
