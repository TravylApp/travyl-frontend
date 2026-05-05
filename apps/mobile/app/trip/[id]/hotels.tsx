import { useState, useMemo, useEffect, useContext, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Image, Linking, Platform, TextInput, Keyboard, ActivityIndicator, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { PageTransition, useTabAccent, TabCtx } from './_layout';
// Conditional react-native-maps — try the require, fall back to View if
// the native module isn't bundled (e.g. Expo Go). Don't gate on
// Constants.appOwnership: it's deprecated and returns null in custom dev
// clients on newer SDKs, which would skip the require entirely.
let MapView: any = View;
let Marker: any = View;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch {}
}
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
import type { PlaceItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TextStyles, FontFamily, useItineraryScreen, useHotelSearch, upscaleGoogleImage, getWebApiBase, supabase } from '@travyl/shared';


/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RoomType {
  type: string;
  beds: string;
  guests: number;
  size: string;
  price: number;
  image: string;
  amenities: string[];
}

interface GuestRatings {
  overall: number;
  label: string;
  cleanliness: number;
  staff: number;
  location: number;
  comfort: number;
  value: number;
}

interface HotelData {
  id: string;
  name: string;
  stars: number;
  rating: number;
  reviews: number;
  price: number;
  address: string;
  neighborhood: string;
  images: string[];
  amenities: string[];
  amenityCategories: { category: string; items: { name: string; icon: string }[] }[];
  roomTypes: RoomType[];
  checkIn: string;
  checkOut: string;
  cancellation: string;
  phone: string;
  bookingLink: string;
  guestRatings: GuestRatings;
  /** Free-text "About this hotel" — populated from SerpAPI/Booking when available. */
  description?: string;
  /** Lodging category (Hotel, Resort, Boutique, Hostel, etc.) — pulled from API tags. */
  category?: string;
  /** Optional opening / front-desk hours summary. */
  hours?: string;
  /** Walking-distance landmarks summary. */
  nearby?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

// Legacy mock data removed — hotels now come from trip_context + live search only

const FILTER_AMENITIES = ['WiFi', 'Breakfast', 'Pool', 'Parking', 'Gym', 'Spa'];
const HOTEL_BRANDS = ['Accor', 'Marriott', 'Hilton', 'IHG', 'Best Western'];
const SORT_OPTIONS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price-low', label: 'Price: Low to High' },
  { key: 'price-high', label: 'Price: High to Low' },
  { key: 'rating', label: 'Highest Rated' },
  { key: 'stars', label: 'Most Stars' },
];
const AMENITY_ICONS: Record<string, string> = {
  WiFi: 'wifi', Breakfast: 'coffee', Pool: 'tint',
  Parking: 'car', Gym: 'heartbeat', Spa: 'diamond',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ratingColor(r: number, accent = '#60a5fa'): string {
  if (r >= 9) return '#10b981';
  if (r >= 8) return accent;
  return '#f97316';
}

function generateConfirmation(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TRV-';
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
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
  const ACCENT = useTabAccent('hotels');
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

function StarRow({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <FontAwesome key={i} name="star" size={11} color="#fbbf24" />
      ))}
    </View>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  const ACCENT = useTabAccent('hotels');
  return (
    <View style={{ backgroundColor: ratingColor(rating, ACCENT), paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }}>
      <Text style={{ ...TextStyles.bodyEm, color: '#fff' }}>{rating}</Text>
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
      <Image source={{ uri: images[idx], headers: { Referer: '' } }} style={{ width: '100%', height: '100%' }} resizeMode="cover" defaultSource={require('@/assets/images/icon.png')} />
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
/*  Room Selection Section                                             */
/* ------------------------------------------------------------------ */

function RoomSelection({
  rooms,
  selectedRoom,
  onSelect,
}: {
  rooms: RoomType[];
  selectedRoom: number;
  onSelect: (i: number) => void;
}) {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Room Selection"
        icon="bed"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={rooms[selectedRoom].type}
      />
      {isOpen && (
        <View style={{ gap: 8 }}>
          {rooms.map((room, i) => {
            const isSelected = selectedRoom === i;
            return (
              <Pressable
                key={i}
                onPress={() => onSelect(i)}
                style={{
                  flexDirection: 'row',
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: isSelected ? ACCENT : colors.border,
                  backgroundColor: isSelected ? ACCENT + '08' : colors.cardBackground,
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={{ uri: room.image, headers: { Referer: '' } }}
                  style={{ width: 80, height: 90 }}
                  resizeMode="cover"
                />
                <View style={{ flex: 1, padding: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Text style={{ ...TextStyles.bodyEm, color: isSelected ? ACCENT : colors.text }}>
                        {room.type}
                      </Text>
                      {isSelected && (
                        <View style={{ backgroundColor: ACCENT, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ ...TextStyles.xs, color: '#fff' }}>Selected</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ ...TextStyles.bodyXlEm, color: isSelected ? ACCENT : colors.text }}>
                        ${room.price}
                      </Text>
                      <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>per night</Text>
                    </View>
                  </View>
                  <Text style={{ ...TextStyles.sm, color: colors.textSecondary, marginTop: 2 }}>{room.beds}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <FontAwesome name="users" size={9} color={colors.textTertiary} />
                      <Text style={{ ...TextStyles.sm, color: colors.textSecondary }}>{room.guests}</Text>
                    </View>
                    <Text style={{ ...TextStyles.sm, color: colors.textSecondary }}>{room.size}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Price Breakdown Section                                            */
/* ------------------------------------------------------------------ */

function PricingSummary({ room, pricePerNight, nights }: { room: RoomType; pricePerNight: number; nights: number }) {
  const colors = useThemeColors();
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const subtotal = pricePerNight * nights;
  // Estimated taxes & fees — actual amounts vary by property and jurisdiction
  const EST_CITY_TAX_PER_PERSON_PER_NIGHT = 3.5;
  const EST_GUESTS = 2;
  const EST_SERVICE_FEE = 12;
  const EST_VAT_RATE = 0.1;
  const cityTax = EST_CITY_TAX_PER_PERSON_PER_NIGHT * EST_GUESTS * nights;
  const serviceFee = EST_SERVICE_FEE;
  const vat = subtotal * EST_VAT_RATE;
  const total = subtotal + cityTax + serviceFee + vat;

  return (
    <View style={{ marginTop: 14 }}>
      <Pressable
        onPress={() => setBreakdownOpen(!breakdownOpen)}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 10,
          padding: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FontAwesome name="calculator" size={14} color={colors.tint} />
            <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>
              Total Cost ({nights} night{nights !== 1 ? 's' : ''})
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ ...TextStyles.subhead, color: colors.tint }}>${total.toFixed(0)}</Text>
            <FontAwesome name={breakdownOpen ? 'chevron-up' : 'chevron-down'} size={10} color={colors.textTertiary} />
          </View>
        </View>

        {breakdownOpen && (
          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={{ height: 1, backgroundColor: colors.borderLight }} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>Nightly Rate</Text>
              <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>${pricePerNight}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>Subtotal ({nights} nights)</Text>
              <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>Taxes (est.)</Text>
              <Text style={{ ...TextStyles.body, color: colors.text }}>${(cityTax + vat).toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>Service Fee (est.)</Text>
              <Text style={{ ...TextStyles.body, color: colors.text }}>${serviceFee.toFixed(2)}</Text>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginTop: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ ...TextStyles.bodyXlEm, color: colors.text }}>Total</Text>
              <Text style={{ ...TextStyles.subhead, color: colors.tint }}>${total.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact & Location                                                 */
/* ------------------------------------------------------------------ */

function ContactActions({ phone, bookingLink, address }: { phone: string; bookingLink: string; address: string }) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('hotels');
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginBottom: 10 }}>Contact & Location</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {!!phone && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${phone}`)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: colors.successBg, borderRadius: 10, paddingVertical: 12,
              borderWidth: 1, borderColor: colors.success,
            }}
          >
            <FontAwesome name="phone" size={14} color={colors.success} />
            <Text style={{ ...TextStyles.bodyEm, color: colors.success }}>Call</Text>
          </Pressable>
        )}
        {!!bookingLink && (
          <Pressable
            onPress={() => Linking.openURL(bookingLink.startsWith('http') ? bookingLink : `https://www.google.com/search?q=${encodeURIComponent(bookingLink)}`)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: ACCENT + '10', borderRadius: 10, paddingVertical: 12,
              borderWidth: 1, borderColor: ACCENT + '25',
            }}
          >
            <FontAwesome name="external-link" size={13} color={ACCENT} />
            <Text style={{ ...TextStyles.bodyEm, color: ACCENT }}>Website</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: colors.warningBg, borderRadius: 10, paddingVertical: 12,
            borderWidth: 1, borderColor: colors.warning,
          }}
        >
          <FontAwesome name="map-marker" size={14} color={colors.warning} />
          <Text style={{ ...TextStyles.bodyEm, color: colors.warning }}>Map</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Guest Ratings Section                                              */
/* ------------------------------------------------------------------ */

function GuestRatingsSection({ ratings, reviews }: { ratings: GuestRatings; reviews: number }) {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);

  const subscores: { label: string; value: number }[] = [
    { label: 'Cleanliness', value: ratings.cleanliness },
    { label: 'Staff', value: ratings.staff },
    { label: 'Location', value: ratings.location },
    { label: 'Comfort', value: ratings.comfort },
    { label: 'Value', value: ratings.value },
  ].filter(s => s.value > 0); // Only show real sub-ratings

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Guest Ratings"
        icon="star-half-full"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={`${ratings.overall}${ratings.label ? ` ${ratings.label}` : ''}`}
      />
      {isOpen && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          {/* Overall score */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: subscores.length > 0 ? 16 : 0 }}>
            <View
              style={{
                width: 48, height: 48, borderRadius: 12,
                backgroundColor: ratingColor(ratings.overall, ACCENT),
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ ...TextStyles.title, color: '#fff' }}>{ratings.overall}</Text>
            </View>
            <View>
              {!!ratings.label && <Text style={{ ...TextStyles.subhead, color: colors.text }}>{ratings.label}</Text>}
              {reviews > 0 && <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>{reviews.toLocaleString()} reviews</Text>}
            </View>
          </View>

          {/* Sub-scores with progress bars — only shown if real data exists */}
          {subscores.length > 0 && (
            <View style={{ gap: 10 }}>
              {subscores.map((s) => (
                <View key={s.label}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>{s.label}</Text>
                    <Text style={{ ...TextStyles.bodyEm, color: ACCENT }}>{s.value}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: colors.borderLight, borderRadius: 3 }}>
                    <View
                      style={{
                        height: 6, borderRadius: 3,
                        backgroundColor: ratingColor(s.value, ACCENT),
                        width: `${(s.value / 10) * 100}%`,
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Amenities Section                                                  */
/* ------------------------------------------------------------------ */

function AmenitiesSection({ categories }: { categories: HotelData['amenityCategories'] }) {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Amenities"
        icon="list-ul"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={`${categories.reduce((n, c) => n + c.items.length, 0)} amenities`}
      />
      {isOpen && (
        <View style={{ gap: 14 }}>
          {categories.map((cat) => (
            <View key={cat.category}>
              <Text style={{ ...TextStyles.captionEm, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                {cat.category}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {cat.items.map((item) => (
                  <View
                    key={item.name}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: colors.surface, borderRadius: 8,
                      paddingHorizontal: 10, paddingVertical: 7,
                      borderWidth: 1, borderColor: colors.border,
                    }}
                  >
                    <FontAwesome name={item.icon as any} size={11} color={ACCENT} />
                    <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>{item.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Other Hotel Compact Card                                           */
/* ------------------------------------------------------------------ */

function OtherHotelCard({ hotel, onPress }: { hotel: { id: string; name: string; stars: number; rating: number; label?: string; reviews: number; price: number; neighborhood: string; image: string }; onPress?: () => void }) {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 12,
        borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 10,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {hotel.image ? (
        <Image source={{ uri: hotel.image, headers: { Referer: '' } }} style={{ width: 90, height: 100 }} resizeMode="cover" onError={() => {}} />
      ) : (
        <View style={{ width: 90, height: 100, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name="building" size={24} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }} numberOfLines={1}>{hotel.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              {hotel.stars > 0 && <StarRow count={hotel.stars} />}
              {hotel.rating > 0 && <RatingBadge rating={hotel.rating} />}
            </View>
          </View>
          {hotel.price > 0 ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ ...TextStyles.bodyXlEm, color: ACCENT }}>${hotel.price}</Text>
              <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>per night</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ ...TextStyles.captionEm, color: colors.textTertiary }}>Rates vary</Text>
              <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>tap to view</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Hotel Filter Bar                                                   */
/* ------------------------------------------------------------------ */

function HotelFilterBar({
  showFilters,
  setShowFilters,
  sortBy,
  setSortBy,
  starFilter,
  setStarFilter,
  amenityFilter,
  setAmenityFilter,
  brandFilter,
  setBrandFilter,
}: {
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  starFilter: number[];
  setStarFilter: (v: number[]) => void;
  amenityFilter: string[];
  setAmenityFilter: (v: string[]) => void;
  brandFilter: string[];
  setBrandFilter: (v: string[]) => void;
}) {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  const activeCount = starFilter.length + amenityFilter.length + brandFilter.length;

  const toggleStar = (s: number) =>
    setStarFilter(starFilter.includes(s) ? starFilter.filter((x) => x !== s) : [...starFilter, s]);
  const toggleAmenity = (a: string) =>
    setAmenityFilter(amenityFilter.includes(a) ? amenityFilter.filter((x) => x !== a) : [...amenityFilter, a]);
  const toggleBrand = (b: string) =>
    setBrandFilter(brandFilter.includes(b) ? brandFilter.filter((x) => x !== b) : [...brandFilter, b]);
  const resetAll = () => { setStarFilter([]); setAmenityFilter([]); setBrandFilter([]); setSortBy('recommended'); };

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
          {/* Star rating */}
          <Text style={{ ...TextStyles.captionEm, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Star Rating
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[3, 4, 5].map((s) => {
              const active = starFilter.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => toggleStar(s)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: active ? ACCENT + '15' : colors.cardBackground,
                    borderWidth: 1, borderColor: active ? ACCENT : colors.border,
                  }}
                >
                  <Text style={{ ...TextStyles.bodyEm, color: active ? ACCENT : colors.textSecondary }}>{s}</Text>
                  <FontAwesome name="star" size={10} color={active ? '#fbbf24' : colors.border} />
                </Pressable>
              );
            })}
          </View>

          {/* Amenities */}
          <Text style={{ ...TextStyles.captionEm, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Amenities
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {FILTER_AMENITIES.map((a) => {
              const active = amenityFilter.includes(a);
              return (
                <Pressable
                  key={a}
                  onPress={() => toggleAmenity(a)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: active ? ACCENT + '15' : colors.cardBackground,
                    borderWidth: 1, borderColor: active ? ACCENT : colors.border,
                  }}
                >
                  <FontAwesome name={AMENITY_ICONS[a] as any} size={11} color={active ? ACCENT : colors.textTertiary} />
                  <Text style={{ ...TextStyles.caption, color: active ? ACCENT : colors.textSecondary }}>{a}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Brands */}
          <Text style={{ ...TextStyles.captionEm, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Brand
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {HOTEL_BRANDS.map((b) => {
              const active = brandFilter.includes(b);
              return (
                <Pressable
                  key={b}
                  onPress={() => toggleBrand(b)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                    backgroundColor: active ? ACCENT + '15' : colors.cardBackground,
                    borderWidth: 1, borderColor: active ? ACCENT : colors.border,
                  }}
                >
                  <Text style={{ ...TextStyles.caption, color: active ? ACCENT : colors.textSecondary }}>{b}</Text>
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
/*  Browse Hotel Card                                                  */
/* ------------------------------------------------------------------ */

function BrowseHotelCard({ hotel, onPress, isSelected, isBooked }: { hotel: { id: string; name: string; stars: number; rating: number; reviews: number; price: number; neighborhood: string; image: string; amenities?: string[]; brand?: string; label?: string }; onPress?: () => void; isSelected?: boolean; isBooked?: boolean }) {
  const colors = useThemeColors();
  const AMENITY_MAP: Record<string, string> = { 'Free WiFi': 'wifi', WiFi: 'wifi', Pool: 'tint', 'Swimming Pool': 'tint', Gym: 'heartbeat', Spa: 'diamond', Breakfast: 'coffee', Parking: 'car', Restaurant: 'cutlery', 'Air Conditioning': 'snowflake-o', 'Room Service': 'building' };
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.cardBackground, borderRadius: 14, overflow: 'hidden', marginBottom: 14,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? colors.info : isBooked ? 'rgba(30,58,95,0.3)' : colors.border,
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {/* Selected/Booked indicator */}
      {(isSelected || isBooked) && (
        <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, backgroundColor: isBooked ? colors.tint : colors.info, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>{isBooked ? 'Booked' : 'Viewing'}</Text>
        </View>
      )}

      {/* Image */}
      {hotel.image ? (
        <Image source={{ uri: hotel.image, headers: { Referer: '' } }} style={{ width: '100%', height: 170 }} resizeMode="cover" onError={() => {}} />
      ) : (
        <View style={{ width: '100%', height: 110, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name="building" size={28} color="rgba(255,255,255,0.3)" />
        </View>
      )}

      {/* Info */}
      <View style={{ padding: 14 }}>
        {/* Name */}
        <Text style={{ ...TextStyles.bodyLgEm, fontFamily: FontFamily.serif, color: colors.text }} numberOfLines={1}>{hotel.name}</Text>

        {/* Badges row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {hotel.rating > 0 && (
            <View style={{ backgroundColor: colors.infoBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <FontAwesome name="star" size={9} color={colors.info} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.info }}>{hotel.rating}/5{hotel.reviews > 0 ? ` (${hotel.reviews})` : ''}</Text>
            </View>
          )}
          {hotel.stars > 0 && <Text style={{ fontSize: 10, color: colors.textTertiary }}>{hotel.stars}-Star</Text>}
        </View>

        {/* Address */}
        {!!hotel.neighborhood && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            <FontAwesome name="map-marker" size={10} color={colors.textTertiary} />
            <Text style={{ fontSize: 11, color: colors.textTertiary, flex: 1 }} numberOfLines={1}>{hotel.neighborhood}</Text>
          </View>
        )}

        {/* Amenities with icons */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
            {hotel.amenities.slice(0, 5).map((a) => (
              <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name={(AMENITY_MAP[a] || 'check') as any} size={10} color={colors.tint} />
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{a}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Price row — always rendered. Live rates aren't always
            available (older trips, off-the-grid hotels), so we surface
            "Rates vary" rather than silently dropping the row. */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
          {hotel.price > 0 ? (
            <>
              <Text style={{ ...TextStyles.title, color: colors.text }}>${hotel.price}</Text>
              <Text style={{ fontSize: 10, color: colors.textTertiary, marginLeft: 6 }}>/night</Text>
            </>
          ) : (
            <Text style={{ ...TextStyles.bodyEm, color: colors.textSecondary }}>Rates vary — tap for details</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/*  Hotel Policies Section — only shown when real policy data exists   */
/* ------------------------------------------------------------------ */

// Removed: previously displayed hardcoded fake policies.
// Will be re-added when hotel API returns actual policy data
// (check-in/out times, cancellation, pets, smoking, etc.).

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Hotel List Card — matches Figma "Other Hotels" card exactly        */
/* ------------------------------------------------------------------ */

function HotelListCard({ hotel, nights, onPress }: { hotel: any; nights: number; onPress: () => void }) {
  const colors = useThemeColors();
  const [imgIdx, setImgIdx] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const images: string[] = [];
  if (hotel.images) images.push(...hotel.images);
  if (hotel.image && !images.includes(hotel.image)) images.push(hotel.image);
  const hasMultiple = images.length > 1;
  const total = hotel.price * nights;
  const AMENITY_MAP: Record<string, string> = { 'Free WiFi': 'wifi', WiFi: 'wifi', Pool: 'tint', Gym: 'heartbeat', Spa: 'diamond', Breakfast: 'coffee', Parking: 'car', Restaurant: 'cutlery', 'Air Conditioning': 'snowflake-o', AC: 'snowflake-o', '24/7 Desk': 'clock-o', 'Room Service': 'building', 'Swimming Pool': 'tint', Sauna: 'fire', 'Pet-friendly': 'paw', 'Public bath': 'bath', Bar: 'glass', 'Kid-friendly': 'child', Kitchen: 'cutlery', Accessible: 'wheelchair' };
  const address = hotel.address || hotel.neighborhood || '';

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
        {/* ── Image ── */}
        <View style={{ height: 200, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' }}>
          {images.length > 0 ? (
            <Image source={{ uri: images[imgIdx], headers: { Referer: '' } }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => {}} />
          ) : (
            <View style={{ flex: 1, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name="building" size={36} color="rgba(255,255,255,0.25)" />
            </View>
          )}
          {/* Counter — bottom left */}
          {images.length > 0 && (
            <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>{imgIdx + 1}/{images.length}</Text>
            </View>
          )}
          {/* Arrows — only when multiple images */}
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
        </View>

        {/* ── Content ── */}
        <View style={{ padding: 20, paddingTop: 16 }}>
          {/* Name */}
          <Text style={{ fontSize: 18, fontFamily: FontFamily.sansBold, color: colors.text, lineHeight: 24 }} numberOfLines={2}>{hotel.name}</Text>

          {/* Rating row — tappable to toggle reviews */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (!hotel.reviews) return;
              if (showReviews) { setShowReviews(false); return; }
              setShowReviews(true);
              if (reviews.length > 0) return;
              setLoadingReviews(true);
              const base = getWebApiBase();
              fetch(`${base}/api/hotels/reviews?name=${encodeURIComponent(hotel.name)}&location=${encodeURIComponent(address)}`)
                .then(r => r.ok ? r.json() : { reviews: [] })
                .then(d => { setReviews(d.reviews ?? []); setLoadingReviews(false); })
                .catch(() => setLoadingReviews(false));
            }}
            style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}
          >
            {hotel.rating > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="star" size={12} color="#f59e0b" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.info }}>{hotel.rating}/5</Text>
                {hotel.reviews > 0 && <Text style={{ fontSize: 12, color: colors.textSecondary }}>({hotel.reviews})</Text>}
              </View>
            )}
            {hotel.stars > 0 && <Text style={{ fontSize: 12, color: colors.textSecondary }}>{hotel.stars}-Star</Text>}
          </Pressable>

          {/* Address */}
          {!!address && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <FontAwesome name="map-marker" size={12} color={colors.textTertiary} />
              <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>{address}</Text>
            </View>
          )}

          {/* Amenities */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 }}>
              {hotel.amenities.slice(0, 5).map((a: string) => (
                <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <FontAwesome name={(AMENITY_MAP[a] || 'check') as any} size={12} color={colors.tint} />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{a}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Check-in/out */}
          {(!!hotel.checkIn || !!hotel.checkOut) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
              <FontAwesome name="clock-o" size={11} color={colors.textTertiary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {hotel.checkIn ? `Check-in: ${hotel.checkIn}` : ''}{hotel.checkIn && hotel.checkOut ? ` ${'\u00B7'} ` : ''}{hotel.checkOut ? `Check-out: ${hotel.checkOut}` : ''}
              </Text>
            </View>
          )}

          {/* Price — always rendered. Live rates aren't always
              available (older trips, third-party listings); surface a
              graceful fallback rather than silently dropping the row. */}
          {hotel.price <= 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 18, fontFamily: FontFamily.sansBold, color: colors.text }}>Rates not available</Text>
              <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2 }}>
                {hotel.link ? 'Tap "View on Booking" below for current pricing' : `Live rates depend on dates · ${nights} night${nights !== 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
          {hotel.price > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontSize: 28, fontFamily: FontFamily.sansBold, color: colors.text }}>${total > 0 ? total.toFixed(0) : hotel.price}</Text>
                <Text style={{ fontSize: 13, color: colors.textTertiary, marginLeft: 8 }}>
                  (${hotel.price}/nt {'\u00B7'} {nights} night{nights !== 1 ? 's' : ''})
                </Text>
              </View>
            </View>
          )}

          {/* Inline reviews — shown when stars are tapped */}
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
                      {r.avatar ? (
                        <Image source={{ uri: r.avatar }} style={{ width: 28, height: 28, borderRadius: 14 }} onError={() => {}} />
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

function HotelSkeleton() {
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

export default function HotelsScreen() {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  const { id: _id } = useLocalSearchParams<{ id: string }>();
  const { tripId: ctxId } = useContext(TabCtx);
  const id = _id || ctxId;
  const { trip } = useItineraryScreen(id);
  const [selectedRoom, setSelectedRoom] = useState(0);
  const [browseMode, setBrowseMode] = useState<'cards' | 'list'>('list');
  const [cardIdx, setCardIdx] = useState(-1); // -1 = hidden
  const [selectedHotelIdx, setSelectedHotelIdx] = useState(0);
  const [detailExpanded, setDetailExpanded] = useState(true);
  const [booked, setBooked] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [starFilter, setStarFilter] = useState<number[]>([]);
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [showBrowse, setShowBrowse] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Hotels from trip_context
  const ctx = trip?.trip_context as any;
  const contextHotels = useMemo(() => {
    const source = ctx?.all_hotels ?? ctx?.hotels ?? [];
    if (source.length === 0) return [];
    return source.map((h: any, i: number) => ({
      id: h.id || `hotel-${i}`,
      name: h.name,
      stars: h.stars ?? 0,
      rating: h.rating ?? 0,
      reviews: h.ratingCount ?? h.review_count ?? 0,
      price: h.price ?? h.price_per_night ?? 0,
      neighborhood: h.address?.split(',')[0] || '',
      image: upscaleGoogleImage(h.image ?? h.photo_url) || h.image || h.photo_url || '',
      amenities: h.amenities ?? [],
      brand: '',
      label: i === 0 ? 'Top Pick' : i < 3 ? 'Popular' : '',
    }));
  }, [ctx]);

  // Paginated hotel search — endless scroll
  const destination = trip?.destination?.split(',')[0]?.trim();
  const [searchHotels, setSearchHotels] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [hotelSearchPage, setHotelSearchPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreHotels, setHasMoreHotels] = useState(true);
  const searchTimerRef2 = useRef<NodeJS.Timeout | null>(null);

  // Also use the shared hook for initial results
  const { data: hookResults } = useHotelSearch({
    destination,
    checkIn: trip?.start_date ?? undefined,
    checkOut: trip?.end_date ?? undefined,
  });

  const mapHotelResult = useCallback((h: any, i: number, prefix: string) => {
    const rawStars = h.stars;
    const parsedStars = typeof rawStars === 'number' ? rawStars : typeof rawStars === 'string' ? parseInt(rawStars) || 0 : 0;
    return {
      id: h.id || `${prefix}-${i}`,
      name: h.name,
      stars: parsedStars,
      rating: h.rating ?? 0,
      reviews: h.reviewCount ?? h.reviews ?? 0,
      price: h.price ?? 0,
      neighborhood: h.neighborhood ?? h.address?.split(',')[0] ?? '',
      image: upscaleGoogleImage(h.images?.[0] ?? h.image) || h.images?.[0] || h.image || '',
      images: (h.images ?? (h.image ? [h.image] : [])).map((img: string) => upscaleGoogleImage(img) || img),
      amenities: h.amenities ?? [],
      checkIn: h.checkIn ?? '',
      checkOut: h.checkOut ?? '',
      link: h.link ?? h.website ?? '',
      description: h.description ?? h.tagline ?? '',
      address: h.address ?? '',
      lat: (h.lat || h.latitude) && (h.lat || h.latitude) !== 0 ? (h.lat || h.latitude) : null,
      lng: (h.lng || h.longitude) && (h.lng || h.longitude) !== 0 ? (h.lng || h.longitude) : null,
      brand: '',
      label: '',
    };
  }, []);

  // Get destination coordinates for Foursquare
  const destLat = ctx?.destination_lat ?? ctx?.latitude ?? null;
  const destLng = ctx?.destination_lng ?? ctx?.longitude ?? null;

  const fetchHotelPage = useCallback(async (query: string, page: number, append: boolean) => {
    setIsLoadingMore(true);
    const base = getWebApiBase();
    try {
      const fetches: Promise<any[]>[] = [];

      // Foursquare — reliable pagination via coord offsets
      if (destLat && destLng) {
        const offsetLat = destLat + (page % 3) * 0.015;
        const offsetLng = destLng + (page % 2) * 0.012;
        fetches.push(
          fetch(`${base}/api/places?lat=${offsetLat}&lng=${offsetLng}&category=hotel&limit=20`)
            .then(r => r.ok ? r.json() : []).catch(() => []),
        );
      } else if (destination) {
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`, { headers: { 'User-Agent': 'Travyl/1.0' } });
          const geoData = await geoRes.json() as any[];
          if (geoData.length > 0) {
            const lat = parseFloat(geoData[0].lat) + (page % 3) * 0.015;
            const lng = parseFloat(geoData[0].lon) + (page % 2) * 0.012;
            fetches.push(
              fetch(`${base}/api/places?lat=${lat}&lng=${lng}&category=hotel&limit=20`)
                .then(r => r.ok ? r.json() : []).catch(() => []),
            );
          }
        } catch {}
      }

      // Page 0: Maps + TripAdvisor. Pages 1+: TripAdvisor pagination
      if (page === 0) {
        fetches.push(
          fetch(`${base}/api/search/maps?q=${encodeURIComponent(query)}`).then(r => r.ok ? r.json() : []).catch(() => []),
          fetch(`${base}/api/search/tripadvisor?q=${encodeURIComponent(query)}&ssrc=h`).then(r => r.ok ? r.json() : []).catch(() => []),
        );
      } else {
        fetches.push(
          fetch(`${base}/api/search/tripadvisor?q=${encodeURIComponent(query)}&ssrc=h&offset=${page * 30}`).then(r => r.ok ? r.json() : []).catch(() => []),
        );
      }

      const results = await Promise.all(fetches);
      const all = results.flat()
        .filter((p: any) => p.name)
        .map((p: any, i: number) => mapHotelResult(p, i + page * 100, `sh-p${page}`));
      if (all.length === 0 && page > 0) { setHasMoreHotels(false); setIsLoadingMore(false); return; }
      setSearchHotels(prev => {
        if (!append) return all;
        const existingNames = new Set(prev.map((h: any) => ((h.name || '') as string).toLowerCase()));
        return [...prev, ...all.filter((h: any) => !existingNames.has(((h.name || '') as string).toLowerCase()))];
      });
    } catch {}
    setIsLoadingMore(false);
  }, [mapHotelResult, destLat, destLng, destination]);

  // Initial search
  useEffect(() => {
    if (destination) {
      setHotelSearchPage(0);
      setHasMoreHotels(true);
      fetchHotelPage(`hotels in ${destination}`, 0, false);
    }
  }, [destination]);

  // Merge hook results into search results
  useEffect(() => {
    if (!hookResults) return;
    const hotels = Array.isArray(hookResults) ? hookResults : (hookResults as any)?.hotels ?? [];
    if (hotels.length === 0) return;
    const mapped = hotels.map((h: any, i: number) => mapHotelResult(h, i, 'hook'));
    setSearchHotels(prev => {
      const existingNames = new Set(prev.map((h: any) => ((h.name || '') as string).toLowerCase()));
      return [...prev, ...mapped.filter((h: any) => !existingNames.has(((h.name || '') as string).toLowerCase()))];
    });
  }, [hookResults, mapHotelResult]);

  // User search
  useEffect(() => {
    if (!userSearch.trim()) return;
    if (searchTimerRef2.current) clearTimeout(searchTimerRef2.current);
    searchTimerRef2.current = setTimeout(() => {
      setHotelSearchPage(0);
      setHasMoreHotels(true);
      fetchHotelPage(userSearch, 0, false);
    }, 400) as unknown as NodeJS.Timeout;
    return () => { if (searchTimerRef2.current) clearTimeout(searchTimerRef2.current); };
  }, [userSearch]);

  // Load more
  const loadMoreHotels = useCallback(() => {
    if (isLoadingMore || !hasMoreHotels) return;
    const nextPage = hotelSearchPage + 1;
    setHotelSearchPage(nextPage);
    const q = userSearch.trim() || (destination ? `hotels in ${destination}` : '');
    if (q) fetchHotelPage(q, nextPage, true);
  }, [hotelSearchPage, isLoadingMore, hasMoreHotels, userSearch, destination, fetchHotelPage]);

  const handleHotelScroll = useCallback((e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < 800 && hasMoreHotels && !isLoadingMore) loadMoreHotels();
  }, [hasMoreHotels, isLoadingMore, loadMoreHotels]);

  // Merge: search results first, then context hotels without dupes
  const realHotels = useMemo(() => {
    const seen = new Set(searchHotels.filter((h: any) => h.name).map((h: any) => ((h.name || '') as string).toLowerCase()));
    const extra = contextHotels.filter((h: any) => !seen.has(((h.name || '') as string).toLowerCase()));
    return [...searchHotels, ...extra];
  }, [contextHotels, searchHotels]);

  // Convert hotels to PlaceItem[] for CardStackCarousel
  const hotelPlaces = useMemo<PlaceItem[]>(() =>
    realHotels.map((h: any) => ({
      id: h.id,
      name: h.name,
      image: h.image || '',
      images: h.images ?? (h.image ? [h.image] : []),
      type: 'hotel' as const,
      rating: h.rating ?? 0,
      tagline: [h.stars > 0 ? `${h.stars}-Star` : '', h.neighborhood].filter(Boolean).join(' · '),
      category: 'Hotel',
      description: [
        h.amenities?.join(' · '),
        h.checkIn ? `Check-in: ${h.checkIn}` : '',
        h.checkOut ? `Check-out: ${h.checkOut}` : '',
      ].filter(Boolean).join('\n'),
      tags: h.amenities?.slice(0, 4) ?? [],
      price: h.price > 0 ? `$${h.price}/night` : undefined,
      website: h.link || undefined,
      address: h.address || h.neighborhood || '',
      latitude: h.lat || undefined,
      longitude: h.lng || undefined,
    })),
    [realHotels],
  );

  const filteredHotels = useMemo(() => {
    let result = [...realHotels];
    // Narrow by query — typing should filter the visible list, not just
    // refresh the API call.
    const q = userSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((h) => {
        const hay = [
          h.name, h.brand, h.address, h.neighborhood,
          ...(h.amenities ?? []),
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    if (starFilter.length > 0) {
      result = result.filter((h) => starFilter.includes(h.stars));
    }
    if (amenityFilter.length > 0) {
      result = result.filter((h) => amenityFilter.every((a) => h.amenities.includes(a)));
    }
    if (brandFilter.length > 0) {
      result = result.filter((h) => brandFilter.includes(h.brand));
    }
    switch (sortBy) {
      case 'price-low': result.sort((a, b) => a.price - b.price); break;
      case 'price-high': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'stars': result.sort((a, b) => b.stars - a.stars); break;
      default: break;
    }
    return result;
  }, [realHotels, starFilter, amenityFilter, brandFilter, sortBy, userSearch]);

  // Build detail from the selected hotel in the browse list
  const hotel = useMemo<HotelData | null>(() => {
    const contextSource = ctx?.all_hotels ?? ctx?.hotels ?? [];
    const searchSource = hookResults ? (Array.isArray(hookResults) ? hookResults : (hookResults as any)?.hotels ?? []) : [];
    const allSources = [...contextSource, ...searchSource];
    const h = realHotels[selectedHotelIdx] ?? allSources[0] ?? realHotels[0];
    if (!h) return null;
    const price = h.price ?? h.price_per_night ?? 0;
    const stars = h.stars ?? 0;
    const rating = h.rating ?? 0;
    const ratingLabel = rating >= 4.5 ? 'Superb' : rating >= 4 ? 'Excellent' : rating > 0 ? 'Very Good' : '';
    const roomTypes: RoomType[] = Array.isArray(h.room_types) && h.room_types.length > 0
      ? h.room_types.map((r: any) => ({
          type: r.type || 'Room',
          beds: r.beds || '',
          guests: r.guests ?? 2,
          size: r.size || '',
          price: r.price ?? price,
          image: r.image || '',
          amenities: r.amenities ?? [],
        }))
      : price > 0
        ? [{ type: 'Standard Room', beds: '', guests: 2, size: '', price, image: '', amenities: [] }]
        : [];
    // Collect all available images
    const images = [
      ...(Array.isArray(h.images) ? h.images : []),
      upscaleGoogleImage(h.image ?? h.photo_url) || h.image || h.photo_url,
    ].filter(Boolean) as string[];
    // Dedupe
    const uniqueImages = [...new Set(images)];
    const amenities = (h.amenities ?? []).slice(0, 8);
    return {
      id: h.id || 'h1',
      name: h.name,
      stars,
      rating,
      reviews: h.ratingCount ?? h.review_count ?? h.reviews ?? 0,
      price,
      address: h.address || '',
      neighborhood: h.neighborhood ?? (h.address?.split(',')[0] || ''),
      images: uniqueImages,
      amenities,
      amenityCategories: [
        { category: 'Room', items: amenities.filter((a: string) => /wifi|tv|ac|air|heat|iron|kitchen/i.test(a)).map((a: string) => ({ name: a, icon: 'check' })) },
        { category: 'Services', items: amenities.filter((a: string) => /park|shuttle|elevator|pet|smoke|wheel/i.test(a)).map((a: string) => ({ name: a, icon: 'check' })) },
      ].filter(c => c.items.length > 0),
      roomTypes,
      checkIn: trip?.start_date ? new Date(trip.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      checkOut: trip?.end_date ? new Date(trip.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      cancellation: h.cancellation ?? '',
      // Surface phone if the source has one — was hardcoded to '' before,
      // which silently disabled the Call button.
      phone: h.phone ?? h.formatted_phone_number ?? '',
      bookingLink: h.link ?? h.website ?? h.url ?? '',
      description: h.description ?? h.about ?? h.summary ?? h.tagline ?? '',
      category: h.category ?? h.type ?? (Array.isArray(h.types) ? h.types[0] : undefined) ?? '',
      hours: h.hours ?? h.opening_hours_summary ?? '',
      nearby: h.nearby_summary ?? h.transit ?? '',
      guestRatings: {
        overall: rating,
        label: ratingLabel,
        cleanliness: 0,
        staff: 0,
        location: 0,
        comfort: 0,
        value: 0,
      },
    };
  }, [ctx, trip, hookResults, realHotels, selectedHotelIdx]);
  if (!hotel && realHotels.length === 0) {
    return (
      <PageTransition>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, padding: 32 }}>
          <FontAwesome name="building-o" size={28} color={colors.textTertiary} />
          <Text style={{ ...TextStyles.subhead, color: colors.text, marginTop: 12 }}>No Hotels Yet</Text>
          <Text style={{ ...TextStyles.bodyLg, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>Hotel recommendations will appear once the trip is enriched.</Text>
        </View>
      </PageTransition>
    );
  }
  const currentRoom = hotel && hotel.roomTypes.length > 0 ? hotel.roomTypes[selectedRoom] : null;

  const handleBook = () => {
    const conf = generateConfirmation();
    setConfirmationNumber(conf);
    setBooked(true);
  };

  const queryClient = useQueryClient();
  const [savingHotel, setSavingHotel] = useState(false);

  // Persist the currently-selected hotel into trip_context.hotels[0]. The
  // budget tab pulls accommodation cost from trip_context.hotels[0].price,
  // so this is what makes the hotel's price show up in Budget after the
  // user picks a hotel.
  const addHotelToTrip = useCallback(async () => {
    if (!id || !hotel) return;
    const room = currentRoom ?? hotel.roomTypes[selectedRoom];
    const ctxHotel = {
      id: hotel.id,
      name: hotel.name,
      stars: hotel.stars,
      rating: hotel.rating,
      review_count: hotel.reviews,
      price: room?.price ?? hotel.price,
      price_per_night: room?.price ?? hotel.price,
      neighborhood: hotel.neighborhood,
      address: hotel.address,
      image: hotel.images?.[0] ?? '',
      images: hotel.images ?? [],
      amenities: hotel.amenities,
      checkIn: hotel.checkIn,
      checkOut: hotel.checkOut,
      cancellation: hotel.cancellation,
      phone: hotel.phone,
      link: hotel.bookingLink,
      website: hotel.bookingLink,
      description: hotel.description,
      category: hotel.category,
      hours: hotel.hours,
      nearby: hotel.nearby,
      room_type: room?.type ?? '',
      room_types: hotel.roomTypes,
    };
    setSavingHotel(true);
    try {
      const { data: row } = await supabase.from('trips').select('trip_context').eq('id', id).single();
      const ctx = (row?.trip_context || {}) as Record<string, unknown>;
      (ctx as any).hotels = [ctxHotel];
      const existingAll = Array.isArray((ctx as any).all_hotels) ? ((ctx as any).all_hotels as any[]) : [];
      const dedup = [ctxHotel, ...existingAll.filter((h: any) => h?.id !== ctxHotel.id && h?.name !== ctxHotel.name)];
      (ctx as any).all_hotels = dedup;
      const { error } = await supabase.from('trips').update({ trip_context: ctx }).eq('id', id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['trip', id] });
      Alert.alert('Hotel added', 'This hotel is now in your trip and budget.');
    } catch (e: any) {
      Alert.alert('Could not add hotel', e?.message || 'Please try again.');
    } finally {
      setSavingHotel(false);
    }
  }, [id, hotel, currentRoom, selectedRoom, queryClient]);

  const scrollRef = useRef<ScrollView>(null);
  const detailRef = useRef<View>(null);
  const detailYRef = useRef(0);

  return (
    <PageTransition>
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      onScroll={handleHotelScroll}
      scrollEventThrottle={16}
    >
      {/* ── Search bar (top so it's discoverable) ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, height: 40 }}>
          <FontAwesome name="search" size={13} color={colors.textTertiary} />
          <TextInput
            value={userSearch}
            onChangeText={setUserSearch}
            onSubmitEditing={() => { Keyboard.dismiss(); if (userSearch.trim()) { setHotelSearchPage(0); setHasMoreHotels(true); fetchHotelPage(userSearch, 0, false); } }}
            returnKeyType="search"
            placeholder="Search hotels — Marriott, boutique, spa..."
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontSize: 14, color: colors.text, marginLeft: 8, paddingVertical: 0 }}
          />
          {userSearch.length > 0 && (
            <Pressable onPress={() => { setUserSearch(''); if (destination) { setHotelSearchPage(0); setHasMoreHotels(true); fetchHotelPage(`hotels in ${destination}`, 0, false); } }}>
              <FontAwesome name="times-circle" size={14} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Selected Hotel Detail (top, like Figma) ── */}
      {hotel && (() => {
        const nights = (trip?.start_date && trip?.end_date)
          ? Math.max(1, Math.round((new Date(trip.end_date + 'T00:00:00').getTime() - new Date(trip.start_date + 'T00:00:00').getTime()) / 86400000))
          : 1;
        const pricePerNight = currentRoom?.price ?? hotel.price;
        const subtotal = pricePerNight * nights;
        // Estimated taxes & fees — actual amounts vary by property
        const EST_CITY_TAX_PP_PN = 3.5;
        const EST_GUESTS = 2;
        const EST_SVC_FEE = 12;
        const EST_VAT = 0.1;
        const cityTax = EST_CITY_TAX_PP_PN * EST_GUESTS * nights;
        const serviceFee = EST_SVC_FEE;
        const vat = subtotal * EST_VAT;
        const totalCost = subtotal + cityTax + serviceFee + vat;
        return (
      <View onLayout={(e) => { detailYRef.current = e.nativeEvent.layout.y; }} style={{ paddingHorizontal: 16, marginTop: 16 }}>

        {/* ── Banner ── */}
        <LinearGradient
          colors={booked ? ['#1e3a5f', '#2c4f7f'] : ['#60a5fa', '#60a5fa']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FontAwesome name="building" size={14} color="#fff" />
            <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>{booked ? 'Your Hotel' : 'Selected Hotel'}</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
            <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{selectedHotelIdx + 1}/{realHotels.length}</Text>
          </View>
        </LinearGradient>

        {/* ── Card Body ── */}
        <View style={{ backgroundColor: colors.cardBackground, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0, borderColor: colors.border, overflow: 'hidden' }}>

          {/* Badges Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingTop: 14 }}>
            <View style={{ backgroundColor: booked ? '#1e3a5f' : '#60a5fa', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 }}>
              <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{booked ? 'Confirmed' : 'Selected'}</Text>
            </View>
            {hotel.rating > 0 && (
              <View style={{ backgroundColor: colors.infoBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="star" size={10} color={colors.info} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.info }}>{hotel.rating}/5</Text>
                {hotel.reviews > 0 && <Text style={{ fontSize: 11, color: colors.info }}>({hotel.reviews.toLocaleString()})</Text>}
              </View>
            )}
          </View>

          {/* Hotel Name */}
          <Text style={{ ...TextStyles.title, fontFamily: FontFamily.serif, color: colors.text, paddingHorizontal: 14, marginTop: 8 }} numberOfLines={2}>{hotel.name}</Text>

          {/* Stars + Type pill */}
          <View style={{ paddingHorizontal: 14, marginTop: 4, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            {hotel.stars > 0 && <StarRow count={hotel.stars} />}
            {!!hotel.category && (
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.borderLight }}>
                <Text style={{ ...TextStyles.xs, color: colors.textSecondary, fontWeight: '600' }}>{hotel.category}</Text>
              </View>
            )}
            {!!hotel.neighborhood && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="map-marker" size={11} color={colors.textTertiary} />
                <Text style={{ ...TextStyles.xs, color: colors.textSecondary }}>{hotel.neighborhood}</Text>
              </View>
            )}
          </View>

          {/* Description (if present) */}
          {!!hotel.description && (
            <Text style={{ ...TextStyles.body, color: colors.textSecondary, paddingHorizontal: 14, marginTop: 10, lineHeight: 19 }} numberOfLines={4}>
              {hotel.description}
            </Text>
          )}

          {/* Hours / Nearby summary */}
          {(!!hotel.hours || !!hotel.nearby) && (
            <View style={{ paddingHorizontal: 14, marginTop: 8, gap: 4 }}>
              {!!hotel.hours && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FontAwesome name="clock-o" size={11} color={colors.textTertiary} />
                  <Text style={{ ...TextStyles.caption, color: colors.textSecondary, flex: 1 }}>{hotel.hours}</Text>
                </View>
              )}
              {!!hotel.nearby && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FontAwesome name="compass" size={11} color={colors.textTertiary} />
                  <Text style={{ ...TextStyles.caption, color: colors.textSecondary, flex: 1 }}>{hotel.nearby}</Text>
                </View>
              )}
            </View>
          )}

          {/* Check-in/out + cancellation inline */}
          {(!!hotel.checkIn || !!hotel.checkOut) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, marginTop: 8 }}>
              <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>
                {hotel.checkIn ? `Check-in: ${hotel.checkIn}` : ''}{hotel.checkIn && hotel.checkOut ? ' \u00B7 ' : ''}{hotel.checkOut ? `Check-out: ${hotel.checkOut}` : ''}
              </Text>
            </View>
          )}

          {/* Image Carousel */}
          {hotel.images.length > 0 && (
            <View style={{ marginTop: 12, marginHorizontal: 14, borderRadius: 10, overflow: 'hidden' }}>
              <ImageCarousel images={hotel.images} height={208} />
            </View>
          )}

          <View style={{ padding: 14, gap: 0 }}>

            {/* ── Total Cost (collapsible) ── */}
            {hotel.price > 0 && (
              <PricingSummary room={currentRoom ?? { type: 'Standard', beds: '', guests: 2, size: '', price: hotel.price, image: '', amenities: [] }} pricePerNight={pricePerNight} nights={nights} />
            )}

            {/* ── Room Options (collapsible) ── */}
            {hotel.roomTypes.length > 0 && currentRoom && (
              <RoomSelection rooms={hotel.roomTypes} selectedRoom={selectedRoom} onSelect={setSelectedRoom} />
            )}

            {/* ── Contact & Location ── */}
            {!!hotel.address && (
              <View style={{ marginTop: 14 }}>
                <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginBottom: 10 }}>Contact & Location</Text>

                {/* 3-column grid: Call / Email (or Website) / Map */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {!!hotel.phone && (
                    <Pressable onPress={() => Linking.openURL(`tel:${hotel.phone}`)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: colors.cardBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                      <FontAwesome name="phone" size={16} color={colors.tint} />
                      <Text style={{ ...TextStyles.xs, color: colors.text, marginTop: 4, fontWeight: '600' }}>Call</Text>
                    </Pressable>
                  )}
                  {!!hotel.bookingLink && (
                    <Pressable onPress={() => Linking.openURL(hotel.bookingLink.startsWith('http') ? hotel.bookingLink : `https://www.google.com/search?q=${encodeURIComponent(hotel.bookingLink)}`)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: colors.cardBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                      <FontAwesome name="external-link" size={15} color={colors.tint} />
                      <Text style={{ ...TextStyles.xs, color: colors.text, marginTop: 4, fontWeight: '600' }}>Website</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(hotel.address)}`)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: colors.cardBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                    <FontAwesome name="map-pin" size={16} color="#8b6f47" />
                    <Text style={{ ...TextStyles.xs, color: colors.text, marginTop: 4, fontWeight: '600' }}>Map</Text>
                  </Pressable>
                </View>

                {/* Address card */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10, backgroundColor: colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border }}>
                  <FontAwesome name="map-marker" size={14} color={colors.textTertiary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...TextStyles.body, color: colors.text }}>{hotel.address}</Text>
                    {!!hotel.neighborhood && (
                      <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 2 }}>{hotel.neighborhood}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* ── Add to Trip + Book Now ── */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Pressable
                onPress={addHotelToTrip}
                disabled={savingHotel}
                style={({ pressed }) => ({
                  flex: 1, backgroundColor: colors.tint, borderRadius: 12, paddingVertical: 15,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: pressed || savingHotel ? 0.85 : 1,
                })}
              >
                <FontAwesome name="plus" size={14} color="#fff" />
                <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>
                  {savingHotel ? 'Adding…' : 'Add to Trip'}
                </Text>
              </Pressable>
              {!!hotel.bookingLink && (
                <Pressable
                  onPress={() => WebBrowser.openBrowserAsync(hotel.bookingLink.startsWith('http') ? hotel.bookingLink : `https://www.google.com/search?q=${encodeURIComponent(hotel.name + ' booking')}`)}
                  style={({ pressed }) => ({
                    flex: 1, backgroundColor: colors.cardBackground, borderRadius: 12, paddingVertical: 15,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    borderWidth: 1, borderColor: colors.tint,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <FontAwesome name="external-link" size={13} color={colors.tint} />
                  <Text style={{ ...TextStyles.bodyLgEm, color: colors.tint }}>Book Now</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
        );
      })()}

      {/* ── Browse Hotels — toggle + list/card views ── */}
      {realHotels.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          {/* Header with toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ ...TextStyles.subhead, color: colors.text }}>Browse Hotels</Text>
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

          {/* List View */}
          {browseMode === 'list' && realHotels.filter((_: any, i: number) => i !== selectedHotelIdx).map((h: any) => (
            <HotelListCard
              key={h.id}
              hotel={h}
              nights={(trip?.start_date && trip?.end_date)
                ? Math.max(1, Math.round((new Date(trip.end_date + 'T00:00:00').getTime() - new Date(trip.start_date + 'T00:00:00').getTime()) / 86400000))
                : 1}
              onPress={() => {
                setSelectedHotelIdx(Math.max(0, realHotels.findIndex((rh: any) => rh.id === h.id)));
                setSelectedRoom(0);
                setBooked(false);
                // Don't scroll to top — keep the user where they are.
              }}
            />
          ))}

          {/* Card View — swipeable CardStackCarousel */}
          {browseMode === 'cards' && hotelPlaces.length > 0 && (
            <CardStackCarousel
              places={hotelPlaces}
              initialIndex={0}
              favorites={[]}
              onToggleFav={() => {}}
              onAddToTrip={(place) => {
                const idx = realHotels.findIndex((rh: any) => rh.id === place.id);
                if (idx >= 0) {
                  setSelectedHotelIdx(idx);
                  setSelectedRoom(0);
                  setBrowseMode('list');
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
          <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 6 }}>Loading more hotels...</Text>
        </View>
      )}
    </ScrollView>
    </PageTransition>
  );
}
