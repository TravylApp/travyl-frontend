import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, MOCK_DISCOVER_ACTIVITIES, MOCK_DISCOVER_RESTAURANTS } from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PageTransition, useTabAccent } from './_layout';

/* ─── Constants ─────────────────────────────────────────────── */

// Pre-populate some sample favorites for demo
const INITIAL_ACTIVITY_FAVORITES = ['da1', 'da3', 'da6'];
const INITIAL_RESTAURANT_FAVORITES = ['rb2', 'rd1', 'rd4'];
const INITIAL_DESTINATION_FAVORITES = ['da2', 'da5', 'da8'];

// Category config with icons
const CATEGORIES = [
  { key: 'All', icon: 'th-large' },
  { key: 'Activities', icon: 'camera' },
  { key: 'Restaurants', icon: 'cutlery' },
  { key: 'Destinations', icon: 'compass' },
  { key: 'Hotels', icon: 'building' },
] as const;

type CategoryFilter = (typeof CATEGORIES)[number]['key'];

/* ─── Section Header ────────────────────────────────────────── */

function SectionHeader({
  icon,
  title,
  count,
  accentColor,
  collapsed,
  onToggle,
}: {
  icon: string;
  title: string;
  count: number;
  accentColor: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: collapsed ? 0 : 16,
        paddingBottom: collapsed ? 0 : 12,
        borderBottomWidth: collapsed ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: accentColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesome name={icon as any} size={20} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{count} saved</Text>
      </View>
      <FontAwesome
        name={collapsed ? 'chevron-right' : 'chevron-down'}
        size={14}
        color={colors.textTertiary}
      />
    </Pressable>
  );
}

/* ─── Favorite Card ─────────────────────────────────────────── */

function FavoriteCard({
  item,
  accentColor,
  categoryLabel,
  onRemove,
}: {
  item: DiscoverItem;
  accentColor: string;
  categoryLabel: string;
  onRemove: (id: string) => void;
}) {
  const colors = useThemeColors();
  const [imgError, setImgError] = useState(false);
  const hasImage = item.images.length > 0 && !imgError;

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      {/* Remove Button */}
      <Pressable
        onPress={() => onRemove(item.id)}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.95)',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          elevation: 3,
        }}
      >
        <FontAwesome name="heart" size={14} color="#ef4444" />
      </Pressable>

      {/* Image */}
      <View style={{ height: 160, backgroundColor: colors.borderLight }}>
        {hasImage ? (
          <Image
            source={{ uri: item.images[0] }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome name="image" size={28} color={colors.border} />
          </View>
        )}

        {/* Gradient overlay */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 70,
            backgroundColor: 'rgba(0,0,0,0.30)',
          }}
        />

        {/* Rating Badge */}
        {item.rating != null && (
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(255,255,255,0.85)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
            }}
          >
            <FontAwesome name="star" size={10} color="#fbbf24" />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
              {item.rating.toFixed(1)}
            </Text>
          </View>
        )}

        {/* Price Badge */}
        {item.price != null && (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              backgroundColor: accentColor,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '500', color: '#fff' }}>{item.price}</Text>
          </View>
        )}

        {/* Category Badge */}
        <View
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: 'rgba(255,255,255,0.9)',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: '600', color: accentColor }}>{categoryLabel}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={{ padding: 14 }}>
        {/* Location */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <FontAwesome name="map-marker" size={10} color={colors.textTertiary} />
          <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        {/* Name */}
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }} numberOfLines={1}>
          {item.name}
        </Text>

        {/* Description */}
        <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 }} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Tags */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {item.tags.slice(0, 3).map((tag, i) => (
            <View
              key={i}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 999,
                backgroundColor: accentColor + '0a',
                borderWidth: 1,
                borderColor: accentColor + '20',
              }}
            >
              <Text style={{ fontSize: 10, color: accentColor }}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ─── Empty State ───────────────────────────────────────────── */

function EmptyState() {
  const ACCENT = useTabAccent('favorites');
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#ef444415',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <FontAwesome name="heart" size={24} color="#ef4444" />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
        No favorites yet
      </Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
        Save your favorite activities, restaurants, and places to quickly find them later.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FontAwesome name="camera" size={16} color={ACCENT} />
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>Activities</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FontAwesome name="cutlery" size={16} color={ACCENT} />
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>Restaurants</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FontAwesome name="building" size={16} color={ACCENT} />
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>Hotels</Text>
        </View>
      </View>
    </View>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────── */

function SkeletonCard() {
  const colors = useThemeColors();
  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ height: 140, backgroundColor: colors.borderLight }} />
      <View style={{ padding: 14 }}>
        <View style={{ width: '70%', height: 14, borderRadius: 6, backgroundColor: colors.skeleton, marginBottom: 8 }} />
        <View style={{ width: '55%', height: 10, borderRadius: 6, backgroundColor: colors.skeleton }} />
      </View>
    </View>
  );
}

