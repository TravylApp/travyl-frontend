import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { PageTransition, useTabAccent } from './_layout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TextStyles, FontSize, FontFamily, useItineraryScreen, useHotelSearch, upscaleGoogleImage } from '@travyl/shared';


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
  email: string;
  guestRatings: GuestRatings;
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
      <FontAwesome name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#94a3b8" />
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
            <FontAwesome name="chevron-left" size={12} color="#374151" />
          </Pressable>
          <Pressable
            onPress={next}
            style={{
              position: 'absolute', right: 10, top: '50%', marginTop: -16,
              width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name="chevron-right" size={12} color="#374151" />
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
                        {'\u20ac'}{room.price}
                      </Text>
                      <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>per night</Text>
                    </View>
                  </View>
                  <Text style={{ ...TextStyles.sm, color: colors.textSecondary, marginTop: 2 }}>{room.beds}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <FontAwesome name="users" size={9} color="#9ca3af" />
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

function PriceBreakdown({ room, pricePerNight }: { room: RoomType; pricePerNight: number }) {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const nights = 5;
  const subtotal = pricePerNight * nights;
  const cityTax = 3.5 * 2 * nights;
  const serviceFee = 12;
  const vat = subtotal * 0.1;
  const total = subtotal + cityTax + serviceFee + vat;

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Price Breakdown"
        icon="calculator"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={`\u20ac${total.toFixed(0)} total`}
      />
      {isOpen && (
        <View style={{ backgroundColor: ACCENT + '08', borderRadius: 10, padding: 14 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>Room</Text>
              <Text style={{ ...TextStyles.bodyEm, color: ACCENT }}>{room.type}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>Nightly Rate</Text>
              <Text style={{ ...TextStyles.bodyEm, color: ACCENT }}>{'\u20ac'}{pricePerNight}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>{nights} nights subtotal</Text>
              <Text style={{ ...TextStyles.bodyEm, color: ACCENT }}>{'\u20ac'}{subtotal.toFixed(2)}</Text>
            </View>

            <View style={{ height: 1, backgroundColor: ACCENT + '15', marginVertical: 4 }} />
            <Text style={{ ...TextStyles.smEm, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Taxes & Fees
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>City Tax</Text>
              <Text style={{ ...TextStyles.body, color: colors.text }}>{'\u20ac'}{cityTax.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>Service Fee</Text>
              <Text style={{ ...TextStyles.body, color: colors.text }}>{'\u20ac'}{serviceFee.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>VAT (10%)</Text>
              <Text style={{ ...TextStyles.body, color: colors.text }}>{'\u20ac'}{vat.toFixed(2)}</Text>
            </View>

            <View style={{ height: 1, backgroundColor: ACCENT + '25', marginVertical: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ ...TextStyles.bodyXlEm, color: colors.text }}>Total</Text>
              <Text style={{ ...TextStyles.subhead, color: ACCENT }}>{'\u20ac'}{total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact & Location                                                 */
/* ------------------------------------------------------------------ */

function ContactActions({ phone, email, address }: { phone: string; email: string; address: string }) {
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
              backgroundColor: '#f0fdf4', borderRadius: 10, paddingVertical: 12,
              borderWidth: 1, borderColor: '#bbf7d0',
            }}
          >
            <FontAwesome name="phone" size={14} color="#16a34a" />
            <Text style={{ ...TextStyles.bodyEm, color: '#16a34a' }}>Call</Text>
          </Pressable>
        )}
        {!!email && (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${email}`)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: ACCENT + '10', borderRadius: 10, paddingVertical: 12,
              borderWidth: 1, borderColor: ACCENT + '25',
            }}
          >
            <FontAwesome name="envelope" size={13} color={ACCENT} />
            <Text style={{ ...TextStyles.bodyEm, color: ACCENT }}>Email</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: '#fef3c7', borderRadius: 10, paddingVertical: 12,
            borderWidth: 1, borderColor: '#fde68a',
          }}
        >
          <FontAwesome name="map-marker" size={14} color="#d97706" />
          <Text style={{ ...TextStyles.bodyEm, color: '#d97706' }}>Map</Text>
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

function OtherHotelCard({ hotel }: { hotel: { id: string; name: string; stars: number; rating: number; label?: string; reviews: number; price: number; neighborhood: string; image: string } }) {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 12,
        borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 10,
      }}
    >
      <Image source={{ uri: hotel.image, headers: { Referer: '' } }} style={{ width: 90, height: 100 }} resizeMode="cover" />
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, flex: 1 }} numberOfLines={1}>
              {hotel.name}
            </Text>
            <Text style={{ ...TextStyles.bodyXlEm, color: ACCENT, marginLeft: 8 }}>
              {'\u20ac'}{hotel.price}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <StarRow count={hotel.stars} />
            <Text style={{ ...TextStyles.sm, color: colors.textTertiary, marginLeft: 4 }}>{hotel.neighborhood}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <RatingBadge rating={hotel.rating} />
          <Text style={{ ...TextStyles.captionEm, color: colors.textSecondary }}>{hotel.label}</Text>
          <Text style={{ ...TextStyles.sm, color: colors.textTertiary }}>{hotel.reviews.toLocaleString()} reviews</Text>
        </View>
      </View>
    </View>
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
          <FontAwesome name="sliders" size={13} color={activeCount > 0 ? ACCENT : '#64748b'} />
          <Text style={{ ...TextStyles.bodyEm, color: activeCount > 0 ? ACCENT : colors.textSecondary }}>Filters</Text>
          {activeCount > 0 && (
            <View style={{ backgroundColor: ACCENT, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{activeCount}</Text>
            </View>
          )}
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FontAwesome name="sort" size={12} color="#9ca3af" />
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
              <Text style={{ ...TextStyles.bodyEm, color: '#ef4444' }}>Reset Filters</Text>
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

function BrowseHotelCard({ hotel }: { hotel: { id: string; name: string; stars: number; rating: number; reviews: number; price: number; neighborhood: string; image: string; amenities?: string[]; brand?: string; label?: string } }) {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 12,
        borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 10,
      }}
    >
      <Image source={{ uri: hotel.image, headers: { Referer: '' } }} style={{ width: 110, height: 120 }} resizeMode="cover" />
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, flex: 1 }} numberOfLines={1}>
              {hotel.name}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <StarRow count={hotel.stars} />
            <Text style={{ ...TextStyles.sm, color: colors.textTertiary, marginLeft: 4 }}>{hotel.neighborhood}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <RatingBadge rating={hotel.rating} />
          <Text style={{ ...TextStyles.sm, color: colors.textTertiary }}>{hotel.reviews.toLocaleString()} reviews</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          {hotel.label ? (
            <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ ...TextStyles.xs, color: ACCENT }}>{hotel.label}</Text>
            </View>
          ) : <View />}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ ...TextStyles.subhead, color: ACCENT }}>{'\u20ac'}{hotel.price}</Text>
            <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>per night</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Hotel Policies Section                                             */
/* ------------------------------------------------------------------ */

function HotelPoliciesSection() {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);

  const policies = [
    { icon: 'sign-in', label: 'Check-in', value: 'From 2:00 PM' },
    { icon: 'sign-out', label: 'Check-out', value: 'Until 11:00 AM' },
    { icon: 'calendar-times-o', label: 'Cancellation', value: 'Free until 48h before' },
    { icon: 'child', label: 'Children', value: 'All ages welcome' },
    { icon: 'paw', label: 'Pets', value: 'Not allowed' },
    { icon: 'ban', label: 'Smoking', value: 'Non-smoking property' },
  ];

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Hotel Policies"
        icon="info-circle"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={`${policies.length} policies`}
      />
      {isOpen && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ gap: 12 }}>
            {policies.map((p) => (
              <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: ACCENT + '10', alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesome name={p.icon as any} size={13} color={ACCENT} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...TextStyles.captionEm, color: colors.textTertiary }}>{p.label}</Text>
                  <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>{p.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

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
  const { trip } = useItineraryScreen(_id);
  const [selectedRoom, setSelectedRoom] = useState(0);
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

  // Live hotel search via backend API
  const destination = trip?.destination?.split(',')[0]?.trim();
  const { data: searchResults } = useHotelSearch({
    destination,
    checkIn: trip?.start_date ?? undefined,
    checkOut: trip?.end_date ?? undefined,
  });
  const searchHotels = useMemo(() => {
    const hotels = Array.isArray(searchResults) ? searchResults : (searchResults as any)?.hotels ?? [];
    return hotels.map((h: any, i: number) => ({
      id: h.id || `search-${i}`,
      name: h.name,
      stars: h.stars ?? 0,
      rating: h.rating ?? 0,
      reviews: h.reviews ?? 0,
      price: h.price ?? 0,
      neighborhood: h.neighborhood ?? h.address?.split(',')[0] ?? '',
      image: h.images?.[0] ?? h.image ?? '',
      amenities: h.amenities ?? [],
      brand: '',
      label: '',
    }));
  }, [searchResults]);

  // Merge: context first, then search results (deduped by name)
  const realHotels = useMemo(() => {
    const seen = new Set(contextHotels.map((h: any) => h.name.toLowerCase()));
    const extra = searchHotels.filter((h: any) => !seen.has(h.name.toLowerCase()));
    return [...contextHotels, ...extra];
  }, [contextHotels, searchHotels]);

  const filteredHotels = useMemo(() => {
    let result = [...realHotels];
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
  }, [starFilter, amenityFilter, brandFilter, sortBy]);

  // Use first real hotel from trip_context — no fabricated defaults
  const hotel = useMemo<HotelData | null>(() => {
    const source = ctx?.all_hotels ?? ctx?.hotels ?? [];
    const h = source[0];
    if (!h) return null;
    const price = h.price ?? h.price_per_night ?? 0;
    const stars = h.stars ?? 0;
    const rating = h.rating ?? 0;
    const ratingLabel = rating >= 4.5 ? 'Superb' : rating >= 4 ? 'Excellent' : rating > 0 ? 'Very Good' : '';
    // Only include room types if we have real room data from the API
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
    return {
      id: h.id || 'h1',
      name: h.name,
      stars,
      rating,
      reviews: h.ratingCount ?? h.review_count ?? 0,
      price,
      address: h.address || '',
      neighborhood: h.address?.split(',')[0] || '',
      images: [h.image ?? h.photo_url].filter(Boolean) as string[],
      amenities: (h.amenities ?? []).slice(0, 8),
      amenityCategories: [
        { category: 'Room', items: (h.amenities ?? []).filter((a: string) => /wifi|tv|ac|air|heat|iron|kitchen/i.test(a)).map((a: string) => ({ name: a, icon: 'check' })) },
        { category: 'Services', items: (h.amenities ?? []).filter((a: string) => /park|shuttle|elevator|pet|smoke|wheel/i.test(a)).map((a: string) => ({ name: a, icon: 'check' })) },
      ].filter(c => c.items.length > 0),
      roomTypes,
      checkIn: trip?.start_date ? new Date(trip.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      checkOut: trip?.end_date ? new Date(trip.end_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      cancellation: '',
      phone: '',
      email: h.link ?? '',
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
  }, [ctx, trip]);
  if (!hotel) {
    return (
      <PageTransition>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, padding: 32 }}>
          <FontAwesome name="building-o" size={28} color={colors.textTertiary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12 }}>No Hotels Yet</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>Hotel recommendations will appear once the trip is enriched.</Text>
        </View>
      </PageTransition>
    );
  }
  const currentRoom = hotel.roomTypes.length > 0 ? hotel.roomTypes[selectedRoom] : null;

  const handleBook = () => {
    const conf = generateConfirmation();
    setConfirmationNumber(conf);
    setBooked(true);
  };

  return (
    <PageTransition>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Browse Hotels ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <SectionToggle
          title="Browse Hotels"
          icon="search"
          isOpen={showBrowse}
          onToggle={() => setShowBrowse(!showBrowse)}
          badge={`${filteredHotels.length} hotels`}
        />
        {showBrowse && (
          <View style={{ marginTop: 10 }}>
            <HotelFilterBar
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              sortBy={sortBy}
              setSortBy={setSortBy}
              starFilter={starFilter}
              setStarFilter={setStarFilter}
              amenityFilter={amenityFilter}
              setAmenityFilter={setAmenityFilter}
              brandFilter={brandFilter}
              setBrandFilter={setBrandFilter}
            />
            {isLoading ? (
              <HotelSkeleton />
            ) : filteredHotels.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <FontAwesome name="search" size={24} color="#d1d5db" />
                <Text style={{ ...TextStyles.bodyLg, color: colors.textTertiary, marginTop: 8 }}>No hotels match your filters</Text>
              </View>
            ) : (
              filteredHotels.map((h) => <BrowseHotelCard key={h.id} hotel={h} />)
            )}
          </View>
        )}
      </View>

      {/* ── Selected Hotel Detail ── */}
      <View style={{ backgroundColor: colors.background, borderRadius: 0, overflow: 'hidden' }}>

        {/* Image Carousel — only show if we have real images */}
        {hotel.images.length > 0 && <ImageCarousel images={hotel.images} height={240} />}

        {/* Hotel Info Header */}
        <View style={{ padding: 16 }}>

          {/* Name & Stars Row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ ...TextStyles.title, color: colors.text }}>{hotel.name}</Text>
              {hotel.stars > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <StarRow count={hotel.stars} />
                  <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>{hotel.stars}-star hotel</Text>
                </View>
              )}
            </View>
            {hotel.rating > 0 && (
              <View style={{ alignItems: 'flex-end' }}>
                <RatingBadge rating={hotel.rating} />
                {!!hotel.guestRatings.label && (
                  <Text style={{ ...TextStyles.smEm, color: ratingColor(hotel.rating, ACCENT), marginTop: 3 }}>
                    {hotel.guestRatings.label}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Address */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
            <FontAwesome name="map-marker" size={13} color="#9ca3af" />
            <Text style={{ ...TextStyles.body, color: colors.textSecondary, flex: 1 }}>{hotel.address}</Text>
          </View>

          {/* Reviews count — only show if we have real review data */}
          {hotel.reviews > 0 && (
            <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 4 }}>
              {hotel.reviews.toLocaleString()} verified reviews
            </Text>
          )}

          {/* Check-in / Check-out Badges — only show if dates available */}
          {(!!hotel.checkIn || !!hotel.checkOut) && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {!!hotel.checkIn && (
                <View style={{ flex: 1, backgroundColor: ACCENT + '08', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: ACCENT + '15' }}>
                  <Text style={{ ...TextStyles.smEm, color: ACCENT, marginBottom: 2 }}>Check-in</Text>
                  <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>{hotel.checkIn}</Text>
                </View>
              )}
              {!!hotel.checkOut && (
                <View style={{ flex: 1, backgroundColor: ACCENT + '08', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: ACCENT + '15' }}>
                  <Text style={{ ...TextStyles.smEm, color: ACCENT, marginBottom: 2 }}>Check-out</Text>
                  <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>{hotel.checkOut}</Text>
                </View>
              )}
            </View>
          )}

          {/* Cancellation — only show if policy text exists */}
          {!!hotel.cancellation && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#bbf7d0' }}>
              <FontAwesome name="shield" size={11} color="#16a34a" />
              <Text style={{ ...TextStyles.captionEm, color: '#16a34a' }}>{hotel.cancellation}</Text>
            </View>
          )}

          {/* ── Collapsible Sections ── */}

          {/* Room Selection — only show if real room data exists */}
          {hotel.roomTypes.length > 0 && currentRoom && (
            <RoomSelection rooms={hotel.roomTypes} selectedRoom={selectedRoom} onSelect={setSelectedRoom} />
          )}

          {/* Price Breakdown — only show if real room data exists */}
          {currentRoom && currentRoom.price > 0 && (
            <PriceBreakdown room={currentRoom} pricePerNight={currentRoom.price} />
          )}

          {/* Contact & Location — only shown when at least one field is populated */}
          {(!!hotel.phone || !!hotel.email || !!hotel.address) && (
            <ContactActions phone={hotel.phone} email={hotel.email} address={hotel.address} />
          )}

          {/* Guest Ratings — only show if we have a real overall rating */}
          {hotel.guestRatings.overall > 0 && (
            <GuestRatingsSection ratings={hotel.guestRatings} reviews={hotel.reviews} />
          )}

          {/* Amenities */}
          <AmenitiesSection categories={hotel.amenityCategories} />

          {/* Hotel Policies */}
          <HotelPoliciesSection />

          {/* Book Hotel Button — only show if rooms are available */}
          {currentRoom && (
          <View style={{ marginTop: 20 }}>
            {booked ? (
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' }}>
                <FontAwesome name="check-circle" size={28} color="#16a34a" />
                <Text style={{ ...TextStyles.subhead, color: '#16a34a', marginTop: 8 }}>Hotel Booked!</Text>
                <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginTop: 4 }}>Confirmation: {confirmationNumber}</Text>
                <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 2 }}>
                  {currentRoom.type} {'\u00b7'} {'\u20ac'}{currentRoom.price}/night
                </Text>
              </View>
            ) : (
              <Pressable onPress={handleBook}>
                <LinearGradient
                  colors={[ACCENT, ACCENT]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 12, paddingVertical: 15,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  <FontAwesome name="calendar-check-o" size={16} color="#fff" />
                  <Text style={{ ...TextStyles.subhead, color: '#fff' }}>Book Hotel</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
          )}
        </View>
      </View>

      {/* ── Other Hotels ── */}
      {realHotels.length > 1 && (
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={{ ...TextStyles.subhead, color: colors.text, marginBottom: 12 }}>Other Hotels</Text>
          {realHotels.slice(1).map((h: any) => (
            <OtherHotelCard key={h.id} hotel={h} />
          ))}
        </View>
      )}

      {/* ── Add Hotel Button (dashed border) ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
        <Pressable
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 14, borderRadius: 12,
            borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
          }}
        >
          <FontAwesome name="plus-circle" size={16} color="#9ca3af" />
          <Text style={{ ...TextStyles.bodyLg, color: colors.textTertiary }}>Add Hotel</Text>
        </Pressable>
      </View>
    </ScrollView>
    </PageTransition>
  );
}
