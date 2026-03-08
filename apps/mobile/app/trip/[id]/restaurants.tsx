import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen,
  useRestaurantFilters,
  RESTAURANT_CATEGORIES,
  RESTAURANT_CATEGORY_ICONS,
  CUISINE_SUBFILTERS,
  RESTAURANT_SORT_OPTIONS,
  TAB_COLORS,
  COLORS,
  hexToRgba,
} from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';

const ACCENT = TAB_COLORS.restaurants;
const NAVY = COLORS.navy;

/* -- Menu highlights mock data (keyed by restaurant id) -------- */
const MENU_HIGHLIGHTS: Record<string, string[]> = {
  rb1: ['Duck Confit', 'Cr\u00e8me Br\u00fbl\u00e9e', 'Steak Tartare', 'Escargot'],
  rb2: ['Tasting Menu (7 courses)', 'Lobster Thermidor', 'Chocolate Souffl\u00e9'],
  rb3: ['Artisan Cheese', 'Charcuterie', 'Cr\u00eapes', 'Wine Pairing'],
  rd1: ['Buckwheat Galette Compl\u00e8te', 'Caramel Beurre Sal\u00e9 Cr\u00eape', 'Artisanal Cider'],
  rd2: ['Wild Strawberry Sorbet', 'Salted Caramel', 'Chocolate Noir', 'Pistachio'],
  rd3: ['Natural Wine Flight', 'Charcuterie Board', 'Comt\u00e9 Cheese'],
  rd4: ['Bordeaux Tasting', 'Champagne Flight', 'Burgundy Pinot Noir'],
  rd5: ['Croissant Making', 'Macaron Workshop', 'Take-home Pastries'],
  rd6: ['Onion Soup Gratin\u00e9e', 'Boeuf Bourguignon', 'Cr\u00e8me Caramel'],
  rd7: ['Pain des Amis', 'Escargot Pastry', 'Pistachio Swirl'],
  rd8: ['Falafel Pita Special', 'Grilled Aubergine', 'Tahini Plate'],
};

const RESTAURANT_HOURS: Record<string, string> = {
  rb1: '12:00 PM \u2013 10:30 PM',
  rb2: '12:00 PM \u2013 1:30 PM, 7:00 PM \u2013 9:30 PM',
  rb3: 'Tours at 10:00 AM & 2:00 PM',
  rd1: '11:30 AM \u2013 11:00 PM',
  rd2: '10:00 AM \u2013 8:00 PM (Wed\u2013Sun)',
  rd3: '5:00 PM \u2013 12:00 AM',
  rd4: 'Sessions at 12:00 PM, 4:00 PM & 7:00 PM',
  rd5: 'Classes at 9:00 AM & 2:00 PM (Mon\u2013Sat)',
  rd6: '11:30 AM \u2013 12:00 AM',
  rd7: '6:45 AM \u2013 8:00 PM (Mon\u2013Fri)',
  rd8: '11:00 AM \u2013 12:00 AM (Closed Sat)',
};

const RESERVATION_INFO: Record<string, string> = {
  rb1: 'Reservation confirmed \u00b7 Party of 2',
  rb2: 'Reservation confirmed \u00b7 Party of 2 \u00b7 Dress code: Smart casual',
  rb3: 'Booking confirmed \u00b7 2 participants',
  rd1: 'Walk-in only \u00b7 Expect 20\u201340 min wait',
  rd3: 'Reservations recommended',
  rd4: 'Online booking required',
  rd5: 'Online booking required \u00b7 Min 2 participants',
  rd6: 'No reservations \u00b7 First come, first served',
};

// -- Rating stars -------------------------------------------------
function RatingStars({ rating, size = 11 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.3;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
      {Array.from({ length: full }).map((_, i) => (
        <FontAwesome key={`f${i}`} name="star" size={size} color="#fbbf24" />
      ))}
      {half && <FontAwesome name="star-half-full" size={size} color="#fbbf24" />}
      {Array.from({ length: empty }).map((_, i) => (
        <FontAwesome key={`e${i}`} name="star-o" size={size} color="#e5e7eb" />
      ))}
    </View>
  );
}

// -- Price level dots ---------------------------------------------
function PriceLevel({ price }: { price: string }) {
  const euroCount = (price.match(/\u20ac/g) || []).length;
  if (euroCount === 0) return <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>{price}</Text>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Text
          key={i}
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: i < euroCount ? NAVY : '#d1d5db',
          }}
        >
          {'\u20ac'}
        </Text>
      ))}
    </View>
  );
}

