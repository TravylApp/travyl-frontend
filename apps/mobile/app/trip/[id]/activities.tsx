import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image, Modal, Dimensions, Animated, Linking, Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen,
  useActivityFilters,
  useSimilarPlaces,
  Navy,
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_ICONS,
  ACTIVITY_SUBFILTERS,
  ACTIVITY_SORT_OPTIONS,
} from '@travyl/shared';
import { TextStyles, FontSize, FontFamily } from '@travyl/shared';
import type { DiscoverItem, PlaceItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PageTransition, useTabAccent } from './_layout';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { RatingStars } from '@/components/ui/RatingStars';
import { MapPreview } from '@/components/itinerary/MapPreview';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
import { discoverItemToPlaceItem } from '@/utils/discoverToPlace';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_IMG_W = SCREEN_WIDTH - 32 - 2; // 16px padding each side, minus 2px border

// ---- Placeholder colors for cards without images ----
const PLACEHOLDER_COLORS = ['#e0f2fe', '#fef3c7', '#ede9fe', '#ecfdf5', '#fce7f3', '#fff7ed', '#f0fdfa'];
function placeholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}


// ---- Min Rating Filter ----
function MinRatingFilter({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('activities');
  const options: { label: string; value: number | null }[] = [
    { label: 'Any', value: null },
    { label: '3.5+', value: 3.5 },
    { label: '4.0+', value: 4.0 },
    { label: '4.5+', value: 4.5 },
  ];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <FontAwesome name="star" size={12} color="#fbbf24" />
      <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>Min rating:</Text>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <Pressable
            key={opt.label}
            onPress={() => onChange(opt.value)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 16,
              backgroundColor: isActive ? ACCENT : colors.borderLight,
            }}
          >
            <Text
              style={{
                ...(isActive ? TextStyles.bodyEm : TextStyles.body),
                color: isActive ? '#fff' : colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- Activity Card with expandable details ----
// Deterministic card height from ID (matches web PinCard)
function cardHeight(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return 220 + (Math.abs(hash) % 60);
}

function ActivityCard({
  item,
  isFavorited,
  onFavorite,
  onAddToItinerary,
}: {
  item: DiscoverItem;
  isFavorited: boolean;
  onFavorite: (id: string) => void;
  onAddToItinerary?: (id: string) => void;
}) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('activities');
  const [imgError, setImgError] = useState(false);
  const hasImage = item.images.length > 0 && !imgError;
  const height = cardHeight(item.id);
  const categoryLabel = item.category || 'Activity';

  return (
    <Pressable onPress={() => {}}>
      <View
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          height,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        {/* Full-bleed image */}
        {hasImage ? (
          <Image
            source={{ uri: item.images[0] }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: placeholderColor(item.id),
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name="image" size={32} color={colors.border} />
          </View>
        )}

        {/* Gradient overlay — bottom half */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.6,
            backgroundColor: 'transparent',
          }}
        >
          <View style={{ flex: 1, opacity: 0.7, backgroundColor: 'black' }} />
        </View>

        {/* Category badge — top left */}
        <View style={{
          position: 'absolute', top: 10, left: 10,
          backgroundColor: 'rgba(0,0,0,0.6)',
          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
        }}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {categoryLabel}
          </Text>
        </View>

        {/* Favorite heart — top right */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onFavorite(item.id);
          }}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: 'rgba(0,0,0,0.4)',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FontAwesome
            name={isFavorited ? 'heart' : 'heart-o'}
            size={14}
            color={isFavorited ? '#ef4444' : '#fff'}
          />
        </Pressable>

        {/* Bottom content overlay */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 }}>
          {/* Rating row */}
          {item.rating > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <FontAwesome name="star" size={11} color="#fbbf24" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{item.rating.toFixed(1)}</Text>
              {item.reviewCount != null && item.reviewCount > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10 }}>
                  ({item.reviewCount >= 1000 ? `${(item.reviewCount / 1000).toFixed(1)}k` : item.reviewCount})
                </Text>
              )}
            </View>
          )}

          {/* Name */}
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 2 }} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Description / tagline */}
          {item.description ? (
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 6 }} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}

          {/* Tags */}
          {item.tags.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
              {item.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '600' }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Booked badge — bottom of category badge area */}
        {item.isBooked && (
          <View style={{
            position: 'absolute', top: 10, left: 10,
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
            marginTop: 26,
          }}>
            <FontAwesome name="calendar-check-o" size={9} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>Day {item.bookedDay}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ---- Activity Detail Bottom Sheet ----
function ActivityDetailSheet({
  item,
  isFavorited,
  onFavorite,
  onClose,
  allItems,
  onSelectItem,
}: {
  item: DiscoverItem;
  isFavorited: boolean;
  onFavorite: (id: string) => void;
  onClose: () => void;
  allItems: DiscoverItem[];
  onSelectItem: (item: DiscoverItem) => void;
}) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('activities');
  const [imgError, setImgError] = useState(false);
  const hasImage = item.images.length > 0 && !imgError;

  // Animations: map from top, content from bottom
  const mapSlide = useRef(new Animated.Value(-160)).current;
  const contentSlide = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(mapSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.spring(contentSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(mapSlide, { toValue: -160, duration: 200, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 300, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  // Similar items: same category or overlapping tags, excluding current item
  const similarItems = useMemo(() => {
    const scored = allItems
      .filter(other => other.id !== item.id)
      .map(other => {
        let score = 0;
        if (other.category && other.category === item.category) score += 3;
        const overlap = other.tags.filter(t => item.tags.includes(t)).length;
        score += overlap;
        return { item: other, score };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map(s => s.item);
  }, [item.id, item.category, item.tags, allItems]);

  const hasLocation = item.lat != null && item.lng != null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', opacity: fadeAnim }}>
        <Pressable onPress={handleClose} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={(e) => e.stopPropagation?.()} style={{ maxHeight: '90%', backgroundColor: colors.cardBackground, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' }}>
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {/* Map — slides in from the top */}
              {hasLocation && (
                <Animated.View style={{ transform: [{ translateY: mapSlide }], overflow: 'hidden' }}>
                  <MapPreview
                    lat={item.lat!}
                    lng={item.lng!}
                    label={item.name}
                    height={160}
                    zoom={14}
                    borderless
                  />
                </Animated.View>
              )}

              {/* Content — slides in from the bottom */}
              <Animated.View style={{ transform: [{ translateY: contentSlide }] }}>
                {/* Image */}
                {hasImage ? (
                  <Image
                    source={{ uri: item.images[0] }}
                    style={{ width: '100%', height: 200 }}
                    resizeMode="cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <View style={{ width: '100%', height: 200, backgroundColor: placeholderColor(item.id), alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome name="image" size={32} color={colors.border} />
                  </View>
                )}

                <View style={{ padding: 16 }}>
                  {/* Name */}
                  <Text style={{ ...TextStyles.title, color: colors.text, marginBottom: 6 }}>{item.name}</Text>

                  {/* Category badge */}
                  {item.category && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: ACCENT + '15',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 12,
                        }}
                      >
                        <FontAwesome
                          name={(ACTIVITY_CATEGORY_ICONS[item.category] || 'compass') as any}
                          size={11}
                          color={ACCENT}
                        />
                        <Text style={{ ...TextStyles.body, color: ACCENT }}>{item.category}</Text>
                      </View>
                    </View>
                  )}

                  {/* Rating stars + reviews */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <RatingStars rating={item.rating} size={14} />
                    <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>{item.rating.toFixed(1)}</Text>
                    {item.reviewCount != null && (
                      <Text style={{ ...TextStyles.body, color: colors.textTertiary }}>({item.reviewCount.toLocaleString()} reviews)</Text>
                    )}
                  </View>

                  {/* Price row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {item.price && (
                      <Text style={{ ...TextStyles.bodyXlEm, color: colors.text }}>{item.price}</Text>
                    )}
                    {item.dealPrice && item.originalPrice && (
                      <>
                        <Text style={{ ...TextStyles.body, color: colors.textTertiary, textDecorationLine: 'line-through' }}>{item.originalPrice}</Text>
                        <Text style={{ ...TextStyles.bodyXlEm, color: '#ef4444' }}>{item.dealPrice}</Text>
                      </>
                    )}
                  </View>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {item.tags.map((tag, i) => (
                        <View
                          key={i}
                          style={{
                            backgroundColor: ACCENT + '12',
                            borderWidth: 1,
                            borderColor: ACCENT + '25',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 20,
                          }}
                        >
                          <Text style={{ ...TextStyles.caption, color: ACCENT }}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Description */}
                  <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, marginBottom: 14 }}>{item.description}</Text>

                  {/* Open / Closed status */}
                  {item.isOpen !== undefined && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: item.isOpen ? '#f0fdf4' : '#fef2f2',
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: item.isOpen ? '#bbf7d0' : '#fecaca',
                        marginBottom: 12,
                      }}
                    >
                      <FontAwesome
                        name={item.isOpen ? 'check-circle' : 'times-circle'}
                        size={13}
                        color={item.isOpen ? '#16a34a' : '#ef4444'}
                      />
                      <Text style={{ ...TextStyles.bodyLgEm, color: item.isOpen ? '#16a34a' : '#ef4444' }}>
                        {item.isOpen ? 'Open Now' : 'Currently Closed'}
                      </Text>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 8 }}>
                    <Pressable
                      onPress={() => onFavorite(item.id)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: isFavorited ? '#ef4444' : colors.border,
                        backgroundColor: isFavorited ? '#fef2f2' : colors.cardBackground,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FontAwesome
                        name={isFavorited ? 'heart' : 'heart-o'}
                        size={16}
                        color={isFavorited ? '#ef4444' : colors.border}
                      />
                    </Pressable>

                    <Pressable
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 12,
                        borderRadius: 10,
                        backgroundColor: ACCENT,
                      }}
                    >
                      <FontAwesome name="plus" size={12} color="#fff" />
                      <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Add to Itinerary</Text>
                    </Pressable>

                    <Pressable
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        paddingVertical: 12,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: '#10b981',
                        backgroundColor: colors.cardBackground,
                      }}
                    >
                      <FontAwesome name="external-link" size={12} color="#10b981" />
                      <Text style={{ ...TextStyles.bodyLgEm, color: '#10b981' }}>Book Now</Text>
                    </Pressable>
                  </View>

                  {/* ---- Explore Similar Items ---- */}
                  {similarItems.length > 0 && (
                    <View style={{ marginTop: 16, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <FontAwesome name="compass" size={14} color={ACCENT} />
                        <Text style={{ ...TextStyles.subhead, color: colors.text }}>Explore Similar</Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                      >
                        {similarItems.map((sim) => (
                          <Pressable
                            key={sim.id}
                            onPress={() => onSelectItem(sim)}
                            style={({ pressed }) => ({
                              width: 150,
                              borderRadius: 12,
                              overflow: 'hidden',
                              borderWidth: 1,
                              borderColor: colors.borderLight,
                              backgroundColor: colors.cardBackground,
                              opacity: pressed ? 0.85 : 1,
                              transform: [{ scale: pressed ? 0.97 : 1 }],
                            })}
                          >
                            {sim.images.length > 0 ? (
                              <Image
                                source={{ uri: sim.images[0] }}
                                style={{ width: 150, height: 90 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={{ width: 150, height: 90, backgroundColor: placeholderColor(sim.id), alignItems: 'center', justifyContent: 'center' }}>
                                <FontAwesome name="image" size={20} color={colors.border} />
                              </View>
                            )}
                            <View style={{ padding: 8 }}>
                              <Text numberOfLines={1} style={{ ...TextStyles.bodyEm, color: colors.text, marginBottom: 2 }}>{sim.name}</Text>
                              <Text numberOfLines={1} style={{ ...TextStyles.sm, color: colors.textTertiary }}>{sim.location}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                                <FontAwesome name="star" size={9} color="#f59e0b" />
                                <Text style={{ ...TextStyles.smEm, color: colors.text }}>{sim.rating.toFixed(1)}</Text>
                                {sim.category && (
                                  <Text style={{ ...TextStyles.xs, color: ACCENT, marginLeft: 4 }}>{sim.category}</Text>
                                )}
                              </View>
                            </View>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Close button */}
                  <Pressable
                    onPress={handleClose}
                    style={{
                      alignItems: 'center',
                      paddingVertical: 10,
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ ...TextStyles.bodyLg, color: colors.textTertiary }}>Close</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

// ---- Detail Footer (Explore + Actions) ----

function ActivityDetailFooter({
  place,
  allPlaces,
  onSelectPlace,
  favorites,
  onToggleFav,
}: {
  place: PlaceItem;
  allPlaces: PlaceItem[];
  onSelectPlace: (p: PlaceItem) => void;
  favorites: string[];
  onToggleFav: (id: string) => void;
}) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('activities');
  const similar = useSimilarPlaces(place, allPlaces, 10);
  const isFav = favorites.includes(place.id);

  const hasCoords = !!(place.latitude && place.longitude);
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
    : place.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.address)}`
    : undefined;

  const handleShare = useCallback(async () => {
    const text = `Check out ${place.name}!${place.website ? `\n${place.website}` : ''}`;
    try { await Share.share({ message: text }); } catch {}
  }, [place]);

  return (
    <View style={{ marginTop: 16 }}>
      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Pressable
          onPress={() => onToggleFav(place.id)}
          style={{
            width: 44, height: 44, borderRadius: 12,
            borderWidth: 1.5, borderColor: isFav ? '#ef4444' : colors.border,
            backgroundColor: isFav ? '#fef2f2' : colors.cardBackground,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={16} color={isFav ? '#ef4444' : colors.textTertiary} />
        </Pressable>

        {directionsUrl && (
          <Pressable
            onPress={() => Linking.openURL(directionsUrl)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingVertical: 12, borderRadius: 12,
              borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.cardBackground,
            }}
          >
            <FontAwesome name="location-arrow" size={13} color={colors.text} />
            <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>Directions</Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleShare}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, paddingVertical: 12, borderRadius: 12,
            borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.cardBackground,
          }}
        >
          <FontAwesome name="share-alt" size={13} color={colors.text} />
          <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>Share</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const url = `https://www.google.com/search?q=${encodeURIComponent(place.name + ' ' + (place.tagline || '') + ' book')}`;
            Linking.openURL(url);
          }}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, paddingVertical: 12, borderRadius: 12,
            backgroundColor: Navy.DEFAULT,
          }}
        >
          <FontAwesome name="external-link" size={12} color="#fff" />
          <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Book</Text>
        </Pressable>
      </View>

      {/* Explore Similar */}
      {similar.length > 0 && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FontAwesome name="compass" size={14} color={ACCENT} />
            <Text style={{ ...TextStyles.subhead, color: colors.text }}>Explore Similar</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 4 }}
          >
            {similar.map((sim) => (
              <Pressable
                key={sim.id}
                onPress={() => onSelectPlace(sim)}
                style={({ pressed }) => ({
                  width: 150, borderRadius: 12, overflow: 'hidden',
                  borderWidth: 1, borderColor: colors.borderLight,
                  backgroundColor: colors.cardBackground,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                {sim.images?.length ? (
                  <Image source={{ uri: sim.images[0] }} style={{ width: 150, height: 90 }} resizeMode="cover" />
                ) : sim.image ? (
                  <Image source={{ uri: sim.image }} style={{ width: 150, height: 90 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 150, height: 90, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
                    <FontAwesome name="image" size={20} color={colors.border} />
                  </View>
                )}
                <View style={{ padding: 8 }}>
                  <Text numberOfLines={1} style={{ ...TextStyles.bodyEm, color: colors.text, marginBottom: 2 }}>{sim.name}</Text>
                  <Text numberOfLines={1} style={{ ...TextStyles.sm, color: colors.textTertiary }}>{sim.tagline}</Text>
                  {sim.rating != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                      <FontAwesome name="star" size={9} color="#f59e0b" />
                      <Text style={{ ...TextStyles.smEm, color: colors.text }}>{sim.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ---- Skeleton ----

function SkeletonCard() {
  const colors = useThemeColors();
  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ height: 180, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome name="image" size={28} color={colors.border} />
      </View>
      <View style={{ padding: 14, gap: 8 }}>
        <SkeletonBlock width="40%" height={12} />
        <SkeletonBlock width="75%" height={16} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <SkeletonBlock width={80} height={12} />
          <SkeletonBlock width={60} height={12} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <SkeletonBlock width={60} height={22} radius={12} />
          <SkeletonBlock width={50} height={22} radius={12} />
          <SkeletonBlock width={70} height={22} radius={12} />
        </View>
      </View>
    </View>
  );
}

// ---- Main Screen ----
export default function ActivitiesScreen() {
  const ACCENT = useTabAccent('activities');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, days, isLoading } = useItineraryScreen(id);

  const {
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    categoryFilter, handleCategoryChange,
    activitySubFilter, setActivitySubFilter,
    sortBy, setSortBy,
    favorites, toggleFavorite,
    sourceItems,
    filteredItems,
    bookedItems,
    discoverItems,
    clearFilters,
  } = useActivityFilters(days, trip?.trip_context);

  const colors = useThemeColors();
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);

  const displayItems = useMemo(() => {
    if (minRating === null) return filteredItems;
    return filteredItems.filter(item => (item.rating ?? 0) >= minRating);
  }, [filteredItems, minRating]);

  const allPlacesFromSource = useMemo(
    () => sourceItems.map(discoverItemToPlaceItem),
    [sourceItems],
  );

  const activeFilterCount = [
    categoryFilter !== 'All',
    searchQuery !== '',
    activitySubFilter !== 'All' && activitySubFilter !== '',
    minRating !== null,
  ].filter(Boolean).length;

  // ---- Loading state ----
  if (isLoading) {
    return (
      <PageTransition>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
      >
        <SkeletonBlock width="100%" height={42} radius={12} />
        <SkeletonBlock width="100%" height={38} radius={12} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonBlock width={60} height={30} radius={20} />
          <SkeletonBlock width={70} height={30} radius={20} />
          <SkeletonBlock width={80} height={30} radius={20} />
        </View>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* -- Segmented Control: Booked / Discover -- */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: colors.borderLight,
        borderRadius: 12,
        padding: 3,
        marginBottom: 8,
      }}>
        <Pressable
          onPress={() => setViewMode('booked')}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, paddingVertical: 9, borderRadius: 10,
            backgroundColor: viewMode === 'booked' ? ACCENT : 'transparent',
          }}
        >
          <FontAwesome name="calendar-check-o" size={12} color={viewMode === 'booked' ? '#fff' : colors.textSecondary} />
          <Text style={{ ...TextStyles.bodyLgEm, color: viewMode === 'booked' ? '#fff' : colors.textSecondary }}>
            Booked ({bookedItems.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode('discover')}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, paddingVertical: 9, borderRadius: 10,
            backgroundColor: viewMode === 'discover' ? ACCENT : 'transparent',
          }}
        >
          <FontAwesome name="compass" size={12} color={viewMode === 'discover' ? '#fff' : colors.textSecondary} />
          <Text style={{ ...TextStyles.bodyLgEm, color: viewMode === 'discover' ? '#fff' : colors.textSecondary }}>
            Discover ({discoverItems.length})
          </Text>
        </Pressable>
      </View>

      {/* -- Search + Sort (same row) -- */}
      <View style={{ marginBottom: 8, position: 'relative' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.cardBackground,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 38,
          }}
        >
          <FontAwesome name="search" size={12} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search activities..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, ...TextStyles.bodyLg, color: colors.text, paddingVertical: 0 }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <FontAwesome name="times-circle" size={14} color={colors.textTertiary} />
            </Pressable>
          )}
          <View style={{ width: 1, height: 18, backgroundColor: colors.border, marginHorizontal: 8 }} />
          <Pressable
            onPress={() => setShowSortDropdown(!showSortDropdown)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
          >
            <FontAwesome name="sort-amount-desc" size={11} color={ACCENT} />
            <Text style={{ ...TextStyles.caption, color: ACCENT }}>
              {ACTIVITY_SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
            </Text>
            <FontAwesome name={showSortDropdown ? 'chevron-up' : 'chevron-down'} size={8} color={colors.textTertiary} />
            {activeFilterCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -8,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: ACCENT,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ ...TextStyles.xs, color: '#fff' }}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Sort dropdown (anchored below search bar) */}
        {showSortDropdown && (
          <View
            style={{
              position: 'absolute',
              top: 42,
              right: 0,
              backgroundColor: colors.cardBackground,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: 4,
              minWidth: 160,
              zIndex: 100,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {ACTIVITY_SORT_OPTIONS.map((opt) => {
              const isActive = sortBy === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => { setSortBy(opt.key); setShowSortDropdown(false); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: isActive ? ACCENT + '10' : 'transparent',
                  }}
                >
                  <Text style={{ ...(isActive ? TextStyles.bodyEm : TextStyles.body), color: isActive ? ACCENT : colors.textSecondary }}>
                    {opt.label}
                  </Text>
                  {isActive && <FontAwesome name="check" size={10} color={ACCENT} />}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* -- Category pills (compact, icon+label inline) -- */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 6 }}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      >
        {ACTIVITY_CATEGORIES.map((f) => {
          const count = sourceItems.filter((i) => f === 'All' || i.category === f).length;
          if (count === 0 && f !== 'All') return null;
          const isActive = categoryFilter === f;
          return (
            <Pressable
              key={f}
              onPress={() => handleCategoryChange(f)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isActive ? ACCENT : colors.border,
                backgroundColor: isActive ? ACCENT : colors.cardBackground,
              }}
            >
              <FontAwesome
                name={ACTIVITY_CATEGORY_ICONS[f] as any}
                size={11}
                color={isActive ? '#fff' : colors.textSecondary}
              />
              <Text
                style={{
                  ...(isActive ? TextStyles.bodyEm : TextStyles.body),
                  color: isActive ? '#fff' : colors.textSecondary,
                }}
              >
                {f}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* -- Subcategory pills -- */}
      {categoryFilter !== 'All' && ACTIVITY_SUBFILTERS[categoryFilter]?.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 6 }}
          contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
        >
          {ACTIVITY_SUBFILTERS[categoryFilter].map((sub) => {
            const isAll = sub.startsWith('All ');
            const isActive = isAll ? !activitySubFilter : activitySubFilter === sub;
            return (
              <Pressable
                key={sub}
                onPress={() => setActivitySubFilter(isAll ? '' : sub)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isActive ? ACCENT + '40' : colors.border,
                  backgroundColor: isActive ? ACCENT + '15' : colors.cardBackground,
                }}
              >
                <Text
                  style={{
                    ...(isActive ? TextStyles.captionEm : TextStyles.caption),
                    color: isActive ? ACCENT : colors.textSecondary,
                  }}
                >
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* -- Min Rating Filter -- */}
      <MinRatingFilter value={minRating} onChange={setMinRating} />

      {/* -- Results count -- */}
      <View style={{ paddingVertical: 6, paddingHorizontal: 2 }}>
        <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>
          {displayItems.length} {displayItems.length === 1 ? 'activity' : 'activities'} found
        </Text>
      </View>

        {/* ---- Activity Cards — 2-column masonry grid ---- */}
        {displayItems.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Left column */}
            <View style={{ flex: 1, gap: 10 }}>
              {displayItems.filter((_, i) => i % 2 === 0).map((item) => (
                <Pressable key={item.id} onPress={() => setSelectedItem(item)}>
                  <ActivityCard
                    item={item}
                    isFavorited={favorites.includes(item.id)}
                    onFavorite={toggleFavorite}
                  />
                </Pressable>
              ))}
            </View>
            {/* Right column */}
            <View style={{ flex: 1, gap: 10 }}>
              {displayItems.filter((_, i) => i % 2 === 1).map((item) => (
                <Pressable key={item.id} onPress={() => setSelectedItem(item)}>
                  <ActivityCard
                    item={item}
                    isFavorited={favorites.includes(item.id)}
                    onFavorite={toggleFavorite}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          /* ---- Empty / No Results State ---- */
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: ACCENT + '15',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <FontAwesome name="search" size={22} color={ACCENT} />
            </View>
            <Text style={{ ...TextStyles.subhead, color: colors.text, marginBottom: 6 }}>
              No results found
            </Text>
            <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              Try adjusting your search or filters to find activities.
            </Text>
            <Pressable
              onPress={clearFilters}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: ACCENT,
              }}
            >
              <FontAwesome name="refresh" size={12} color={ACCENT} />
              <Text style={{ ...TextStyles.bodyLgEm, color: ACCENT }}>Clear Filters</Text>
            </Pressable>
          </View>
        )}

      {/* ---- Activity Detail — magazine card overlay ---- */}
      {selectedItem && (
        <CardStackCarousel
          places={allPlacesFromSource}
          initialIndex={Math.max(0, sourceItems.findIndex((i) => i.id === selectedItem.id))}
          favorites={favorites}
          onToggleFav={toggleFavorite}
          overlay
          onClose={() => setSelectedItem(null)}
        />
      )}
    </ScrollView>
    </PageTransition>
  );
}