function FavoritesSkeleton() {
  const colors = useThemeColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      {/* Filter chip skeletons */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[70, 90, 100, 85, 65].map((w, i) => (
          <View key={i} style={{ width: w, height: 36, borderRadius: 18, backgroundColor: colors.skeleton }} />
        ))}
      </View>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </ScrollView>
  );
}

/* ─── Main Screen ───────────────────────────────────────────── */

export default function FavoritesScreen() {
  const ACCENT = useTabAccent('favorites');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoading } = useItineraryScreen(id);

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('All');
  const [activityFavorites, setActivityFavorites] = useState<string[]>(INITIAL_ACTIVITY_FAVORITES);
  const [restaurantFavorites, setRestaurantFavorites] = useState<string[]>(INITIAL_RESTAURANT_FAVORITES);
  const [destinationFavorites, setDestinationFavorites] = useState<string[]>(INITIAL_DESTINATION_FAVORITES);
  const colors = useThemeColors();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const favoritedActivities = MOCK_DISCOVER_ACTIVITIES.filter((a) => activityFavorites.includes(a.id));
  const favoritedRestaurants = MOCK_DISCOVER_RESTAURANTS.filter((r) => restaurantFavorites.includes(r.id));
  const favoritedDestinations = MOCK_DISCOVER_ACTIVITIES.filter((a) => destinationFavorites.includes(a.id));

  const totalFavorites = favoritedActivities.length + favoritedRestaurants.length + favoritedDestinations.length;

  const removeActivityFavorite = (itemId: string) => {
    setActivityFavorites((prev) => prev.filter((f) => f !== itemId));
  };

  const removeRestaurantFavorite = (itemId: string) => {
    setRestaurantFavorites((prev) => prev.filter((f) => f !== itemId));
  };

  const removeDestinationFavorite = (itemId: string) => {
    setDestinationFavorites((prev) => prev.filter((f) => f !== itemId));
  };

  // Counts per category for filter chips
  const categoryCounts: Record<CategoryFilter, number> = useMemo(
    () => ({
      All: totalFavorites,
      Activities: favoritedActivities.length,
      Restaurants: favoritedRestaurants.length,
      Destinations: favoritedDestinations.length,
      Hotels: 0,
    }),
    [totalFavorites, favoritedActivities.length, favoritedRestaurants.length, favoritedDestinations.length],
  );

  // Determine which sections to show based on filter
  const showActivities =
    (activeFilter === 'All' || activeFilter === 'Activities') && favoritedActivities.length > 0;
  const showRestaurants =
    (activeFilter === 'All' || activeFilter === 'Restaurants') && favoritedRestaurants.length > 0;
  const showDestinations =
    (activeFilter === 'All' || activeFilter === 'Destinations') && favoritedDestinations.length > 0;
  const showHotels = activeFilter === 'All' || activeFilter === 'Hotels';

  // Check if filter yields no results
  const filteredTotal =
    (showActivities ? favoritedActivities.length : 0) +
    (showRestaurants ? favoritedRestaurants.length : 0) +
    (showDestinations ? favoritedDestinations.length : 0);

  if (isLoading) return <PageTransition><FavoritesSkeleton /></PageTransition>;

  if (totalFavorites === 0) return <PageTransition><EmptyState /></PageTransition>;

  return (
    <PageTransition>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: ACCENT,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <FontAwesome name="heart" size={24} color="#fff" />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
          Your Favorites
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>
          {totalFavorites} saved items across all categories
        </Text>
      </View>

      {/* ─── Filter Chips ────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 18 }}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeFilter === cat.key;
          const count = categoryCounts[cat.key];
          return (
            <Pressable
              key={cat.key}
              onPress={() => setActiveFilter(cat.key)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: isActive ? ACCENT : colors.border,
                backgroundColor: isActive ? ACCENT : colors.cardBackground,
              }}
            >
              <FontAwesome
                name={cat.icon as any}
                size={12}
                color={isActive ? '#fff' : colors.textSecondary}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? '#fff' : colors.textSecondary,
                }}
              >
                {cat.key}
              </Text>
              <View
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.borderLight,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: isActive ? '#fff' : colors.textTertiary,
                  }}
                >
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ─── No Results for Filter ───────────────────────────── */}
      {filteredTotal === 0 && activeFilter !== 'All' && activeFilter !== 'Hotels' && (
        <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.borderLight,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <FontAwesome name="heart-o" size={20} color={colors.textTertiary} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
            No {activeFilter.toLowerCase()} favorited
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            Browse the {activeFilter} tab to discover and save items.
          </Text>
        </View>
      )}

      {/* ─── Activities Section ──────────────────────────────── */}
      {showActivities && (
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.borderLight,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <SectionHeader
            icon="camera"
            title="Activities & Attractions"
            count={favoritedActivities.length}
            accentColor={ACCENT}
            collapsed={!!collapsedSections['activities']}
            onToggle={() => toggleSection('activities')}
          />
          {!collapsedSections['activities'] && (
            <View style={{ gap: 10, marginTop: 8 }}>
              {favoritedActivities.map((item) => (
                <FavoriteCard
                  key={item.id}
                  item={item}
                  accentColor={ACCENT}
                  categoryLabel="Activity"
                  onRemove={removeActivityFavorite}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* ─── Restaurants Section ─────────────────────────────── */}
      {showRestaurants && (
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.borderLight,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <SectionHeader
            icon="cutlery"
            title="Restaurants & Dining"
            count={favoritedRestaurants.length}
            accentColor={ACCENT}
            collapsed={!!collapsedSections['restaurants']}
            onToggle={() => toggleSection('restaurants')}
          />
          {!collapsedSections['restaurants'] && (
            <View style={{ gap: 10, marginTop: 8 }}>
              {favoritedRestaurants.map((item) => (
                <FavoriteCard
                  key={item.id}
                  item={item}
                  accentColor={ACCENT}
                  categoryLabel="Restaurant"
                  onRemove={removeRestaurantFavorite}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* ─── Saved Destinations Section ──────────────────────── */}
      {showDestinations && (
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.borderLight,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <SectionHeader
            icon="compass"
            title="Saved Destinations"
            count={favoritedDestinations.length}
            accentColor={ACCENT}
            collapsed={!!collapsedSections['destinations']}
            onToggle={() => toggleSection('destinations')}
          />
          {!collapsedSections['destinations'] && (
            <View style={{ gap: 10, marginTop: 8 }}>
              {favoritedDestinations.map((item) => (
                <FavoriteCard
                  key={item.id}
                  item={item}
                  accentColor={ACCENT}
                  categoryLabel="Destination"
                  onRemove={removeDestinationFavorite}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* ─── Hotels Section Placeholder ──────────────────────── */}
      {showHotels && (
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.borderLight,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <SectionHeader
            icon="building"
            title="Hotels & Accommodations"
            count={0}
            accentColor={ACCENT}
            collapsed={!!collapsedSections['hotels']}
            onToggle={() => toggleSection('hotels')}
          />
          {!collapsedSections['hotels'] && (
            <View style={{ gap: 10, marginTop: 8 }}>
              <View style={{ alignItems: 'center', paddingVertical: 28 }}>
                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                  Hotel favorites will appear here when you heart items in the Hotels tab
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
    </PageTransition>
  );
}
