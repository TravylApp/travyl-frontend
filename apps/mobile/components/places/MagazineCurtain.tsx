import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, TouchableWithoutFeedback, ActivityIndicator, Linking, ScrollView } from 'react-native';
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
import { Navy, TextStyles, getWebApiBase } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
import { useQuery } from '@tanstack/react-query';

const FLIP_SPRING = { damping: 18, stiffness: 180, mass: 0.6 };

interface MagazineCurtainProps {
  place: PlaceItem;
  isFav: boolean;
  onToggleFav: () => void;
  onMapPress?: () => void;
  onClose?: () => void;
  onAddToTrip?: (place: PlaceItem) => void;
  width: number;
  height: number;
}

export function MagazineCurtain({
  place,
  isFav,
  onToggleFav,
  onMapPress,
  onClose,
  onAddToTrip,
  width,
  height,
}: MagazineCurtainProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);
  const images = place.images?.length ? place.images : [place.image];

  useEffect(() => {
    setImgIdx((prev) => prev === 0 ? prev : 0);
    setIsFlipped((prev) => prev === false ? prev : false);
    setImgError(false);
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

  // Enriched data — fetch from SerpAPI when flipped (by name, works for any source)
  const searchQuery = place.address ? `${place.name} ${place.address}` : place.name;
  const { data: detail, isLoading: enriching } = useQuery({
    queryKey: ['place-detail', place.id],
    queryFn: async () => {
      const base = getWebApiBase();
      const res = await fetch(`${base}/api/search/place-detail?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: isFlipped,
  });

  const toggleFlip = useCallback(() => {
    const next = !isFlipped;
    setIsFlipped(next);
    flipRotation.value = withSpring(next ? 180 : 0, FLIP_SPRING);
  }, [isFlipped]);

  // Merge enriched data with place — detail takes priority
  const p = detail ? {
    ...place,
    description: detail.description || place.description,
    address: detail.address || place.address,
    phone: detail.phone || place.phone,
    website: detail.website || place.website,
    hours: detail.hours || place.hours,
    rating: detail.rating || place.rating,
    reviewCount: detail.reviewCount || place.reviewCount,
    priceLevel: detail.priceLevel || place.priceLevel,
  } : place;

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
        <TouchableWithoutFeedback onPress={toggleFlip}>
        <View style={{ flex: 1 }}>
          {/* Background image */}
          {imgError ? (
            <View style={{ position: 'absolute', width, height, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name="image" size={48} color="rgba(255,255,255,0.15)" />
            </View>
          ) : (
            <Image
              source={images[imgIdx]}
              style={{ position: 'absolute', width, height }}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => setImgError(true)}
            />
          )}

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
          <View style={{ position: 'absolute', top: 14, left: 14, zIndex: 50 }}>
            {onClose ? (
              <Pressable
                hitSlop={16}
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
                <Text style={{ ...TextStyles.xs, color: 'rgba(255,255,255,0.4)' }}>Tap to flip</Text>
              </View>
            )}
          </View>

          {/* Top-right buttons: map, add to trip, heart */}
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
            {onAddToTrip && (
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); onAddToTrip(place); }}
                style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FontAwesome name="plus" size={14} color="#1e3a5f" />
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
              ...TextStyles.xs, color: '#7dd3fc',
              textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6,
            }}>
              {place.type}
            </Text>

            {/* Name + rating inline */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{
                ...TextStyles.display, color: '#fff',
                lineHeight: 32, letterSpacing: -1.5, flex: 1,
              }} numberOfLines={2}>
                {place.name}
              </Text>
              {place.rating != null && place.rating > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <FontAwesome name="star" size={12} color="#facc15" />
                  <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>{place.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {/* Tagline */}
            {place.tagline && (
              <Text style={{
                ...TextStyles.caption, color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase', letterSpacing: 3, marginBottom: 8,
              }} numberOfLines={1}>
                {place.tagline}
              </Text>
            )}

            {/* Description — italic editorial */}
            {place.description && (
              <Text style={{
                ...TextStyles.bodyXl, color: 'rgba(255,255,255,0.8)',
                fontStyle: 'italic', marginBottom: 12,
              }} numberOfLines={2}>
                {place.description}
              </Text>
            )}

            {/* Tags with numbering */}
            {place.tags && place.tags.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 20, marginBottom: 12 }}>
                {place.tags.slice(0, 3).map((tag, i) => (
                  <View key={tag}>
                    <Text style={{ ...TextStyles.smEm, color: '#d4af37', marginBottom: 2 }}>
                      0{i + 1}
                    </Text>
                    <Text style={{ ...TextStyles.body, color: 'rgba(255,255,255,0.8)' }}>
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
                  <Text style={{ ...TextStyles.micro, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Best Time</Text>
                  <Text style={{ ...TextStyles.bodyEm, color: '#fff' }}>{place.bestTimeToVisit}</Text>
                </View>
              )}
              {/* Rating moved to inline with name */}
              {place.priceLevel != null && place.priceLevel >= 1 && place.priceLevel <= 4 && (
                <View>
                  <Text style={{ ...TextStyles.micro, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Price</Text>
                  <Text style={{ ...TextStyles.bodyEm, color: '#fff' }}>
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
        </View>
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* ── Back — enriched detail view ── */}
      <Animated.View style={[{ position: 'absolute', width, height, backgroundColor: Navy.DEFAULT, borderRadius: 20 }, backStyle]}>
        {/* Flip-back button — always visible, not inside scroll */}
        <Pressable
          onPress={toggleFlip}
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 50,
            flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16,
            paddingHorizontal: 12, paddingVertical: 7,
          }}
        >
          <FontAwesome name="repeat" size={11} color="#7dd3fc" />
          <Text style={{ ...TextStyles.smEm, color: '#7dd3fc' }}>Flip</Text>
        </Pressable>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 16, flexGrow: 1 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {/* Header */}
          <Text style={{ ...TextStyles.xs, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 6 }}>
            {p.type}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, paddingRight: 70 }}>
            <Text style={{ ...TextStyles.title, color: '#fff', flex: 1 }} numberOfLines={2}>
              {p.name}
            </Text>
          </View>

          {/* Rating + reviews */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {(p.rating ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <FontAwesome name="star" size={12} color="#facc15" />
                <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>{(p.rating ?? 0).toFixed(1)}</Text>
              </View>
            )}
            {p.reviewCount != null && p.reviewCount > 0 && (
              <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.4)' }}>({p.reviewCount.toLocaleString()} reviews)</Text>
            )}
            {p.priceLevel != null && p.priceLevel >= 1 && p.priceLevel <= 4 && (
              <Text style={{ ...TextStyles.bodyLgEm, color: '#10b981' }}>{'$'.repeat(p.priceLevel)}</Text>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 10 }} />

          {/* Loading indicator while enriching */}
          {enriching && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ActivityIndicator size="small" color="#7dd3fc" />
              <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.5)' }}>Loading details...</Text>
            </View>
          )}

          {/* Info rows */}
          {p.address && (
            <Pressable
              onPress={() => p.address && Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(p.address)}`).catch(() => {})}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}
            >
              <FontAwesome name="map-marker" size={14} color="#7dd3fc" style={{ marginTop: 2 }} />
              <Text style={{ ...TextStyles.bodyLg, color: 'rgba(255,255,255,0.8)', flex: 1 }} numberOfLines={2}>{p.address}</Text>
            </Pressable>
          )}
          {p.hours && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FontAwesome name="clock-o" size={14} color="rgba(255,255,255,0.5)" />
              <Text style={{ ...TextStyles.bodyLg, color: '#fff' }}>{p.hours}</Text>
            </View>
          )}
          {p.phone && (
            <Pressable onPress={() => Linking.openURL(`tel:${p.phone}`).catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FontAwesome name="phone" size={14} color="#7dd3fc" />
              <Text style={{ ...TextStyles.bodyLg, color: '#7dd3fc' }}>{p.phone}</Text>
            </Pressable>
          )}
          {p.duration && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FontAwesome name="hourglass-half" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={{ ...TextStyles.bodyLg, color: '#fff' }}>Suggested duration: {p.duration}</Text>
            </View>
          )}
          {p.bestTimeToVisit && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FontAwesome name="sun-o" size={14} color="rgba(255,255,255,0.5)" />
              <Text style={{ ...TextStyles.bodyLg, color: '#fff' }}>Best time: {p.bestTimeToVisit}</Text>
            </View>
          )}

          {/* Description */}
          {p.description && (
            <Text style={{ ...TextStyles.bodyXl, color: 'rgba(255,255,255,0.75)', marginBottom: 12, lineHeight: 24 }}>
              {p.description}
            </Text>
          )}

          {/* Tagline as secondary description if different from description */}
          {p.tagline && p.tagline !== p.description?.split('.')[0] && !p.description && (
            <Text style={{ ...TextStyles.bodyLg, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginBottom: 12 }}>
              {p.tagline}
            </Text>
          )}

          {/* Category + Tags */}
          {p.tags && p.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {p.category && (
                <View style={{ backgroundColor: 'rgba(125,211,252,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                  <Text style={{ ...TextStyles.captionEm, color: '#7dd3fc' }}>{p.category}</Text>
                </View>
              )}
              {p.tags.filter(t => t !== p.category).slice(0, 4).map((tag: string) => (
                <View key={tag} style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                  <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.6)' }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Reviews */}
          {detail?.reviews?.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ ...TextStyles.smEm, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
                Reviews
              </Text>
              {detail.reviews.slice(0, 3).map((r: any, i: number) => (
                <View key={i} style={{ marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {Array.from({ length: 5 }, (_, j) => (
                        <FontAwesome key={j} name="star" size={10} color={j < r.rating ? '#facc15' : 'rgba(255,255,255,0.15)'} />
                      ))}
                    </View>
                    <Text style={{ ...TextStyles.captionEm, color: 'rgba(255,255,255,0.6)' }}>{r.author}</Text>
                    {r.date && <Text style={{ ...TextStyles.xs, color: 'rgba(255,255,255,0.3)' }}>· {r.date}</Text>}
                  </View>
                  <Text style={{ ...TextStyles.body, color: 'rgba(255,255,255,0.7)' }} numberOfLines={3}>{r.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Photos grid */}
          {detail?.photos?.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ ...TextStyles.smEm, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
                Photos
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -10 }} contentContainerStyle={{ paddingHorizontal: 10, gap: 6 }}>
                {detail.photos.slice(0, 8).map((url: string, i: number) => (
                  <Image key={i} source={{ uri: url }} style={{ width: 100, height: 80, borderRadius: 8 }} contentFit="cover" cachePolicy="memory-disk" />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Action buttons */}
          <View style={{ marginTop: 'auto', gap: 8, paddingTop: 10 }}>
            {/* Menu + Reservation links */}
            {(detail?.menuLink || detail?.reservationLink) && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {detail.menuLink && (
                  <Pressable
                    onPress={() => Linking.openURL(detail.menuLink).catch(() => {})}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      backgroundColor: 'rgba(212,175,55,0.12)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.25)',
                      borderRadius: 12, paddingVertical: 10,
                    }}
                  >
                    <FontAwesome name="cutlery" size={12} color="#d4af37" />
                    <Text style={{ ...TextStyles.bodyEm, color: '#d4af37' }}>Menu</Text>
                  </Pressable>
                )}
                {detail.reservationLink && (
                  <Pressable
                    onPress={() => Linking.openURL(detail.reservationLink).catch(() => {})}
                    style={{
                      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
                      borderRadius: 12, paddingVertical: 10,
                    }}
                  >
                    <FontAwesome name="calendar-check-o" size={12} color="#10b981" />
                    <Text style={{ ...TextStyles.bodyEm, color: '#10b981' }}>Reserve</Text>
                  </Pressable>
                )}
              </View>
            )}
            {p.website && (
              <Pressable
                onPress={() => Linking.openURL(p.website!).catch(() => {})}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: 'rgba(125,211,252,0.12)',
                  borderWidth: 1, borderColor: 'rgba(125,211,252,0.25)',
                  borderRadius: 12, paddingVertical: 12,
                }}
              >
                <FontAwesome name="globe" size={13} color="#7dd3fc" />
                <Text style={{ ...TextStyles.bodyLgEm, color: '#7dd3fc' }}>Visit Website</Text>
              </Pressable>
            )}
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onToggleFav(); }}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: isFav ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                borderWidth: 1, borderColor: isFav ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)',
                borderRadius: 12, paddingVertical: 12,
              }}
            >
              <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={13} color={isFav ? '#ef4444' : '#7dd3fc'} />
              <Text style={{ ...TextStyles.bodyLgEm, color: isFav ? '#ef4444' : '#7dd3fc' }}>
                {isFav ? 'Saved' : 'Save to Favorites'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}
