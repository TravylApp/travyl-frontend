import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking } from 'react-native';
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
import { usePlaceDetail, usePlaceEnrich, usePlaceMenu } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';

const FLIP_SPRING = { damping: 18, stiffness: 180, mass: 0.6 };

interface MagazineCurtainProps {
  place: PlaceItem;
  isFav: boolean;
  onToggleFav: () => void;
  onMapPress?: () => void;
  onClose?: () => void;
  width: number;
  height: number;
}

export function MagazineCurtain({
  place,
  isFav,
  onToggleFav,
  onMapPress,
  onClose,
  width,
  height,
}: MagazineCurtainProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const images = place.images?.length ? place.images : [place.image];

  useEffect(() => {
    setImgIdx((prev) => prev === 0 ? prev : 0);
    setIsFlipped((prev) => prev === false ? prev : false);
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

  // Enriched data via shared hooks — only fetch when flipped
  const { data: detailData, isLoading: enriching } = usePlaceDetail(isFlipped ? place.id : undefined);
  const { data: enrichPhotos } = usePlaceEnrich(isFlipped ? place.id : undefined, place.name);
  const { data: menuData } = usePlaceMenu(
    isFlipped && place.type === 'restaurant' ? place.name : undefined,
  );

  const toggleFlip = useCallback(() => {
    const next = !isFlipped;
    setIsFlipped(next);
    flipRotation.value = withSpring(next ? 180 : 0, FLIP_SPRING);
  }, [isFlipped]);

  // Merge enriched data with place — detail takes priority
  const p = detailData ? { ...place, ...detailData } : place;

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

          {/* Top left — close button or flip hint */}
          <View style={{ position: 'absolute', top: 14, left: 14, zIndex: 10 }}>
            {onClose ? (
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onClose(); }}
                style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FontAwesome name="times" size={14} color="#fff" />
              </Pressable>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="repeat" size={10} color="rgba(255,255,255,0.4)" />
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Tap to flip</Text>
              </View>
            )}
          </View>

          {/* Top-right buttons: map then heart */}
          <View style={{ position: 'absolute', top: 14, right: 14, zIndex: 20, flexDirection: 'row', gap: 8 }}>
            {onMapPress && (
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onMapPress(); }}
                style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FontAwesome name="map" size={14} color="#1e3a5f" />
              </Pressable>
            )}
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onToggleFav(); }}
              style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: isFav ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.9)',
                borderWidth: isFav ? 1 : 0, borderColor: 'rgba(239,68,68,0.5)',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={14} color={isFav ? '#ef4444' : '#9ca3af'} />
            </Pressable>
          </View>

          {/* Editorial content — bottom */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }} pointerEvents="box-none">
            {/* Type */}
            <Text style={{
              fontSize: 9, fontWeight: '700', color: '#7dd3fc',
              textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6,
            }}>
              {place.type}
            </Text>

            {/* Name + rating inline */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{
                fontSize: 30, fontWeight: '800', color: '#fff',
                lineHeight: 32, letterSpacing: -1.5, flex: 1,
              }} numberOfLines={2}>
                {place.name}
              </Text>
              {place.rating != null && place.rating > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <FontAwesome name="star" size={12} color="#facc15" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{place.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

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
              {/* Rating moved to inline with name */}
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

      {/* ── Back — enriched detail view ── */}
      <Animated.View style={[{ position: 'absolute', width, height, backgroundColor: '#1e3a5f', borderRadius: 20 }, backStyle]}>
        <Pressable onPress={toggleFlip} style={{ flex: 1, padding: 20 }}>
          {/* Header */}
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6 }}>
            {p.type}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', flex: 1 }} numberOfLines={2}>
              {p.name}
            </Text>
            {(p.rating ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <FontAwesome name="star" size={12} color="#facc15" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{(p.rating ?? 0).toFixed(1)}</Text>
              </View>
            )}
          </View>
          {p.reviewCount != null && p.reviewCount > 0 && (
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{p.reviewCount.toLocaleString()} reviews</Text>
          )}

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 10 }} />

          {/* Loading indicator while enriching */}
          {enriching && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ActivityIndicator size="small" color="#7dd3fc" />
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Loading details...</Text>
            </View>
          )}

          {/* Info rows — only show what we actually have */}
          {p.hours && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <FontAwesome name="clock-o" size={13} color="rgba(255,255,255,0.5)" />
              <Text style={{ fontSize: 13, color: '#fff', fontWeight: '500' }}>{p.hours}</Text>
            </View>
          )}
          {p.address && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <FontAwesome name="map-marker" size={13} color="rgba(255,255,255,0.5)" style={{ marginTop: 2 }} />
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18, flex: 1 }} numberOfLines={2}>{p.address}</Text>
            </View>
          )}
          {p.website && (
            <Pressable onPress={() => Linking.openURL(p.website!).catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <FontAwesome name="globe" size={13} color="#7dd3fc" />
              <Text style={{ fontSize: 13, color: '#7dd3fc' }} numberOfLines={1}>Visit website</Text>
            </Pressable>
          )}
          {p.phone && (
            <Pressable onPress={() => Linking.openURL(`tel:${p.phone}`).catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <FontAwesome name="phone" size={13} color="#7dd3fc" />
              <Text style={{ fontSize: 13, color: '#7dd3fc' }}>{p.phone}</Text>
            </Pressable>
          )}

          {/* Description */}
          {p.description && (
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 21, marginBottom: 10 }} numberOfLines={5}>
              {p.description}
            </Text>
          )}

          {/* Tags */}
          {p.tags && p.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {p.tags.slice(0, 5).map((tag: string) => (
                <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.6)' }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats — compact row */}
          {(p.priceLevel || p.duration) && (
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
              {p.priceLevel && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Price</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
                    {'$'.repeat(p.priceLevel)}<Text style={{ color: 'rgba(255,255,255,0.2)' }}>{'$'.repeat(4 - p.priceLevel)}</Text>
                  </Text>
                </View>
              )}
              {p.duration && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Duration</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{p.duration}</Text>
                </View>
              )}
            </View>
          )}

          {/* Bottom — Save + flip hint */}
          <View style={{ marginTop: 'auto', gap: 10 }}>
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onToggleFav(); }}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: isFav ? 'rgba(239,68,68,0.2)' : 'rgba(125,211,252,0.12)',
                borderWidth: 1, borderColor: isFav ? 'rgba(239,68,68,0.4)' : 'rgba(125,211,252,0.25)',
                borderRadius: 12, paddingVertical: 12,
              }}
            >
              <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={13} color={isFav ? '#ef4444' : '#7dd3fc'} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: isFav ? '#ef4444' : '#7dd3fc' }}>
                {isFav ? 'Saved' : 'Save to Favorites'}
              </Text>
            </Pressable>

            <View style={{ alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="repeat" size={10} color="rgba(255,255,255,0.3)" />
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Tap to flip back</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