// -- Expandable restaurant card -----------------------------------
function RestaurantCard({
  item,
  isFavorited,
  onFavorite,
}: {
  item: DiscoverItem;
  isFavorited: boolean;
  onFavorite: (id: string) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasImage = item.images.length > 0 && !imgError;

  const menuHighlights = MENU_HIGHLIGHTS[item.id] || [];
  const hours = RESTAURANT_HOURS[item.id];
  const reservation = RESERVATION_INFO[item.id];

  return (
    <Pressable onPress={() => setExpanded(!expanded)}>
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: item.isBooked ? 2 : 1,
          borderColor: item.isBooked ? NAVY : '#e5e7eb',
        }}
      >
        {/* Image */}
        <View style={{ height: 180, backgroundColor: '#f3f4f6' }}>
          {hasImage ? (
            <Image
              source={{ uri: item.images[0] }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
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
              backgroundColor: 'rgba(0,0,0,0.35)',
            }}
          />

          {/* Favorite button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onFavorite(item.id);
            }}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.95)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FontAwesome
              name={isFavorited ? 'heart' : 'heart-o'}
              size={14}
              color={isFavorited ? '#ef4444' : '#9ca3af'}
            />
          </Pressable>

          {/* Rating badge */}
          <View
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(255,255,255,0.85)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <FontAwesome name="star" size={11} color="#fbbf24" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>{item.rating}</Text>
          </View>

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
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <FontAwesome name="calendar-check-o" size={10} color="#fff" />
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#fff' }}>
                Day {item.bookedDay}{item.mealType ? ` \u00b7 ${item.mealType}` : ''}
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
                backgroundColor: NAVY,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '500', color: '#fff' }}>{item.price}</Text>
            </View>
          )}

          {/* Photo count */}
          {item.images.length > 1 && (
            <View
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: 6,
                paddingVertical: 3,
                borderRadius: 4,
              }}
            >
              <FontAwesome name="camera" size={8} color="rgba(255,255,255,0.9)" />
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)' }}>{item.images.length}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={{ padding: 14 }}>
          {/* Location + distance */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <FontAwesome name="map-marker" size={11} color="#9ca3af" />
              <Text style={{ fontSize: 12, color: '#6b7280' }} numberOfLines={1}>{item.location}</Text>
            </View>
            {item.distance && (
              <Text style={{ fontSize: 10, color: '#9ca3af', marginLeft: 8 }}>{item.distance}</Text>
            )}
          </View>

          {/* Name */}
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 2 }} numberOfLines={1}>
            {item.name}
          </Text>

          {/* Stars + reviews */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <RatingStars rating={item.rating} size={11} />
            {item.reviewCount ? (
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                {item.reviewCount.toLocaleString()} reviews
              </Text>
            ) : null}
          </View>

          {/* Price level / Cuisine / Time / Open */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
            {item.price && <PriceLevel price={item.price} />}
            {item.price && item.cuisine && (
              <Text style={{ fontSize: 12, color: '#d1d5db' }}>{'\u00b7'}</Text>
            )}
            {item.cuisine && (
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.cuisine}</Text>
            )}
            {item.bookedTime && (
              <>
                <Text style={{ fontSize: 12, color: '#d1d5db' }}>{'\u00b7'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <FontAwesome name="clock-o" size={10} color="#9ca3af" />
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>{item.bookedTime}</Text>
                </View>
              </>
            )}
            {item.isOpen !== undefined && (
              <>
                <Text style={{ fontSize: 12, color: '#d1d5db' }}>{'\u00b7'}</Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: item.isOpen ? '#059669' : '#ef4444',
                  }}
                >
                  {item.isOpen ? 'Open Now' : 'Closed'}
                </Text>
              </>
            )}
          </View>

          {/* Description */}
          <Text style={{ fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 8 }} numberOfLines={expanded ? undefined : 2}>
            {item.description}
          </Text>

          {/* Cuisine badge chips */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {item.tags.slice(0, 3).map((tag, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: hexToRgba(NAVY, 0.04),
                  borderWidth: 1,
                  borderColor: hexToRgba(NAVY, 0.12),
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text style={{ fontSize: 11, color: NAVY }}>{tag}</Text>
              </View>
            ))}
            {item.category && (
              <View
                style={{
                  backgroundColor: hexToRgba(ACCENT, 0.08),
                  borderWidth: 1,
                  borderColor: hexToRgba(ACCENT, 0.2),
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '500', color: ACCENT }}>{item.category}</Text>
              </View>
            )}
          </View>

          {/* -- Expandable Details -- */}
          {expanded && (
            <View style={{ marginBottom: 8 }}>
              {/* Menu Highlights */}
              {menuHighlights.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <FontAwesome name="cutlery" size={11} color={NAVY} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>Menu Highlights</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {menuHighlights.map((dish, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: '#fef3c7',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#fde68a',
                        }}
                      >
                        <FontAwesome name="star-o" size={9} color="#d97706" />
                        <Text style={{ fontSize: 11, color: '#92400e', fontWeight: '500' }}>{dish}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Hours */}
              {hours && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    marginBottom: 10,
                  }}
                >
                  <FontAwesome name="clock-o" size={13} color={NAVY} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#1e293b', marginBottom: 2 }}>Hours</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{hours}</Text>
                  </View>
                </View>
              )}

              {/* Reservation Info */}
              {reservation && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: item.isBooked ? '#f0fdf4' : '#eff6ff',
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: item.isBooked ? '#bbf7d0' : '#bfdbfe',
                    marginBottom: 10,
                  }}
                >
                  <FontAwesome
                    name={item.isBooked ? 'check-circle' : 'info-circle'}
                    size={13}
                    color={item.isBooked ? '#16a34a' : '#2563eb'}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: item.isBooked ? '#16a34a' : '#2563eb', marginBottom: 2 }}>
                      Reservations
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{reservation}</Text>
                  </View>
                </View>
              )}

              {/* Deal price */}
              {item.dealPrice && item.originalPrice && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: '#fef2f2',
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#fecaca',
                    marginBottom: 10,
                  }}
                >
                  <FontAwesome name="tag" size={13} color="#dc2626" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#dc2626', marginBottom: 2 }}>Special Deal</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#dc2626' }}>{item.dealPrice}</Text>
                      <Text style={{ fontSize: 12, color: '#9ca3af', textDecorationLine: 'line-through' }}>{item.originalPrice}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Expand indicator */}
          <Pressable
            onPress={() => setExpanded(!expanded)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 2, marginBottom: 6 }}
          >
            <Text style={{ fontSize: 11, color: '#9ca3af' }}>{expanded ? 'Show less' : 'Show details'}</Text>
            <FontAwesome name={expanded ? 'chevron-up' : 'chevron-down'} size={9} color="#9ca3af" />
          </Pressable>

          {/* Action row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: '#f3f4f6',
            }}
          >
            {item.isBooked ? (
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                }}
              >
                <FontAwesome name="times" size={10} color="#9ca3af" />
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#9ca3af' }}>Remove</Text>
              </Pressable>
            ) : (
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: hexToRgba(NAVY, 0.2),
                }}
              >
                <FontAwesome name="plus" size={10} color="#4b5563" />
                <Text style={{ fontSize: 11, fontWeight: '500', color: '#4b5563' }}>Add to Itinerary</Text>
              </Pressable>
            )}

            <View style={{ flex: 1 }} />

            {item.bookingUrl && (
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: '#10b981',
                }}
              >
                <FontAwesome name="external-link" size={10} color="#fff" />
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>
                  {item.bookingLabel || 'Book Now'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// -- Skeleton card ------------------------------------------------
function SkeletonBlock({ width, height, radius = 6, style }: { width: number | string; height: number; radius?: number; style?: any }) {
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: '#e5e7eb' }, style]} />;
}

function SkeletonDiscoverCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
      <View style={{ height: 180, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome name="image" size={28} color="#d1d5db" />
      </View>
      <View style={{ padding: 14 }}>
        <SkeletonBlock width="80%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonBlock width="100%" height={12} style={{ marginBottom: 4 }} />
        <SkeletonBlock width="60%" height={12} />
      </View>
    </View>
  );
}

// -- Empty state --------------------------------------------------
function EmptyFilterState({ onClear }: { onClear: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
      <FontAwesome name="search" size={32} color="#d1d5db" style={{ marginBottom: 12 }} />
      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>No results match your filters</Text>
      <Pressable onPress={onClear}>
        <Text style={{ fontSize: 12, color: ACCENT }}>Clear all filters</Text>
      </Pressable>
    </View>
  );
}

// -- Main screen --------------------------------------------------
export default function RestaurantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoading } = useItineraryScreen(id);

  const {
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    categoryFilter, handleCategoryChange,
    cuisineSubFilter, setCuisineSubFilter,
    sortBy, setSortBy,
    favorites, toggleFavorite,
    sourceItems,
    filteredItems,
    bookedCount,
    discoverCount,
    clearFilters,
  } = useRestaurantFilters();

  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // -- Loading skeleton --
  if (isLoading) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}>
        <SkeletonBlock width="100%" height={42} radius={12} />
        <SkeletonBlock width="100%" height={38} radius={12} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonBlock width={60} height={30} radius={20} />
          <SkeletonBlock width={80} height={30} radius={20} />
          <SkeletonBlock width={60} height={30} radius={20} />
        </View>
        <SkeletonDiscoverCard />
        <SkeletonDiscoverCard />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* -- Segmented Control: Booked / Discover -- */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 3,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
      }}>
        <Pressable
          onPress={() => setViewMode('booked')}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, paddingVertical: 9, borderRadius: 10,
            backgroundColor: viewMode === 'booked' ? NAVY : 'transparent',
          }}
        >
          <FontAwesome name="calendar-check-o" size={12} color={viewMode === 'booked' ? '#fff' : '#6b7280'} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'booked' ? '#fff' : '#6b7280' }}>
            Booked ({bookedCount})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode('discover')}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 6, paddingVertical: 9, borderRadius: 10,
            backgroundColor: viewMode === 'discover' ? NAVY : 'transparent',
          }}
        >
          <FontAwesome name="compass" size={12} color={viewMode === 'discover' ? '#fff' : '#6b7280'} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === 'discover' ? '#fff' : '#6b7280' }}>
            Discover ({discoverCount})
          </Text>
        </Pressable>
      </View>

      {/* -- Search + Sort (same row) -- */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <View style={{ position: 'relative' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 38,
            }}
          >
            <FontAwesome name="search" size={12} color="#9ca3af" style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search restaurants..."
              placeholderTextColor="#9ca3af"
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
              <FontAwesome name="sort-amount-desc" size={11} color={NAVY} />
              <Text style={{ fontSize: 11, color: NAVY, fontWeight: '500' }}>
                {RESTAURANT_SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
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
                minWidth: 140,
                zIndex: 100,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              {RESTAURANT_SORT_OPTIONS.map((opt) => {
                const isActive = sortBy === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => { setSortBy(opt.key); setShowSortDropdown(false); }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      backgroundColor: isActive ? hexToRgba(NAVY, 0.06) : 'transparent',
                    }}
                  >
                    <FontAwesome name={opt.icon as any} size={11} color={isActive ? NAVY : '#9ca3af'} />
                    <Text style={{ fontSize: 12, fontWeight: isActive ? '600' : '400', color: isActive ? NAVY : '#6b7280' }}>
                      {opt.label}
                    </Text>
                    {isActive && <FontAwesome name="check" size={10} color={NAVY} style={{ marginLeft: 'auto' }} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* -- Category pills (compact, icon+label inline) -- */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 6 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}
      >
        {RESTAURANT_CATEGORIES.map((f) => {
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
                borderColor: isActive ? NAVY : '#e5e7eb',
                backgroundColor: isActive ? NAVY : '#fff',
              }}
            >
              <FontAwesome
                name={RESTAURANT_CATEGORY_ICONS[f] as any}
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

      {/* -- Subcategory cuisine pills -- */}
      {categoryFilter !== 'All' && CUISINE_SUBFILTERS[categoryFilter]?.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 6 }}
          contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingVertical: 2 }}
        >
          {CUISINE_SUBFILTERS[categoryFilter].map((sub) => {
            const isAll = sub.startsWith('All ');
            const isActive = isAll ? !cuisineSubFilter : cuisineSubFilter === sub;
            return (
              <Pressable
                key={sub}
                onPress={() => setCuisineSubFilter(isAll ? '' : sub)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 16,
                  borderWidth: 1,
                  backgroundColor: isActive ? hexToRgba(NAVY, 0.1) : '#fff',
                  borderColor: isActive ? hexToRgba(NAVY, 0.3) : '#e5e7eb',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? NAVY : '#6b7280',
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
      <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
        <Text style={{ fontSize: 11, color: '#9ca3af' }}>
          {filteredItems.length} {filteredItems.length === 1 ? 'place' : 'places'} found
        </Text>
      </View>

      {/* -- Card list -- */}
      <View style={{ paddingHorizontal: 16 }}>
        {filteredItems.length > 0 ? (
          <View style={{ gap: 14 }}>
            {filteredItems.map((item) => (
              <RestaurantCard
                key={item.id}
                item={item}
                isFavorited={favorites.includes(item.id)}
                onFavorite={toggleFavorite}
              />
            ))}
          </View>
        ) : (
          <EmptyFilterState onClear={clearFilters} />
        )}
      </View>
    </ScrollView>
  );
}
