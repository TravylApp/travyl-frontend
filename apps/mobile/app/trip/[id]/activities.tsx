import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen,
  useActivityFilters,
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_ICONS,
  ACTIVITY_SUBFILTERS,
  ACTIVITY_SORT_OPTIONS,
  TAB_COLORS,
} from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';

const ACCENT = TAB_COLORS.activities; // #0d9488

// ---- Placeholder colors for cards without images ----
const PLACEHOLDER_COLORS = ['#e0f2fe', '#fef3c7', '#ede9fe', '#ecfdf5', '#fce7f3', '#fff7ed', '#f0fdfa'];
function placeholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

// ---- Rating Stars ----
function RatingStars({ rating, size = 12 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {Array.from({ length: full }).map((_, i) => (
        <FontAwesome key={`f${i}`} name="star" size={size} color="#fbbf24" />
      ))}
      {half && <FontAwesome name="star-half-o" size={size} color="#fbbf24" />}
      {Array.from({ length: empty }).map((_, i) => (
        <FontAwesome key={`e${i}`} name="star-o" size={size} color="#e5e7eb" />
      ))}
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
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasImage = item.images.length > 0 && !imgError;

  return (
    <Pressable onPress={() => setExpanded(!expanded)}>
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: item.isBooked ? 2 : 1,
          borderColor: item.isBooked ? ACCENT : '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        {/* Image Section */}
        <View style={{ height: 180, position: 'relative' }}>
          {hasImage ? (
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
              <FontAwesome name="image" size={32} color="#d1d5db" />
            </View>
          )}

          {/* Gradient overlay */}
          <View
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
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>{item.rating.toFixed(1)}</Text>
            {item.reviewCount != null && (
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>({item.reviewCount.toLocaleString()})</Text>
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
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <FontAwesome
              name={isFavorited ? 'heart' : 'heart-o'}
              size={15}
              color={isFavorited ? '#ef4444' : '#9ca3af'}
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

        {/* Content Section */}
        <View style={{ padding: 14 }}>
          {/* Location + Distance */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <FontAwesome name="map-marker" size={11} color="#9ca3af" />
              <Text style={{ fontSize: 12, color: '#6b7280' }} numberOfLines={1}>{item.location}</Text>
            </View>
            {item.distance && (
              <Text style={{ fontSize: 10, color: '#9ca3af', marginLeft: 8 }}>{item.distance}</Text>
            )}
          </View>

          {/* Title */}
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Stars + Reviews */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <RatingStars rating={item.rating} size={12} />
            {item.reviewCount != null && (
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>{item.reviewCount.toLocaleString()} reviews</Text>
            )}
          </View>

          {/* Price + Open Status Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {item.price && (
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>{item.price}</Text>
            )}
            {item.isOpen !== undefined && (
              <>
                {item.price && <Text style={{ fontSize: 11, color: '#d1d5db' }}>|</Text>}
                <Text style={{ fontSize: 11, fontWeight: '600', color: item.isOpen ? '#059669' : '#ef4444' }}>
                  {item.isOpen ? 'Open Now' : 'Closed'}
                </Text>
              </>
            )}
          </View>

          {/* Description */}
          <Text
            style={{ fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 10 }}
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
                backgroundColor: '#f9fafb',
                borderRadius: 10,
                padding: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#f3f4f6',
              }}
            >
              {item.bookedTime && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <FontAwesome name="clock-o" size={12} color="#6b7280" />
                  <Text style={{ fontSize: 12, color: '#374151' }}>Scheduled: {item.bookedTime}</Text>
                </View>
              )}
              {item.distance && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <FontAwesome name="road" size={12} color="#6b7280" />
                  <Text style={{ fontSize: 12, color: '#374151' }}>Distance: {item.distance}</Text>
                </View>
              )}
              {item.price && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <FontAwesome name="money" size={12} color="#6b7280" />
                  <Text style={{ fontSize: 12, color: '#374151' }}>Price: {item.price}</Text>
                </View>
              )}
              {item.category && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FontAwesome name={(ACTIVITY_CATEGORY_ICONS[item.category] || 'compass') as any} size={12} color="#6b7280" />
                  <Text style={{ fontSize: 12, color: '#374151' }}>Category: {item.category}</Text>
                </View>
              )}
            </View>
          )}

          {/* Expand / Collapse hint */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <FontAwesome name={expanded ? 'chevron-up' : 'chevron-down'} size={10} color="#9ca3af" />
            <Text style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>
              {expanded ? 'Show less' : 'Show more'}
            </Text>
          </View>

          {/* Action Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12 }}>
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

// ---- Skeleton ----
function SkeletonBlock({ width, height, radius = 6, style }: { width: number | string; height: number; radius?: number; style?: any }) {
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: '#e5e7eb' }, style]} />;
}

function SkeletonCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
      <View style={{ height: 180, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome name="image" size={28} color="#d1d5db" />
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

  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // ---- Loading state ----
  if (isLoading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f9fafb' }}
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
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* -- Segmented Control: Booked / Discover -- */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
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
          <FontAwesome name="calendar-check-o" size={12} color={viewMode === 'booked' ? '#fff' : '#6b7280'} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'booked' ? '#fff' : '#6b7280' }}>
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
          <FontAwesome name="compass" size={12} color={viewMode === 'discover' ? '#fff' : '#6b7280'} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'discover' ? '#fff' : '#6b7280' }}>
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
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#e5e7eb',
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 38,
          }}
        >
          <FontAwesome name="search" size={12} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search activities..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, fontSize: 13, color: '#111827', paddingVertical: 0 }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
              <FontAwesome name="times-circle" size={14} color="#9ca3af" />
            </Pressable>
          )}
          <View style={{ width: 1, height: 18, backgroundColor: '#d1d5db', marginHorizontal: 8 }} />
          <Pressable
            onPress={() => setShowSortDropdown(!showSortDropdown)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 }}
          >
            <FontAwesome name="sort-amount-desc" size={11} color={ACCENT} />
            <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '500' }}>
              {ACTIVITY_SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
            </Text>
            <FontAwesome name={showSortDropdown ? 'chevron-up' : 'chevron-down'} size={8} color="#9ca3af" />
          </Pressable>
        </View>

        {/* Sort dropdown (anchored below search bar) */}
        {showSortDropdown && (
          <View
            style={{
              position: 'absolute',
              top: 42,
              right: 0,
              backgroundColor: '#fff',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#e5e7eb',
              paddingVertical: 4,
              minWidth: 160,
              zIndex: 100,
              shadowColor: '#000',
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
                  <Text style={{ fontSize: 12, fontWeight: isActive ? '600' : '400', color: isActive ? ACCENT : '#6b7280' }}>
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
                borderColor: isActive ? ACCENT : '#e5e7eb',
                backgroundColor: isActive ? ACCENT : '#fff',
              }}
            >
              <FontAwesome
                name={ACTIVITY_CATEGORY_ICONS[f] as any}
                size={11}
                color={isActive ? '#fff' : '#6b7280'}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? '#fff' : '#4b5563',
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
                  borderColor: isActive ? ACCENT + '40' : '#e5e7eb',
                  backgroundColor: isActive ? ACCENT + '15' : '#fff',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? ACCENT : '#6b7280',
                  }}
                >
                  {sub}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* -- Results count -- */}
      <View style={{ paddingVertical: 6, paddingHorizontal: 2 }}>
        <Text style={{ fontSize: 11, color: '#9ca3af' }}>
          {filteredItems.length} {filteredItems.length === 1 ? 'activity' : 'activities'} found
        </Text>
      </View>

        {/* ---- Activity Cards ---- */}
        {filteredItems.length > 0 ? (
          <View style={{ gap: 14 }}>
            {filteredItems.map((item) => (
              <ActivityCard
                key={item.id}
                item={item}
                isFavorited={favorites.includes(item.id)}
                onFavorite={toggleFavorite}
                onAddToItinerary={!item.isBooked ? () => {} : undefined}
              />
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
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 }}>
              No results found
            </Text>
            <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
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
    </ScrollView>
  );
}
