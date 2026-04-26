import { useState, useMemo, useEffect, useContext, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Image, Linking, ActivityIndicator } from 'react-native';
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

interface ActivityData {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  activityType: string;
  address: string;
  neighborhood: string;
  images: string[];
  hours: string;
  duration: string;
  phone: string;
  website: string;
  bookingLink: string;
  description: string;
  tags: string[];
  latitude: number;
  longitude: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TYPE_FILTERS = ['Outdoors', 'Cultural', 'Adventure', 'Tours', 'Entertainment', 'Nightlife', 'Wellness', 'Shopping'];

const SORT_OPTIONS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'rating', label: 'Highest Rated' },
  { key: 'reviews', label: 'Most Reviewed' },
  { key: 'distance', label: 'Nearest' },
];

const TYPE_ICONS: Record<string, string> = {
  Outdoors: 'tree', Cultural: 'university', Adventure: 'bolt',
  Tours: 'map', Entertainment: 'film', Nightlife: 'moon-o',
  Wellness: 'heart', Shopping: 'shopping-bag',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ratingColor(r: number, accent = '#8b5cf6'): string {
  if (r >= 4.5) return '#10b981';
  if (r >= 4.0) return accent;
  if (r >= 3.0) return '#f59e0b';
  return '#ef4444';
}

function guessActivityType(item: any): string {
  const text = [item?.type, item?.category, item?.name, ...(item.tags || [])].join(' ').toLowerCase();
  if (/hike|trek|kayak|surf|climb|dive|snorkel|zip/i.test(text)) return 'Adventure';
  if (/museum|gallery|temple|church|monument|heritage|historic/i.test(text)) return 'Cultural';
  if (/park|garden|beach|lake|mountain|nature|trail|outdoor/i.test(text)) return 'Outdoors';
  if (/tour|walk|cruise|boat|bus|segway|guide/i.test(text)) return 'Tours';
  if (/show|theater|cinema|concert|comedy|amusement|theme park|zoo|aquarium/i.test(text)) return 'Entertainment';
  if (/bar|club|nightlife|pub|lounge/i.test(text)) return 'Nightlife';
  if (/spa|yoga|massage|wellness|sauna|bath/i.test(text)) return 'Wellness';
  if (/shop|market|mall|boutique|souvenir/i.test(text)) return 'Shopping';
  return 'Activity';
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
  const ACCENT = useTabAccent('activities');
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

function RatingBadge({ rating }: { rating: number }) {
  const ACCENT = useTabAccent('activities');
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
      <Image source={{ uri: images[idx], headers: { Referer: '' } }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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
  const ACCENT = useTabAccent('activities');
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
/*  Tags Section                                                       */
/* ------------------------------------------------------------------ */

function TagsSection({ tags, activityType }: { tags: string[]; activityType: string }) {
  const ACCENT = useTabAccent('activities');
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const displayTags = tags.length > 0 ? tags : activityType ? [activityType] : [];

  if (displayTags.length === 0) return null;

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Activity Tags"
        icon="tags"
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
/*  Activity Filter Bar                                                */
/* ------------------------------------------------------------------ */

function ActivityFilterBar({
  showFilters,
  setShowFilters,
  sortBy,
  setSortBy,
  typeFilter,
  setTypeFilter,
}: {
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  typeFilter: string[];
  setTypeFilter: (v: string[]) => void;
}) {
  const ACCENT = useTabAccent('activities');
  const colors = useThemeColors();
  const activeCount = typeFilter.length;

  const toggleType = (t: string) =>
    setTypeFilter(typeFilter.includes(t) ? typeFilter.filter((x) => x !== t) : [...typeFilter, t]);
  const resetAll = () => { setTypeFilter([]); setSortBy('recommended'); };

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
          {/* Activity Type */}
          <Text style={{ ...TextStyles.captionEm, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Activity Type
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {TYPE_FILTERS.map((t) => {
              const active = typeFilter.includes(t);
              return (
                <Pressable
                  key={t}
                  onPress={() => toggleType(t)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: active ? ACCENT + '15' : colors.cardBackground,
                    borderWidth: 1, borderColor: active ? ACCENT : colors.border,
                  }}
                >
                  <FontAwesome name={(TYPE_ICONS[t] || 'compass') as any} size={11} color={active ? ACCENT : colors.textTertiary} />
                  <Text style={{ ...TextStyles.caption, color: active ? ACCENT : colors.textSecondary }}>{t}</Text>
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
/*  Activity List Card — rich card for browse list view                */
/* ------------------------------------------------------------------ */

function ActivityListCard({ activity, onPress }: { activity: any; onPress: () => void }) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('activities');
  const [imgIdx, setImgIdx] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const images: string[] = [];
  if (activity.images) images.push(...activity.images);
  if (activity.image && !images.includes(activity.image)) images.push(activity.image);
  const hasMultiple = images.length > 1;
  const address = activity.address || activity.neighborhood || '';

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
            <Image source={{ uri: images[imgIdx], headers: { Referer: '' } }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name="compass" size={36} color="rgba(255,255,255,0.25)" />
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
          {/* Type badge */}
          {!!activity.activityType && activity.activityType !== 'Activity' && (
            <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{activity.activityType}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={{ padding: 20, paddingTop: 16 }}>
          {/* Name */}
          <Text style={{ fontSize: 18, fontFamily: FontFamily.sansBold, color: colors.text, lineHeight: 24 }} numberOfLines={2}>{activity.name}</Text>

          {/* Rating row — tappable to toggle reviews */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (!activity.reviews) return;
              if (showReviews) { setShowReviews(false); return; }
              setShowReviews(true);
              if (reviews.length > 0) return;
              setLoadingReviews(true);
              const base = getWebApiBase();
              fetch(`${base}/api/search/place-detail?q=${encodeURIComponent(activity.name + ' ' + address)}`)
                .then(r => r.ok ? r.json() : { reviews: [] })
                .then(d => { setReviews(d.reviews ?? []); setLoadingReviews(false); })
                .catch(() => setLoadingReviews(false));
            }}
            style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}
          >
            {activity.rating > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="star" size={12} color="#f59e0b" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.info }}>{activity.rating}/5</Text>
                {activity.reviews > 0 && <Text style={{ fontSize: 12, color: colors.textSecondary }}>({activity.reviews})</Text>}
              </View>
            )}
            {!!activity.activityType && activity.activityType !== 'Activity' && (
              <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: ACCENT }}>{activity.activityType}</Text>
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
          {activity.tags && activity.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
              {activity.tags.slice(0, 4).map((t: string) => (
                <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <FontAwesome name="tag" size={10} color={colors.tint} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Duration */}
          {!!activity.duration && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
              <FontAwesome name="clock-o" size={11} color={colors.textTertiary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{activity.duration}</Text>
            </View>
          )}

          {/* Hours */}
          {!!activity.hours && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <FontAwesome name="calendar" size={11} color={colors.textTertiary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{activity.hours}</Text>
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
                        <Image source={{ uri: r.authorPhoto }} style={{ width: 28, height: 28, borderRadius: 14 }} />
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

function ActivitySkeleton() {
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

export default function ActivitiesScreen() {
  const ACCENT = useTabAccent('activities');
  const colors = useThemeColors();
  const { id: _id } = useLocalSearchParams<{ id: string }>();
  const { tripId: ctxId } = useContext(TabCtx);
  const id = _id || ctxId;
  const { trip } = useItineraryScreen(id);
  const [browseMode, setBrowseMode] = useState<'cards' | 'list'>('list');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Activities from trip_context
  const ctx = trip?.trip_context as any;
  const contextActivities = useMemo(() => {
    const source = ctx?.activities ?? [];
    if (source.length === 0) return [];
    return source.map((a: any, i: number) => ({
      id: a.id || `act-${i}`,
      name: a.name,
      rating: a.rating ?? 0,
      reviews: a.reviewCount ?? a.review_count ?? a.ratingCount ?? 0,
      activityType: a.activityType || a.type || a.category || guessActivityType(a),
      address: a.address || '',
      neighborhood: a.address?.split(',')[0] || '',
      image: upscaleGoogleImage(a.image ?? a.photo_url) || a.image || a.photo_url || '',
      images: a.images ?? (a.image ? [upscaleGoogleImage(a.image) || a.image] : []),
      hours: a.hours || '',
      duration: a.duration || '',
      phone: a.phone || '',
      website: a.website || '',
      bookingLink: a.bookingLink || a.booking_link || a.website || '',
      description: a.tip || a.description || '',
      tags: a.tags ?? [a.category || a.type].filter(Boolean),
      latitude: a.latitude ?? a.lat ?? 0,
      longitude: a.longitude ?? a.lng ?? 0,
      label: i === 0 ? 'Top Pick' : i < 3 ? 'Popular' : '',
    }));
  }, [ctx]);

  // Also extract non-food items from explore_items
  const exploreActivities = useMemo(() => {
    const items = ctx?.explore_items ?? [];
    if (items.length === 0) return [];
    return items
      .filter((e: any) => !/restaurant|food|dining|cafe|coffee|bakery|pizza|sushi|burger|bar\b|pub\b/i.test(e.type || e.category || ''))
      .map((e: any, i: number) => ({
        id: e.id || `exp-act-${i}`,
        name: e.name || e.title,
        rating: e.rating ?? 0,
        reviews: e.reviewCount ?? e.review_count ?? 0,
        activityType: e.activityType || e.type || e.category || guessActivityType(e),
        address: e.address || '',
        neighborhood: e.address?.split(',')[0] || '',
        image: upscaleGoogleImage(e.image) || e.image || '',
        images: e.images ?? (e.image ? [upscaleGoogleImage(e.image) || e.image] : []),
        hours: e.hours || '',
        duration: e.duration || '',
        phone: e.phone || '',
        website: e.website || '',
        bookingLink: e.bookingLink || e.website || '',
        description: e.description || e.tagline || '',
        tags: e.tags ?? [e.category || e.type].filter(Boolean),
        latitude: e.latitude ?? e.lat ?? 0,
        longitude: e.longitude ?? e.lng ?? 0,
        label: '',
      }));
  }, [ctx]);

  // Live search via /api/search/maps
  const destination = trip?.destination?.split(',')[0]?.trim();
  const [searchActivities, setSearchActivities] = useState<any[]>([]);
  useEffect(() => {
    if (!destination) return;
    const base = getWebApiBase();
    const query = `things to do in ${destination}`;
    fetch(`${base}/api/search/maps?q=${encodeURIComponent(query)}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setSearchActivities(data
          .filter((p: any) => !/restaurant|food|dining|cafe|coffee|bakery|pizza|sushi|burger/i.test(p.type || p.category || ''))
          .map((p: any, i: number) => ({
            id: p.id || `search-act-${i}`,
            name: p.name,
            rating: p.rating ?? 0,
            reviews: p.reviewCount ?? p.reviews ?? 0,
            activityType: p.activityType || p.type || p.category || guessActivityType(p),
            address: p.address || '',
            neighborhood: p.address?.split(',')[0] || '',
            image: p.images?.[0] ?? p.image ?? '',
            images: p.images ?? (p.image ? [p.image] : []),
            hours: p.hours || '',
            duration: p.duration || '',
            phone: p.phone || '',
            website: p.website || '',
            bookingLink: p.bookingLink || p.website || '',
            description: p.description || p.tagline || '',
            tags: p.tags ?? [p.category || p.type].filter(Boolean),
            latitude: p.latitude ?? 0,
            longitude: p.longitude ?? 0,
            label: '',
          })));
      })
      .catch(() => {});
  }, [destination]);

  // Also try TripAdvisor for activities
  const [taActivities, setTaActivities] = useState<any[]>([]);
  useEffect(() => {
    if (!destination) return;
    const base = getWebApiBase();
    fetch(`${base}/api/search/tripadvisor?q=${encodeURIComponent(destination)}&ssrc=A`)
      .then(r => r.ok ? r.json() : [])
      .then((data: any) => {
        const results = Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
        if (!Array.isArray(results) || results.length === 0) return;
        setTaActivities(results.map((p: any, i: number) => ({
          id: p.id || `ta-act-${i}`,
          name: p.name || p.title,
          rating: p.rating ?? 0,
          reviews: p.reviewCount ?? p.reviews ?? p.num_reviews ?? 0,
          activityType: p.activityType || p.type || p.category || guessActivityType(p),
          address: p.address || '',
          neighborhood: p.address?.split(',')[0] || '',
          image: p.images?.[0] ?? p.image ?? p.thumbnail ?? '',
          images: p.images ?? (p.image ? [p.image] : p.thumbnail ? [p.thumbnail] : []),
          hours: p.hours || '',
          duration: p.duration || '',
          phone: p.phone || '',
          website: p.website || p.url || '',
          bookingLink: p.bookingLink || p.url || p.website || '',
          description: p.description || p.tagline || p.snippet || '',
          tags: p.tags ?? [p.category || p.type].filter(Boolean),
          latitude: p.latitude ?? p.lat ?? 0,
          longitude: p.longitude ?? p.lng ?? 0,
          label: '',
        })));
      })
      .catch(() => {});
  }, [destination]);

  // Merge: search results first (better images), then TA, then context + explore without dupes
  const realActivities = useMemo(() => {
    const seen = new Set(searchActivities.filter((a: any) => a.name).map((a: any) => ((a.name || '') as string).toLowerCase()));
    const taExtra = taActivities.filter((a: any) => {
      if (seen.has(((a.name || '') as string).toLowerCase())) return false;
      seen.add(((a.name || '') as string).toLowerCase());
      return true;
    });
    const contextExtra = contextActivities.filter((a: any) => {
      if (seen.has(((a.name || '') as string).toLowerCase())) return false;
      seen.add(((a.name || '') as string).toLowerCase());
      return true;
    });
    const exploreExtra = exploreActivities.filter((a: any) => {
      if (seen.has(((a.name || '') as string).toLowerCase())) return false;
      seen.add(((a.name || '') as string).toLowerCase());
      return true;
    });
    return [...searchActivities, ...taExtra, ...contextExtra, ...exploreExtra];
  }, [contextActivities, exploreActivities, searchActivities, taActivities]);

  // Convert to PlaceItem[] for CardStackCarousel
  const activityPlaces = useMemo<PlaceItem[]>(() =>
    realActivities.map((a: any) => ({
      id: a.id,
      name: a.name,
      image: a.image || '',
      images: a.images ?? (a.image ? [a.image] : []),
      type: 'attraction' as const,
      rating: a.rating ?? 0,
      tagline: [a.activityType !== 'Activity' ? a.activityType : '', a.duration].filter(Boolean).join(' · '),
      category: a.activityType || 'Activity',
      description: [
        a.description,
        a.hours ? `Hours: ${a.hours}` : '',
        a.duration ? `Duration: ${a.duration}` : '',
      ].filter(Boolean).join('\n'),
      tags: a.tags?.slice(0, 4) ?? [],
      hours: a.hours || undefined,
      phone: a.phone || undefined,
      website: a.website || undefined,
      address: a.address || a.neighborhood || '',
      latitude: a.latitude || undefined,
      longitude: a.longitude || undefined,
      reviewCount: a.reviews || undefined,
    })),
    [realActivities],
  );

  // Filtered + sorted list
  const filteredActivities = useMemo(() => {
    let result = [...realActivities];
    if (typeFilter.length > 0) {
      result = result.filter((a) => {
        const aType = (a?.activityType || '').toLowerCase();
        const aTags = (a.tags || []).map((t: string) => t.toLowerCase());
        return typeFilter.some((t) => aType.includes(t.toLowerCase()) || aTags.some((tag: string) => tag.includes(t.toLowerCase())));
      });
    }
    switch (sortBy) {
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'reviews': result.sort((a, b) => (b.reviews || 0) - (a.reviews || 0)); break;
      case 'distance': break; // Would need geo, keep natural order
      default: break;
    }
    return result;
  }, [realActivities, typeFilter, sortBy]);

  // Build detail for selected activity
  const activity = useMemo<ActivityData | null>(() => {
    const a = realActivities[selectedIdx] ?? realActivities[0];
    if (!a) return null;
    return {
      id: a.id,
      name: a.name,
      rating: a.rating ?? 0,
      reviews: a.reviews ?? 0,
      activityType: a?.activityType || '',
      address: a.address || '',
      neighborhood: a.neighborhood || '',
      images: [...new Set([...(a.images || []), a.image].filter(Boolean))],
      hours: a.hours || '',
      duration: a.duration || '',
      phone: a.phone || '',
      website: a.website || '',
      bookingLink: a.bookingLink || a.website || '',
      description: a.description || '',
      tags: a.tags || [],
      latitude: a.latitude ?? 0,
      longitude: a.longitude ?? 0,
    };
  }, [realActivities, selectedIdx]);

  // Empty state
  if (!activity && realActivities.length === 0 && !isLoading) {
    return (
      <PageTransition>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, padding: 32 }}>
          <FontAwesome name="compass" size={28} color={colors.textTertiary} />
          <Text style={{ ...TextStyles.subhead, color: colors.text, marginTop: 12 }}>No Activities Yet</Text>
          <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>Activity recommendations will appear once the trip is enriched.</Text>
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
    >
      {/* ── Selected Activity Detail (top, like hotels/restaurants pattern) ── */}
      {activity && (() => {
        return (
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>

        {/* Banner */}
        <LinearGradient
          colors={[ACCENT, ACCENT]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FontAwesome name="compass" size={14} color="#fff" />
            <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Selected Activity</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
            <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{selectedIdx + 1}/{realActivities.length}</Text>
          </View>
        </LinearGradient>

        {/* Card Body */}
        <View style={{ backgroundColor: colors.cardBackground, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0, borderColor: colors.border, overflow: 'hidden' }}>

          {/* Badges Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingTop: 14 }}>
            <View style={{ backgroundColor: ACCENT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }}>
              <Text style={{ ...TextStyles.smEm, color: '#fff' }}>Selected</Text>
            </View>
            {activity.rating > 0 && (
              <View style={{ backgroundColor: colors.infoBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="star" size={10} color={colors.info} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.info }}>{activity.rating}/5</Text>
                {activity.reviews > 0 && <Text style={{ fontSize: 11, color: colors.info }}>({activity.reviews.toLocaleString()})</Text>}
              </View>
            )}
            {!!activity.activityType && activity.activityType !== 'Activity' && (
              <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{activity.activityType}</Text>
              </View>
            )}
          </View>

          {/* Activity Name */}
          <Text style={{ ...TextStyles.title, fontFamily: FontFamily.serif, color: colors.text, paddingHorizontal: 14, marginTop: 8 }} numberOfLines={2}>{activity.name}</Text>

          {/* Type + Duration */}
          {(!!activity.activityType || !!activity.duration) && (
            <View style={{ paddingHorizontal: 14, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <FontAwesome name="compass" size={10} color={colors.textTertiary} />
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>
                {[activity.activityType !== 'Activity' ? activity.activityType : '', activity.duration].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}

          {/* Image Carousel */}
          {activity.images.length > 0 && (
            <View style={{ marginTop: 12, marginHorizontal: 14, borderRadius: 10, overflow: 'hidden' }}>
              <ImageCarousel images={activity.images} height={208} />
            </View>
          )}

          <View style={{ padding: 14, gap: 0 }}>

            {/* Description */}
            {!!activity.description && (
              <View style={{ marginBottom: 10 }}>
                <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, lineHeight: 22 }}>{activity.description}</Text>
              </View>
            )}

            {/* Duration display */}
            {!!activity.duration && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <FontAwesome name="clock-o" size={14} color={ACCENT} />
                <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>Duration</Text>
                <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>{activity.duration}</Text>
              </View>
            )}

            {/* Hours (collapsible) */}
            {!!activity.hours && (
              <HoursSection hours={activity.hours} />
            )}

            {/* Tags (collapsible) */}
            <TagsSection tags={activity.tags} activityType={activity.activityType} />

            {/* Contact & Location */}
            {(!!activity.address || !!activity.phone || !!activity.website) && (
              <ContactActions phone={activity.phone} website={activity.website} address={activity.address} />
            )}

            {/* Action Button — Book Activity / Get Tickets */}
            {(!!activity.bookingLink || !!activity.website) && (
              <Pressable
                onPress={() => {
                  const link = activity.bookingLink || activity.website || '';
                  if (link) {
                    WebBrowser.openBrowserAsync(link.startsWith('http') ? link : `https://www.google.com/search?q=${encodeURIComponent(activity.name + ' tickets')}`);
                  }
                }}
                style={({ pressed }) => ({
                  marginTop: 16, backgroundColor: pressed ? colors.tint : colors.tint, borderRadius: 12, paddingVertical: 15,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                })}
              >
                <FontAwesome name="ticket" size={14} color="#fff" />
                <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>
                  {/ticket|show|concert|theater|theme park|museum|gallery|exhibit/i.test(activity.activityType + ' ' + activity.name) ? 'Get Tickets' : 'Book Activity'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
        );
      })()}

      {/* ── Browse Activities — toggle + list/card views ── */}
      {realActivities.length > 1 && (
        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          {/* Header with toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ ...TextStyles.subhead, color: colors.text }}>Browse Activities</Text>
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
          <ActivityFilterBar
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            sortBy={sortBy}
            setSortBy={setSortBy}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
          />

          {/* List View */}
          {browseMode === 'list' && (
            isLoading ? <ActivitySkeleton /> : (
              filteredActivities.filter((_: any) => {
                const realIdx = realActivities.findIndex((ra: any) => ra.id === _.id);
                return realIdx !== selectedIdx;
              }).length > 0 ? (
                filteredActivities.filter((_: any) => {
                  const realIdx = realActivities.findIndex((ra: any) => ra.id === _.id);
                  return realIdx !== selectedIdx;
                }).map((a: any) => (
                  <ActivityListCard
                    key={a.id}
                    activity={a}
                    onPress={() => {
                      const idx = realActivities.findIndex((ra: any) => ra.id === a.id);
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
                  <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, marginTop: 8 }}>No activities match your filters</Text>
                  <Pressable onPress={() => { setTypeFilter([]); setSortBy('recommended'); }} style={{ marginTop: 8 }}>
                    <Text style={{ ...TextStyles.bodyEm, color: ACCENT }}>Clear filters</Text>
                  </Pressable>
                </View>
              )
            )
          )}

          {/* Card View — swipeable CardStackCarousel */}
          {browseMode === 'cards' && activityPlaces.length > 0 && (
            <CardStackCarousel
              places={activityPlaces}
              initialIndex={0}
              favorites={[]}
              onToggleFav={() => {}}
              onAddToTrip={(place) => {
                const idx = realActivities.findIndex((ra: any) => ra.id === place.id);
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
    </ScrollView>
    </PageTransition>
  );
}
