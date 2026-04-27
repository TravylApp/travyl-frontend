import { useState, useMemo, useEffect, useContext, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Image, Linking, ActivityIndicator, TextInput, Keyboard } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { PageTransition, useTabAccent, TabCtx } from './_layout';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
import type { PlaceItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TextStyles, FontFamily, useItineraryScreen, upscaleGoogleImage, getWebApiBase } from '@travyl/shared';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RestaurantData {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  priceLevel: number; // 1-4
  cuisine: string;
  address: string;
  neighborhood: string;
  images: string[];
  hours: string;
  phone: string;
  website: string;
  menuLink: string;
  reservationLink: string;
  orderOnlineLink: string;
  description: string;
  tags: string[];
  latitude: number;
  longitude: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CUISINE_FILTERS = ['Italian', 'Japanese', 'Mexican', 'Thai', 'French', 'Indian', 'Chinese', 'Mediterranean', 'American', 'Korean'];

const SORT_OPTIONS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'rating', label: 'Highest Rated' },
  { key: 'price-low', label: 'Price: Low to High' },
  { key: 'price-high', label: 'Price: High to Low' },
  { key: 'reviews', label: 'Most Reviewed' },
];

const CUISINE_ICONS: Record<string, string> = {
  Italian: 'cutlery', Japanese: 'circle-o', Mexican: 'fire',
  Thai: 'leaf', French: 'glass', Indian: 'star-o',
  Chinese: 'circle', Mediterranean: 'sun-o', American: 'flag',
  Korean: 'diamond',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ratingColor(r: number, accent = '#f97316'): string {
  if (r >= 4.5) return '#10b981';
  if (r >= 4.0) return accent;
  if (r >= 3.0) return '#f59e0b';
  return '#ef4444';
}

function priceLevelText(level: number): string {
  return '$'.repeat(Math.min(Math.max(level, 1), 4));
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionToggle({
  title,
  icon,
  isOpen,
  onToggle,
  badge,
}: {
  title: string;
  icon: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  const ACCENT = useTabAccent('restaurants');
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: isOpen ? 10 : 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name={icon as any} size={14} color={ACCENT} />
        <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>{title}</Text>
        {badge && (
          <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
            <Text style={{ ...TextStyles.smEm, color: ACCENT }}>{badge}</Text>
          </View>
        )}
      </View>
      <FontAwesome name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textTertiary} />
    </Pressable>
  );
}

function PriceLevelDots({ level }: { level: number }) {
  const ACCENT = useTabAccent('restaurants');
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Text
          key={i}
          style={{
            ...TextStyles.bodyLgEm,
            color: i < level ? ACCENT : colors.border,
          }}
        >
          $
        </Text>
      ))}
    </View>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  const ACCENT = useTabAccent('restaurants');
  return (
    <View style={{ backgroundColor: ratingColor(rating, ACCENT), paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }}>
      <Text style={{ ...TextStyles.bodyEm, color: '#fff' }}>{rating.toFixed(1)}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Image Carousel                                                     */
/* ------------------------------------------------------------------ */

function ImageCarousel({ images, height = 220 }: { images: string[]; height?: number }) {
  const colors = useThemeColors();
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <View style={{ width: '100%', height, backgroundColor: colors.skeleton, position: 'relative' }}>
      <Image source={{ uri: images[idx], headers: { Referer: '' } }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => {}} />
      {images.length > 1 && (
        <>
          <Pressable
            onPress={prev}
            style={{
              position: 'absolute', left: 10, top: '50%', marginTop: -16,
              width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name="chevron-left" size={12} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={next}
            style={{
              position: 'absolute', right: 10, top: '50%', marginTop: -16,
              width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name="chevron-right" size={12} color={colors.text} />
          </Pressable>
          <View
            style={{
              position: 'absolute', bottom: 10, right: 10,
              backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
            }}
          >
            <Text style={{ ...TextStyles.smEm, color: '#fff' }}>
              {idx + 1} / {images.length}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Hours Section                                                      */
/* ------------------------------------------------------------------ */

function HoursSection({ hours }: { hours: string }) {
  const ACCENT = useTabAccent('restaurants');
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Hours"
        icon="clock-o"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={hours.includes('Open') ? 'Open Now' : undefined}
      />
      {isOpen && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FontAwesome name="clock-o" size={14} color={ACCENT} />
            <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>{hours}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Menu Highlights Section                                            */
/* ------------------------------------------------------------------ */

function MenuHighlightsSection({ tags, cuisine }: { tags: string[]; cuisine: string }) {
  const ACCENT = useTabAccent('restaurants');
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const displayTags = tags.length > 0 ? tags : cuisine ? [cuisine] : [];

  if (displayTags.length === 0) return null;

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Cuisine & Tags"
        icon="cutlery"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={`${displayTags.length} tags`}
      />
      {isOpen && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {displayTags.map((tag) => (
            <View
              key={tag}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: colors.surface, borderRadius: 8,
                paddingHorizontal: 10, paddingVertical: 7,
                borderWidth: 1, borderColor: colors.border,
              }}
            >
              <FontAwesome name="tag" size={11} color={ACCENT} />
              <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact & Location                                                 */
/* ------------------------------------------------------------------ */

function ContactActions({ phone, website, address }: { phone: string; website: string; address: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginBottom: 10 }}>Contact & Location</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {!!phone && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${phone}`)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: colors.cardBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
          >
            <FontAwesome name="phone" size={16} color={colors.tint} />
            <Text style={{ ...TextStyles.xs, color: colors.text, marginTop: 4, fontWeight: '600' }}>Call</Text>
          </Pressable>
        )}
        {!!website && (
          <Pressable
            onPress={() => Linking.openURL(website.startsWith('http') ? website : `https://${website}`)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: colors.cardBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
          >
            <FontAwesome name="external-link" size={15} color={colors.tint} />
            <Text style={{ ...TextStyles.xs, color: colors.text, marginTop: 4, fontWeight: '600' }}>Website</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: colors.cardBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
        >
          <FontAwesome name="map-pin" size={16} color="#8b6f47" />
          <Text style={{ ...TextStyles.xs, color: colors.text, marginTop: 4, fontWeight: '600' }}>Map</Text>
        </Pressable>
      </View>

      {/* Address card */}
      {!!address && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10, backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border }}>
          <FontAwesome name="map-marker" size={14} color={colors.textTertiary} style={{ marginTop: 2 }} />
          <Text style={{ ...TextStyles.body, color: colors.text, flex: 1 }}>{address}</Text>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Restaurant Filter Bar                                              */
/* ------------------------------------------------------------------ */

function RestaurantFilterBar({
  showFilters,
  setShowFilters,
  sortBy,
  setSortBy,
  cuisineFilter,
  setCuisineFilter,
}: {
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  cuisineFilter: string[];
  setCuisineFilter: (v: string[]) => void;
}) {
  const ACCENT = useTabAccent('restaurants');
  const colors = useThemeColors();
  const activeCount = cuisineFilter.length;

  const toggleCuisine = (c: string) =>
    setCuisineFilter(cuisineFilter.includes(c) ? cuisineFilter.filter((x) => x !== c) : [...cuisineFilter, c]);
  const resetAll = () => { setCuisineFilter([]); setSortBy('recommended'); };

  return (
    <View style={{ marginBottom: 12 }}>
      {/* Toggle row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: showFilters ? 12 : 0 }}>
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: activeCount > 0 ? ACCENT + '15' : colors.surface,
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
            borderWidth: 1, borderColor: activeCount > 0 ? ACCENT + '30' : colors.border,
          }}
        >
          <FontAwesome name="sliders" size={13} color={activeCount > 0 ? ACCENT : colors.textSecondary} />
          <Text style={{ ...TextStyles.bodyEm, color: activeCount > 0 ? ACCENT : colors.textSecondary }}>Filters</Text>
          {activeCount > 0 && (
            <View style={{ backgroundColor: ACCENT, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{activeCount}</Text>
            </View>
          )}
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FontAwesome name="sort" size={12} color={colors.textTertiary} />
          <Pressable onPress={() => {
            const idx = SORT_OPTIONS.findIndex((o) => o.key === sortBy);
            setSortBy(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].key);
          }}>
            <Text style={{ ...TextStyles.bodyEm, color: ACCENT }}>
              {SORT_OPTIONS.find((o) => o.key === sortBy)?.label}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Expanded filters */}
      {showFilters && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          {/* Cuisine */}
          <Text style={{ ...TextStyles.captionEm, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Cuisine
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {CUISINE_FILTERS.map((c) => {
              const active = cuisineFilter.includes(c);
              return (
                <Pressable
                  key={c}
                  onPress={() => toggleCuisine(c)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: active ? ACCENT + '15' : colors.cardBackground,
                    borderWidth: 1, borderColor: active ? ACCENT : colors.border,
                  }}
                >
                  <FontAwesome name={(CUISINE_ICONS[c] || 'circle-o') as any} size={11} color={active ? ACCENT : colors.textTertiary} />
                  <Text style={{ ...TextStyles.caption, color: active ? ACCENT : colors.textSecondary }}>{c}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Reset */}
          {activeCount > 0 && (
            <Pressable onPress={resetAll} style={{ alignSelf: 'flex-start' }}>
              <Text style={{ ...TextStyles.bodyEm, color: colors.error }}>Reset Filters</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Restaurant List Card — rich card for browse list view              */
/* ------------------------------------------------------------------ */

function RestaurantListCard({ restaurant, onPress }: { restaurant: any; onPress: () => void }) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('restaurants');
  const [imgIdx, setImgIdx] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const images: string[] = [];
  if (restaurant.images) images.push(...restaurant.images);
  if (restaurant.image && !images.includes(restaurant.image)) images.push(restaurant.image);
  const hasMultiple = images.length > 1;
  const address = restaurant.address || restaurant.neighborhood || '';

  return (
    <View style={{
      marginBottom: 28, marginHorizontal: 6, borderRadius: 18,
      shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 8,
      backgroundColor: colors.cardBackground,
    }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          borderRadius: 18, overflow: 'hidden',
          borderWidth: 1, borderColor: colors.border,
          opacity: pressed ? 0.95 : 1,
        })}
      >
        {/* Image */}
        <View style={{ height: 200, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' }}>
          {images.length > 0 ? (
            <Image source={{ uri: images[imgIdx], headers: { Referer: '' } }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => {}} />
          ) : (
            <View style={{ flex: 1, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name="cutlery" size={36} color="rgba(255,255,255,0.25)" />
            </View>
          )}
          {/* Counter */}
          {images.length > 0 && (
            <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{imgIdx + 1}/{images.length}</Text>
            </View>
          )}
          {/* Arrows */}
          {hasMultiple && (
            <>
              <Pressable hitSlop={8} onPress={() => setImgIdx(i => i === 0 ? images.length - 1 : i - 1)} style={{ position: 'absolute', left: 8, top: '50%', marginTop: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome name="chevron-left" size={10} color={colors.text} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => setImgIdx(i => i === images.length - 1 ? 0 : i + 1)} style={{ position: 'absolute', right: 8, top: '50%', marginTop: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome name="chevron-right" size={10} color={colors.text} />
              </Pressable>
            </>
          )}
          {/* Price badge */}
          {restaurant.priceLevel > 0 && (
            <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{priceLevelText(restaurant.priceLevel)}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={{ padding: 20, paddingTop: 16 }}>
          {/* Name */}
          <Text style={{ fontSize: 18, fontFamily: FontFamily.sansBold, color: colors.text, lineHeight: 24 }} numberOfLines={2}>{restaurant.name}</Text>

          {/* Rating row — tappable to toggle reviews */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (!restaurant.reviews) return;
              if (showReviews) { setShowReviews(false); return; }
              setShowReviews(true);
              if (reviews.length > 0) return;
              setLoadingReviews(true);
              const base = getWebApiBase();
              fetch(`${base}/api/search/place-detail?q=${encodeURIComponent(restaurant.name + ' ' + address)}`)
                .then(r => r.ok ? r.json() : { reviews: [] })
                .then(d => { setReviews(d.reviews ?? []); setLoadingReviews(false); })
                .catch(() => setLoadingReviews(false));
            }}
            style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}
          >
            {restaurant.rating > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="star" size={12} color="#f59e0b" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.info }}>{restaurant.rating}/5</Text>
                {restaurant.reviews > 0 && <Text style={{ fontSize: 12, color: colors.textSecondary }}>({restaurant.reviews})</Text>}
              </View>
            )}
            {!!restaurant.cuisine && (
              <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: ACCENT }}>{restaurant.cuisine}</Text>
              </View>
            )}
          </Pressable>

          {/* Address */}
          {!!address && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <FontAwesome name="map-marker" size={12} color={colors.textTertiary} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>{address}</Text>
            </View>
          )}

          {/* Tags */}
          {restaurant.tags && restaurant.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
              {restaurant.tags.slice(0, 4).map((t: string) => (
                <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <FontAwesome name="tag" size={10} color={colors.tint} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Hours */}
          {!!restaurant.hours && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
              <FontAwesome name="clock-o" size={11} color={colors.textTertiary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{restaurant.hours}</Text>
            </View>
          )}

          {/* Price level */}
          {restaurant.priceLevel > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <PriceLevelDots level={restaurant.priceLevel} />
                <Text style={{ fontSize: 13, color: colors.textTertiary, marginLeft: 8 }}>
                  {restaurant.priceLevel === 1 ? 'Budget-friendly' : restaurant.priceLevel === 2 ? 'Moderate' : restaurant.priceLevel === 3 ? 'Upscale' : 'Fine Dining'}
                </Text>
              </View>
            </View>
          )}

          {/* Inline reviews — shown when rating is tapped */}
          {showReviews && (
            <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10 }}>
              {loadingReviews ? (
                <ActivityIndicator size="small" color={colors.tint} style={{ paddingVertical: 12 }} />
              ) : reviews.length === 0 ? (
                <Text style={{ fontSize: 13, color: colors.textTertiary, paddingVertical: 8 }}>No reviews loaded yet</Text>
              ) : (
                reviews.map((r: any, i: number) => (
                  <View key={i} style={{ paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.borderLight }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {r.authorPhoto ? (
                        <Image source={{ uri: r.authorPhoto }} style={{ width: 28, height: 28, borderRadius: 14 }} onError={() => {}} />
                      ) : (
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                          <FontAwesome name="user" size={12} color={colors.textTertiary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{r.author}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          {Array.from({ length: 5 }).map((_, si) => (
                            <FontAwesome key={si} name="star" size={9} color={si < r.rating ? '#f59e0b' : colors.border} />
                          ))}
                          {!!r.date && <Text style={{ fontSize: 10, color: colors.textTertiary, marginLeft: 4 }}>{r.date}</Text>}
                        </View>
                      </View>
                    </View>
                    {!!r.text && <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 6 }} numberOfLines={3}>{r.text}</Text>}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function RestaurantSkeleton() {
  const colors = useThemeColors();
  return (
    <View style={{ gap: 10 }}>
      {[1, 2].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 12,
            borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
          }}
        >
          <View style={{ width: 110, height: 120, backgroundColor: colors.skeleton }} />
          <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
            <View>
              <View style={{ height: 14, width: '70%', backgroundColor: colors.skeleton, borderRadius: 4 }} />
              <View style={{ height: 10, width: '40%', backgroundColor: colors.skeleton, borderRadius: 4, marginTop: 8 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <View style={{ height: 20, width: 32, backgroundColor: colors.skeleton, borderRadius: 4 }} />
              <View style={{ height: 10, width: '30%', backgroundColor: colors.skeleton, borderRadius: 4 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <View style={{ height: 12, width: 60, backgroundColor: colors.skeleton, borderRadius: 4 }} />
              <View style={{ height: 16, width: 40, backgroundColor: colors.skeleton, borderRadius: 4 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function RestaurantsScreen() {
  const ACCENT = useTabAccent('restaurants');
  const colors = useThemeColors();
  const { id: _id } = useLocalSearchParams<{ id: string }>();
  const { tripId: ctxId } = useContext(TabCtx);
  const id = _id || ctxId;
  const { trip } = useItineraryScreen(id);
  const [browseMode, setBrowseMode] = useState<'cards' | 'list'>('list');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [cuisineFilter, setCuisineFilter] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Restaurants from trip_context
  const ctx = trip?.trip_context as any;
  const contextRestaurants = useMemo(() => {
    const source = ctx?.restaurants ?? [];
    if (source.length === 0) return [];
    return source.map((r: any, i: number) => ({
      id: r.id || `rest-${i}`,
      name: r.name,
      rating: r.rating ?? 0,
      reviews: r.reviewCount ?? r.review_count ?? r.ratingCount ?? 0,
      priceLevel: r.priceLevel ?? (r.price ? Math.min(r.price.replace(/[^$]/g, '').length || 1, 4) : 0),
      cuisine: r.cuisine || r.category || '',
      address: r.address || '',
      neighborhood: r.address?.split(',')[0] || '',
      image: upscaleGoogleImage(r.image ?? r.photo_url) || r.image || r.photo_url || '',
      images: r.images ?? (r.image ? [upscaleGoogleImage(r.image) || r.image] : []),
      hours: r.hours || '',
      phone: r.phone || '',
      website: r.website || '',
      menuLink: r.menuLink || r.menu_link || '',
      reservationLink: r.reservationLink || r.reservation_link || '',
      orderOnlineLink: r.orderOnlineLink || '',
      description: r.tip || r.description || '',
      tags: r.tags ?? r.cuisines ?? [r.cuisine || r.category].filter(Boolean),
      latitude: r.latitude ?? r.lat ?? 0,
      longitude: r.longitude ?? r.lng ?? 0,
      label: i === 0 ? 'Top Pick' : i < 3 ? 'Popular' : '',
    }));
  }, [ctx]);

  // Also extract food items from explore_items
  const exploreRestaurants = useMemo(() => {
    const items = ctx?.explore_items ?? [];
    if (items.length === 0) return [];
    return items
      .filter((e: any) => /restaurant|food|dining|cafe|coffee|bakery|pizza|sushi|burger|bar|pub/i.test(e.type || e.category || ''))
      .map((e: any, i: number) => ({
        id: e.id || `exp-rest-${i}`,
        name: e.name,
        rating: e.rating ?? 0,
        reviews: e.reviewCount ?? e.review_count ?? 0,
        priceLevel: e.priceLevel ?? 0,
        cuisine: e.category || '',
        address: e.address || '',
        neighborhood: e.address?.split(',')[0] || '',
        image: upscaleGoogleImage(e.image) || e.image || '',
        images: e.images ?? (e.image ? [upscaleGoogleImage(e.image) || e.image] : []),
        hours: e.hours || '',
        phone: e.phone || '',
        website: e.website || '',
        menuLink: '',
        reservationLink: '',
        orderOnlineLink: '',
        description: e.description || e.tagline || '',
        tags: e.tags ?? [e.category].filter(Boolean),
        latitude: e.latitude ?? e.lat ?? 0,
        longitude: e.longitude ?? e.lng ?? 0,
        label: '',
      }));
  }, [ctx]);

  // Paginated search — endless scroll like the Places page
  const destination = trip?.destination?.split(',')[0]?.trim();
  const [searchRestaurants, setSearchRestaurants] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [searchPage, setSearchPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const mapResult = useCallback((p: any, i: number, prefix: string) => ({
    id: p.id || `${prefix}-${i}`,
    name: p.name,
    rating: p.rating ?? 0,
    reviews: p.reviewCount ?? p.reviews ?? 0,
    priceLevel: p.priceLevel ?? 0,
    cuisine: p.category || '',
    address: p.address || '',
    neighborhood: p.address?.split(',')[0] || '',
    image: upscaleGoogleImage(p.images?.[0] ?? p.image) || p.images?.[0] || p.image || '',
    images: (p.images ?? (p.image ? [p.image] : [])).map((img: string) => upscaleGoogleImage(img) || img),
    hours: p.hours || '',
    phone: p.phone || '',
    website: p.website || '',
    menuLink: '',
    reservationLink: '',
    orderOnlineLink: '',
    description: p.description || p.tagline || '',
    tags: p.tags ?? [p.category].filter(Boolean),
    latitude: (p.latitude && p.latitude !== 0) ? p.latitude : null,
    longitude: (p.longitude && p.longitude !== 0) ? p.longitude : null,
    label: '',
  }), []);

  // Get destination coordinates for Foursquare
  const destLat = ctx?.destination_lat ?? ctx?.latitude ?? null;
  const destLng = ctx?.destination_lng ?? ctx?.longitude ?? null;

  const fetchPage = useCallback(async (query: string, page: number, append: boolean) => {
    setIsLoadingMore(true);
    const base = getWebApiBase();
    try {
      const fetches: Promise<any[]>[] = [];

      // Foursquare — reliable, always works, paginate with coord offsets
      if (destLat && destLng) {
        const offsetLat = destLat + (page % 3) * 0.015;
        const offsetLng = destLng + (page % 2) * 0.012;
        fetches.push(
          fetch(`${base}/api/places?lat=${offsetLat}&lng=${offsetLng}&category=restaurant&limit=20`)
            .then(r => r.ok ? r.json() : []).catch(() => []),
        );
      } else if (destination) {
        // No coords — geocode via Nominatim then use Foursquare
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`, { headers: { 'User-Agent': 'Travyl/1.0' } });
          const geoData = await geoRes.json() as any[];
          if (geoData.length > 0) {
            const lat = parseFloat(geoData[0].lat) + (page % 3) * 0.015;
            const lng = parseFloat(geoData[0].lon) + (page % 2) * 0.012;
            fetches.push(
              fetch(`${base}/api/places?lat=${lat}&lng=${lng}&category=restaurant&limit=20`)
                .then(r => r.ok ? r.json() : []).catch(() => []),
            );
          }
        } catch {}
      }

      // Page 0: also try Maps + TripAdvisor for richer initial results
      if (page === 0) {
        fetches.push(
          fetch(`${base}/api/search/maps?q=${encodeURIComponent(query)}`)
            .then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${base}/api/search/tripadvisor?q=${encodeURIComponent(query)}&ssrc=r`)
            .then(r => r.ok ? r.json() : []).catch(() => []),
        );
      } else {
        // Pages 1+: TripAdvisor pagination as bonus
        fetches.push(
          fetch(`${base}/api/search/tripadvisor?q=${encodeURIComponent(query)}&ssrc=r&offset=${page * 30}`)
            .then(r => r.ok ? r.json() : []).catch(() => []),
        );
      }

      const results = await Promise.all(fetches);
      const all = results.flat()
        .filter((p: any) => p.name)
        .map((p: any, i: number) => mapResult(p, i + page * 100, `sr-p${page}`));
      if (all.length === 0 && page > 0) { setHasMore(false); setIsLoadingMore(false); return; }
      setSearchRestaurants(prev => {
        if (!append) return all;
        const existingNames = new Set(prev.map((r: any) => ((r.name || '') as string).toLowerCase()));
        const newItems = all.filter((r: any) => !existingNames.has(((r.name || '') as string).toLowerCase()));
        return [...prev, ...newItems];
      });
    } catch {}
    setIsLoadingMore(false);
  }, [mapResult, destLat, destLng, destination]);

  // Initial search
  useEffect(() => {
    if (destination) {
      setSearchPage(0);
      setHasMore(true);
      fetchPage(`restaurants in ${destination}`, 0, false);
    }
  }, [destination]);

  // User search
  useEffect(() => {
    if (!userSearch.trim()) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchPage(0);
      setHasMore(true);
      fetchPage(userSearch, 0, false);
    }, 400) as unknown as NodeJS.Timeout;
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [userSearch]);

  // Load more on scroll
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);
    const q = userSearch.trim() || (destination ? `restaurants in ${destination}` : '');
    if (q) fetchPage(q, nextPage, true);
  }, [searchPage, isLoadingMore, hasMore, userSearch, destination, fetchPage]);

  const handleScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < 800 && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // Merge: search results first (better images), then context + explore without dupes
  const realRestaurants = useMemo(() => {
    const seen = new Set(searchRestaurants.filter((r: any) => r.name).map((r: any) => ((r.name || '') as string).toLowerCase()));
    const contextExtra = contextRestaurants.filter((r: any) => {
      if (seen.has(((r.name || '') as string).toLowerCase())) return false;
      seen.add(((r.name || '') as string).toLowerCase());
      return true;
    });
    const exploreExtra = exploreRestaurants.filter((r: any) => {
      if (seen.has(((r.name || '') as string).toLowerCase())) return false;
      seen.add(((r.name || '') as string).toLowerCase());
      return true;
    });
    return [...searchRestaurants, ...contextExtra, ...exploreExtra];
  }, [contextRestaurants, exploreRestaurants, searchRestaurants]);

  // Convert to PlaceItem[] for CardStackCarousel
  const restaurantPlaces = useMemo<PlaceItem[]>(() =>
    realRestaurants.map((r: any) => ({
      id: r.id,
      name: r.name,
      image: r.image || '',
      images: r.images ?? (r.image ? [r.image] : []),
      type: 'restaurant' as const,
      rating: r.rating ?? 0,
      tagline: [r.cuisine, r.priceLevel > 0 ? priceLevelText(r.priceLevel) : ''].filter(Boolean).join(' · '),
      category: r.cuisine || 'Restaurant',
      description: [
        r.description,
        r.hours ? `Hours: ${r.hours}` : '',
      ].filter(Boolean).join('\n'),
      tags: r.tags?.slice(0, 4) ?? [],
      priceLevel: r.priceLevel > 0 ? (Math.min(r.priceLevel, 4) as 1 | 2 | 3 | 4) : undefined,
      hours: r.hours || undefined,
      phone: r.phone || undefined,
      website: r.website || undefined,
      address: r.address || r.neighborhood || '',
      latitude: r.latitude || undefined,
      longitude: r.longitude || undefined,
      reviewCount: r.reviews || undefined,
    })),
    [realRestaurants],
  );

  // Filtered + sorted list
  const filteredRestaurants = useMemo(() => {
    let result = [...realRestaurants];
    if (cuisineFilter.length > 0) {
      result = result.filter((r) => {
        const rCuisine = (r?.cuisine || '').toLowerCase();
        const rTags = (r.tags || []).map((t: string) => t.toLowerCase());
        return cuisineFilter.some((c) => rCuisine.includes(c.toLowerCase()) || rTags.some((t: string) => t.includes(c.toLowerCase())));
      });
    }
    switch (sortBy) {
      case 'price-low': result.sort((a, b) => (a.priceLevel || 99) - (b.priceLevel || 99)); break;
      case 'price-high': result.sort((a, b) => (b.priceLevel || 0) - (a.priceLevel || 0)); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'reviews': result.sort((a, b) => (b.reviews || 0) - (a.reviews || 0)); break;
      default: break;
    }
    return result;
  }, [realRestaurants, cuisineFilter, sortBy]);

  // Build detail for selected restaurant
  const restaurant = useMemo<RestaurantData | null>(() => {
    const r = realRestaurants[selectedIdx] ?? realRestaurants[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      rating: r.rating ?? 0,
      reviews: r.reviews ?? 0,
      priceLevel: r.priceLevel ?? 0,
      cuisine: r?.cuisine || '',
      address: r.address || '',
      neighborhood: r.neighborhood || '',
      images: [...new Set([...(r.images || []), r.image].filter(Boolean))],
      hours: r.hours || '',
      phone: r.phone || '',
      website: r.website || '',
      menuLink: r.menuLink || '',
      reservationLink: r.reservationLink || '',
      orderOnlineLink: r.orderOnlineLink || '',
      description: r.description || '',
      tags: r.tags || [],
      latitude: r.latitude ?? 0,
      longitude: r.longitude ?? 0,
    };
  }, [realRestaurants, selectedIdx]);

  // Empty state
  if (!restaurant && realRestaurants.length === 0 && !isLoading) {
    return (
      <PageTransition>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, padding: 32 }}>
          <FontAwesome name="cutlery" size={28} color={colors.textTertiary} />
          <Text style={{ ...TextStyles.subhead, color: colors.text, marginTop: 12 }}>No Restaurants Yet</Text>
          <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>Restaurant recommendations will appear once the trip is enriched.</Text>
        </View>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      {/* ── Selected Restaurant Detail (top, like hotels pattern) ── */}
      {restaurant && (() => {
        return (
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>

        {/* Banner */}
        <LinearGradient
          colors={[ACCENT, ACCENT]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FontAwesome name="cutlery" size={14} color="#fff" />
            <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Selected Restaurant</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
            <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{selectedIdx + 1}/{realRestaurants.length}</Text>
          </View>
        </LinearGradient>

        {/* Card Body */}
        <View style={{ backgroundColor: colors.cardBackground, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0, borderColor: colors.border, overflow: 'hidden' }}>

          {/* Badges Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingTop: 14 }}>
            <View style={{ backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }}>
              <Text style={{ ...TextStyles.smEm, color: '#fff' }}>Selected</Text>
            </View>
            {restaurant.rating > 0 && (
              <View style={{ backgroundColor: colors.infoBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="star" size={10} color={colors.info} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.info }}>{restaurant.rating}/5</Text>
                {restaurant.reviews > 0 && <Text style={{ fontSize: 11, color: colors.info }}>({restaurant.reviews.toLocaleString()})</Text>}
              </View>
            )}
            {restaurant.priceLevel > 0 && (
              <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{priceLevelText(restaurant.priceLevel)}</Text>
              </View>
            )}
          </View>

          {/* Restaurant Name */}
          <Text style={{ ...TextStyles.title, fontFamily: FontFamily.serif, color: colors.text, paddingHorizontal: 14, marginTop: 8 }} numberOfLines={2}>{restaurant.name}</Text>

          {/* Cuisine */}
          {!!restaurant.cuisine && (
            <View style={{ paddingHorizontal: 14, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FontAwesome name="cutlery" size={10} color={colors.textTertiary} />
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>{restaurant.cuisine}</Text>
            </View>
          )}

          {/* Image Carousel */}
          {restaurant.images.length > 0 && (
            <View style={{ marginTop: 12, marginHorizontal: 14, borderRadius: 10, overflow: 'hidden' }}>
              <ImageCarousel images={restaurant.images} height={208} />
            </View>
          )}

          <View style={{ padding: 14, gap: 0 }}>

            {/* Description */}
            {!!restaurant.description && (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, lineHeight: 22 }}>{restaurant.description}</Text>
              </View>
            )}

            {/* Price Level display */}
            {restaurant.priceLevel > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>Price Level</Text>
                <PriceLevelDots level={restaurant.priceLevel} />
                <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>
                  {restaurant.priceLevel === 1 ? 'Budget-friendly' : restaurant.priceLevel === 2 ? 'Moderate' : restaurant.priceLevel === 3 ? 'Upscale' : 'Fine Dining'}
                </Text>
              </View>
            )}

            {/* Hours (collapsible) */}
            {!!restaurant.hours && (
              <HoursSection hours={restaurant.hours} />
            )}

            {/* Menu / Cuisine Tags (collapsible) */}
            <MenuHighlightsSection tags={restaurant.tags} cuisine={restaurant.cuisine} />

            {/* Contact & Location */}
            {(!!restaurant.address || !!restaurant.phone || !!restaurant.website) && (
              <ContactActions phone={restaurant.phone} website={restaurant.website} address={restaurant.address} />
            )}

            {/* Action Button — Reserve / Order / Visit Website */}
            {(!!restaurant.reservationLink || !!restaurant.orderOnlineLink || !!restaurant.website || !!restaurant.menuLink) && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                {/* Primary action */}
                <Pressable
                  onPress={() => {
                    const link = restaurant.reservationLink || restaurant.orderOnlineLink || restaurant.website || '';
                    if (link) {
                      WebBrowser.openBrowserAsync(link.startsWith('http') ? link : `https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' reservation')}`);
                    }
                  }}
                  style={({ pressed }) => ({
                    flex: 1, backgroundColor: pressed ? colors.tint : colors.tint, borderRadius: 12, paddingVertical: 15,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  })}
                >
                  <FontAwesome name={restaurant.reservationLink ? 'calendar' : 'cutlery'} size={14} color="#fff" />
                  <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>
                    {restaurant.reservationLink ? 'Reserve a Table' : restaurant.orderOnlineLink ? 'Order Online' : 'Visit Website'}
                  </Text>
                </Pressable>

                {/* Menu link */}
                {!!restaurant.menuLink && (
                  <Pressable
                    onPress={() => WebBrowser.openBrowserAsync(restaurant.menuLink.startsWith('http') ? restaurant.menuLink : `https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' menu')}`)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 16, borderRadius: 12, paddingVertical: 15,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                      borderWidth: 1.5, borderColor: ACCENT, opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <FontAwesome name="book" size={13} color={ACCENT} />
                    <Text style={{ ...TextStyles.bodyEm, color: ACCENT }}>Menu</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
        );
      })()}

      {/* ── Search bar ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 40 }}>
          <FontAwesome name="search" size={13} color={colors.textTertiary} />
          <TextInput
            value={userSearch}
            onChangeText={setUserSearch}
            onSubmitEditing={() => { Keyboard.dismiss(); if (userSearch.trim()) runSearch(userSearch.trim()); }}
            returnKeyType="search"
            placeholder="Search restaurants — Nobu, sushi, tacos..."
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: 14, color: colors.text, marginLeft: 8, paddingVertical: 0 }}
          />
          {userSearch.length > 0 && (
            <Pressable onPress={() => { setUserSearch(''); if (destination) runSearch(`restaurants in ${destination}`); }}>
              <FontAwesome name="times-circle" size={14} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Browse Restaurants — toggle + list/card views ── */}
      {realRestaurants.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          {/* Header with toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ ...TextStyles.subhead, color: colors.text }}>Browse Restaurants</Text>
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 8, padding: 2 }}>
              <Pressable
                onPress={() => setBrowseMode('list')}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: browseMode === 'list' ? colors.cardBackground : 'transparent',
                  ...(browseMode === 'list' ? { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {}),
                }}
              >
                <FontAwesome name="list" size={13} color={browseMode === 'list' ? colors.tint : colors.textTertiary} />
              </Pressable>
              <Pressable
                onPress={() => setBrowseMode('cards')}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: browseMode === 'cards' ? colors.cardBackground : 'transparent',
                  ...(browseMode === 'cards' ? { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 } : {}),
                }}
              >
                <FontAwesome name="th-large" size={13} color={browseMode === 'cards' ? colors.tint : colors.textTertiary} />
              </Pressable>
            </View>
          </View>

          {/* Filter Bar */}
          <RestaurantFilterBar
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            sortBy={sortBy}
            setSortBy={setSortBy}
            cuisineFilter={cuisineFilter}
            setCuisineFilter={setCuisineFilter}
          />

          {/* List View */}
          {browseMode === 'list' && (
            isLoading ? <RestaurantSkeleton /> : (
              filteredRestaurants.filter((_: any, i: number) => i !== selectedIdx).length > 0 ? (
                filteredRestaurants.filter((_: any, i: number) => {
                  const realIdx = realRestaurants.findIndex((rr: any) => rr.id === _.id);
                  return realIdx !== selectedIdx;
                }).map((r: any) => (
                  <RestaurantListCard
                    key={r.id}
                    restaurant={r}
                    onPress={() => {
                      const idx = realRestaurants.findIndex((rr: any) => rr.id === r.id);
                      if (idx >= 0) {
                        setSelectedIdx(idx);
                        setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
                      }
                    }}
                  />
                ))
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                  <FontAwesome name="search" size={28} color={colors.textTertiary} />
                  <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, marginTop: 8 }}>No restaurants match your filters</Text>
                  <Pressable onPress={() => { setCuisineFilter([]); setSortBy('recommended'); }} style={{ marginTop: 8 }}>
                    <Text style={{ ...TextStyles.bodyEm, color: ACCENT }}>Clear filters</Text>
                  </Pressable>
                </View>
              )
            )
          )}

          {/* Card View — swipeable CardStackCarousel */}
          {browseMode === 'cards' && restaurantPlaces.length > 0 && (
            <CardStackCarousel
              places={restaurantPlaces}
              initialIndex={0}
              favorites={[]}
              onToggleFav={() => {}}
              onAddToTrip={(place) => {
                const idx = realRestaurants.findIndex((rr: any) => rr.id === place.id);
                if (idx >= 0) {
                  setSelectedIdx(idx);
                  setBrowseMode('list');
                  setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 100);
                }
              }}
              onClose={() => setBrowseMode('list')}
              hideArrows
              showMapBg
              overlay
            />
          )}
        </View>
      )}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <View style={{ paddingVertical: 20, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 6 }}>Loading more restaurants...</Text>
        </View>
      )}
    </ScrollView>
    </PageTransition>
  );
}
