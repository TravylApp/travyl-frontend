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
import type { DiscoverItem, PlaceItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PageTransition, useTabAccent } from './_layout';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { RatingStars } from '@/components/ui/RatingStars';
import { MapPreview } from '@/components/itinerary/MapPreview';
import PlaceDetailModal from '@/components/places/PlaceDetailModal';
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
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>Min rating:</Text>
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
                fontSize: 12,
                fontWeight: isActive ? '600' : '400',
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
  const [expanded, setExpanded] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const hasImage = item.images.length > 0 && !imgError;

  return (
    <Pressable onPress={() => setExpanded(!expanded)}>
      <View
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: item.isBooked ? 2 : 1,
          borderColor: item.isBooked ? ACCENT : colors.border,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        {/* Image Section with Carousel */}
        <View style={{ height: 180, position: 'relative' }}>
          {hasImage && item.images.length > 1 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_IMG_W);
                setImgIdx(idx);
              }}
              scrollEventThrottle={16}
              style={{ width: CARD_IMG_W, height: 180 }}
            >
              {item.images.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: CARD_IMG_W, height: 180 }}
                  resizeMode="cover"
                  onError={() => setImgError(true)}
                />
              ))}
            </ScrollView>
          ) : hasImage ? (
            <Image
              source={{ uri: item.images[0] }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: placeholderColor(item.id),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesome name="image" size={32} color={colors.border} />
            </View>
          )}

          {/* Gradient overlay */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
            }}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
          </View>

          {/* Rating badge */}
          <View
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(255,255,255,0.9)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <FontAwesome name="star" size={11} color="#fbbf24" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{item.rating.toFixed(1)}</Text>
            {item.reviewCount != null && (
              <Text style={{ fontSize: 10, color: colors.textTertiary }}>({item.reviewCount.toLocaleString()})</Text>
            )}
          </View>

          {/* Favorite heart */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onFavorite(item.id);
            }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: 'rgba(255,255,255,0.95)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <FontAwesome
              name={isFavorited ? 'heart' : 'heart-o'}
              size={15}
              color={isFavorited ? '#ef4444' : colors.border}
            />
          </Pressable>

          {/* Booked badge */}
          {item.isBooked && (
            <View
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#10b981',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
              }}
            >
              <FontAwesome name="calendar-check-o" size={11} color="#fff" />
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>
                Day {item.bookedDay}
              </Text>
            </View>
          )}

          {/* Price badge (non-booked) */}
          {item.price && !item.isBooked && (
            <View
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                backgroundColor: ACCENT,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>{item.price}</Text>
            </View>
          )}

          {/* Category badge */}
          {item.category && (
            <View
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: 'rgba(0,0,0,0.55)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <FontAwesome
                name={(ACTIVITY_CATEGORY_ICONS[item.category] || 'compass') as any}
                size={9}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
                {item.category}
              </Text>
            </View>
          )}

          {/* Deal badge */}
          {item.dealPrice && item.originalPrice && (
            <View
              style={{
                position: 'absolute',
                top: item.isBooked || item.price ? 44 : 10,
                left: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#ef4444',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <FontAwesome name="tag" size={9} color="#fff" />
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'line-through' }}>
                {item.originalPrice}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{item.dealPrice}</Text>
            </View>
          )}
        </View>

        {/* Dot indicators */}
        {hasImage && item.images.length > 1 && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8 }}>
            {item.images.map((_, i) => (
              <View key={i} style={{
                width: imgIdx === i ? 16 : 6, height: 6, borderRadius: 3,
                backgroundColor: imgIdx === i ? ACCENT : colors.border,
              }} />
            ))}
          </View>
        )}

        {/* Content Section */}
        <View style={{ padding: 14 }}>
          {/* Location + Distance */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <FontAwesome name="map-marker" size={11} color={colors.textTertiary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{item.location}</Text>
            </View>
            {item.distance && (
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginLeft: 8 }}>{item.distance}</Text>
            )}
          </View>

          {/* Title */}
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Stars + Reviews */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <RatingStars rating={item.rating} size={12} />
            {item.reviewCount != null && (
              <Text style={{ fontSize: 11, color: colors.textTertiary }}>{item.reviewCount.toLocaleString()} reviews</Text>
            )}
          </View>

          {/* Price + Open Status Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {item.price && (
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{item.price}</Text>
            )}
            {item.isOpen !== undefined && (
              <>
                {item.price && <Text style={{ fontSize: 11, color: colors.border }}>|</Text>}
                <Text style={{ fontSize: 11, fontWeight: '600', color: item.isOpen ? '#059669' : '#ef4444' }}>
                  {item.isOpen ? 'Open Now' : 'Closed'}
                </Text>
              </>
            )}
          </View>

          {/* Description */}
          <Text
            style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 }}
            numberOfLines={expanded ? undefined : 2}
          >
            {item.description}
          </Text>

          {/* Tags */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {item.tags.slice(0, expanded ? item.tags.length : 3).map((tag, i) => (
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
                <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '500' }}>{tag}</Text>
              </View>
            ))}
          </View>

          {/* Expandable details section */}
          {expanded && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.borderLight,
              }}
            >
              {item.bookedTime && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <FontAwesome name="clock-o" size={12} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.text }}>Scheduled: {item.bookedTime}</Text>
                </View>
              )}
              {item.distance && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <FontAwesome name="road" size={12} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.text }}>Distance: {item.distance}</Text>
                </View>
              )}
              {item.price && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <FontAwesome name="money" size={12} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.text }}>Price: {item.price}</Text>
                </View>
              )}
              {item.category && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FontAwesome name={(ACTIVITY_CATEGORY_ICONS[item.category] || 'compass') as any} size={12} color={colors.textSecondary} />
                  <Text style={{ fontSize: 12, color: colors.text }}>Category: {item.category}</Text>
                </View>
              )}
            </View>
          )}

          {/* Expand / Collapse hint */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <FontAwesome name={expanded ? 'chevron-up' : 'chevron-down'} size={10} color={colors.textTertiary} />
            <Text style={{ fontSize: 10, color: colors.textTertiary, marginLeft: 4 }}>
              {expanded ? 'Show less' : 'Show more'}
            </Text>
          </View>

          {/* Action Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12 }}>
            {item.isBooked ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: '#10b981',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <FontAwesome name="check" size={11} color="#fff" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Booked</Text>
              </View>
            ) : onAddToItinerary ? (
              <Pressable
                onPress={() => onAddToItinerary(item.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 1.5,
                  borderColor: ACCENT + '40',
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <FontAwesome name="plus" size={11} color={ACCENT} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>Add to Itinerary</Text>
              </Pressable>
            ) : null}

            <View style={{ flex: 1 }} />

            {item.bookingUrl && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: '#10b981',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                }}
              >
                <FontAwesome name="external-link" size={10} color="#fff" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                  {item.bookingLabel || 'Book Now'}
                </Text>
              </View>
            )}
          </View>
        </View>
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
  const categoryColor = ACCENT;

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
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 6 }}>{item.name}</Text>

                  {/* Category badge */}
                  {item.category && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: categoryColor + '15',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 12,
                        }}
                      >
                        <FontAwesome
                          name={(ACTIVITY_CATEGORY_ICONS[item.category] || 'compass') as any}
                          size={11}
                          color={categoryColor}
                        />
                        <Text style={{ fontSize: 12, fontWeight: '500', color: categoryColor }}>{item.category}</Text>
                      </View>
                    </View>
                  )}

                  {/* Rating stars + reviews */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <RatingStars rating={item.rating} size={14} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{item.rating.toFixed(1)}</Text>
                    {item.reviewCount != null && (
                      <Text style={{ fontSize: 12, color: colors.textTertiary }}>({item.reviewCount.toLocaleString()} reviews)</Text>
                    )}
                  </View>

                  {/* Price row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {item.price && (
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{item.price}</Text>
                    )}
                    {item.dealPrice && item.originalPrice && (
                      <>
                        <Text style={{ fontSize: 12, color: colors.textTertiary, textDecorationLine: 'line-through' }}>{item.originalPrice}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#ef4444' }}>{item.dealPrice}</Text>
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
                          <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '500' }}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Description */}
                  <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 14 }}>{item.description}</Text>

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
                      <Text style={{ fontSize: 13, fontWeight: '600', color: item.isOpen ? '#16a34a' : '#ef4444' }}>
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
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Add to Itinerary</Text>
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
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#10b981' }}>Book Now</Text>
                    </Pressable>
                  </View>

                  {/* ---- Explore Similar Items ---- */}
                  {similarItems.length > 0 && (
                    <View style={{ marginTop: 16, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <FontAwesome name="compass" size={14} color={ACCENT} />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Explore Similar</Text>
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
                              <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 2 }}>{sim.name}</Text>
                              <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textTertiary }}>{sim.location}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                                <FontAwesome name="star" size={9} color="#f59e0b" />
                                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text }}>{sim.rating.toFixed(1)}</Text>
                                {sim.category && (
                                  <Text style={{ fontSize: 9, color: ACCENT, marginLeft: 4 }}>{sim.category}</Text>
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
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textTertiary }}>Close</Text>
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
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Directions</Text>
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
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Share</Text>
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
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Book</Text>
        </Pressable>
      </View>

      {/* Explore Similar */}
      {similar.length > 0 && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FontAwesome name="compass" size={14} color={ACCENT} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Explore Similar</Text>
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
                  <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 2 }}>{sim.name}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textTertiary }}>{sim.tagline}</Text>
                  {sim.rating != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                      <FontAwesome name="star" size={9} color="#f59e0b" />
                      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.text }}>{sim.rating.toFixed(1)}</Text>
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
  const { days, isLoading } = useItineraryScreen(id);

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
  } = useActivityFilters(days);

  const colors = useThemeColors();
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);

  const displayItems = useMemo(() => {
    if (minRating === null) return filteredItems;
    return filteredItems.filter(item => (item.rating ?? 0) >= minRating);
  }, [filteredItems, minRating]);

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
          <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'booked' ? '#fff' : colors.textSecondary }}>
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
          <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'discover' ? '#fff' : colors.textSecondary }}>
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
            style={{ flex: 1, fontSize: 13, color: colors.text, paddingVertical: 0 }}
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
            <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '500' }}>
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
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{activeFilterCount}</Text>
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
                  <Text style={{ fontSize: 12, fontWeight: isActive ? '600' : '400', color: isActive ? ACCENT : colors.textSecondary }}>
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
                  fontSize: 12,
                  fontWeight: isActive ? '600' : '400',
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
                    fontSize: 11,
                    fontWeight: isActive ? '600' : '400',
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
        <Text style={{ fontSize: 11, color: colors.textTertiary }}>
          {displayItems.length} {displayItems.length === 1 ? 'activity' : 'activities'} found
        </Text>
      </View>

        {/* ---- Activity Cards ---- */}
        {displayItems.length > 0 ? (
          <View style={{ gap: 14 }}>
            {displayItems.map((item) => (
              <View key={item.id}>
                <ActivityCard
                  item={item}
                  isFavorited={favorites.includes(item.id)}
                  onFavorite={toggleFavorite}
                  onAddToItinerary={!item.isBooked ? () => {} : undefined}
                />
                <Pressable
                  onPress={() => setSelectedItem(item)}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 8,
                    marginTop: -4,
                    backgroundColor: colors.cardBackground,
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                    borderWidth: 1,
                    borderTopWidth: 0,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>View Details</Text>
                </Pressable>
              </View>
            ))}
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
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
              No results found
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
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
              <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT }}>Clear Filters</Text>
            </Pressable>
          </View>
        )}

      {/* ---- Activity Detail Modal (map + card) ---- */}
      {selectedItem && (
        <PlaceDetailModal
          place={discoverItemToPlaceItem(selectedItem)}
          allPlaces={sourceItems.map(discoverItemToPlaceItem)}
          onClose={() => setSelectedItem(null)}
          favorites={favorites}
          onToggleFav={toggleFavorite}
          renderFooter={(currentPlace) => (
            <ActivityDetailFooter
              place={currentPlace}
              allPlaces={sourceItems.map(discoverItemToPlaceItem)}
              onSelectPlace={() => {}}
              favorites={favorites}
              onToggleFav={toggleFavorite}
            />
          )}
        />
      )}
    </ScrollView>
    </PageTransition>
  );
}
