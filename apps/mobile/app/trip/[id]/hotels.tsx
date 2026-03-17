import { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { PageTransition, useTabAccent } from './_layout';
import { useThemeColors } from '@/hooks/useThemeColors';


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
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const SELECTED_HOTEL: HotelData = {
  id: 'h1',
  name: 'H\u00f4tel Le Marais',
  stars: 4,
  rating: 9.2,
  reviews: 847,
  price: 285,
  address: '16 Rue du Temple, 75004 Paris, France',
  neighborhood: 'Le Marais',
  images: [
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800',
    'https://images.unsplash.com/photo-1590490360182-c33d7d9d4048?w=800',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
  ],
  amenities: ['WiFi', 'Breakfast', 'Spa', 'Parking', 'Gym', 'AC', 'Room Service', 'Bar'],
  amenityCategories: [
    {
      category: 'Room',
      items: [
        { name: 'Free WiFi', icon: 'wifi' },
        { name: 'Air Conditioning', icon: 'snowflake-o' },
        { name: 'Minibar', icon: 'glass' },
        { name: 'Safe', icon: 'lock' },
      ],
    },
    {
      category: 'Dining',
      items: [
        { name: 'Breakfast Buffet', icon: 'coffee' },
        { name: 'Restaurant', icon: 'cutlery' },
        { name: 'Bar / Lounge', icon: 'glass' },
        { name: 'Room Service', icon: 'bell' },
      ],
    },
    {
      category: 'Wellness',
      items: [
        { name: 'Spa & Sauna', icon: 'leaf' },
        { name: 'Fitness Center', icon: 'heartbeat' },
      ],
    },
    {
      category: 'Services',
      items: [
        { name: 'Concierge', icon: 'user' },
        { name: 'Parking', icon: 'car' },
        { name: 'Laundry', icon: 'recycle' },
        { name: '24h Front Desk', icon: 'clock-o' },
      ],
    },
  ],
  roomTypes: [
    {
      type: 'Classic Double',
      beds: '1 Queen Bed',
      guests: 2,
      size: '22m\u00b2',
      price: 285,
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400',
      amenities: ['WiFi', 'AC', 'Minibar'],
    },
    {
      type: 'Superior Double',
      beds: '1 King Bed',
      guests: 2,
      size: '30m\u00b2',
      price: 345,
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400',
      amenities: ['WiFi', 'AC', 'Minibar', 'Balcony'],
    },
    {
      type: 'Junior Suite',
      beds: '1 King Bed + Sofa',
      guests: 3,
      size: '42m\u00b2',
      price: 425,
      image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400',
      amenities: ['WiFi', 'AC', 'Minibar', 'Lounge', 'Balcony'],
    },
    {
      type: 'Deluxe Suite',
      beds: '1 King Bed + Living Room',
      guests: 4,
      size: '58m\u00b2',
      price: 595,
      image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400',
      amenities: ['WiFi', 'AC', 'Minibar', 'Lounge', 'Balcony', 'Jacuzzi'],
    },
  ],
  checkIn: '3:00 PM',
  checkOut: '11:00 AM',
  cancellation: 'Free cancellation until Mar 18',
  phone: '+33-1-42-72-34-12',
  email: 'reservations@hotelmarais.fr',
  guestRatings: {
    overall: 9.2,
    label: 'Exceptional',
    cleanliness: 9.5,
    staff: 9.3,
    location: 9.6,
    comfort: 9.0,
    value: 8.8,
  },
};

const OTHER_HOTELS: { id: string; name: string; stars: number; rating: number; label: string; reviews: number; price: number; neighborhood: string; image: string }[] = [
  {
    id: 'h2',
    name: 'Grand Hotel du Palais Royal',
    stars: 5,
    rating: 9.4,
    label: 'Exceptional',
    reviews: 632,
    price: 420,
    neighborhood: 'Near Louvre',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
  },
  {
    id: 'h3',
    name: 'Hotel des Arts Montmartre',
    stars: 3,
    rating: 8.1,
    label: 'Very Good',
    reviews: 1204,
    price: 145,
    neighborhood: 'Montmartre',
    image: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=400',
  },
  {
    id: 'h4',
    name: 'Pullman Paris Tour Eiffel',
    stars: 4,
    rating: 8.7,
    label: 'Excellent',
    reviews: 978,
    price: 310,
    neighborhood: 'Trocad\u00e9ro',
    image: 'https://images.unsplash.com/photo-1529551739587-e242c564f727?w=400',
  },
];

const BROWSE_HOTELS = [
  { id: 'h1', name: 'Hotel Le Marais', stars: 4, rating: 8.7, reviews: 1243, price: 189, neighborhood: 'Le Marais', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', amenities: ['WiFi', 'Breakfast', 'AC'], brand: 'Accor', label: 'Great Value' },
  { id: 'h2', name: 'Grand Hotel du Palais Royal', stars: 5, rating: 9.2, reviews: 876, price: 350, neighborhood: 'Louvre', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400', amenities: ['WiFi', 'Breakfast', 'Pool', 'Spa', 'Gym'], brand: 'Marriott', label: 'Top Pick' },
  { id: 'h3', name: 'Hotel des Arts Montmartre', stars: 3, rating: 8.1, reviews: 654, price: 120, neighborhood: 'Montmartre', image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400', amenities: ['WiFi', 'AC'], brand: 'Best Western', label: 'Budget Friendly' },
  { id: 'h4', name: 'Pullman Paris Tour Eiffel', stars: 4, rating: 8.9, reviews: 2105, price: 275, neighborhood: 'Trocadero', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400', amenities: ['WiFi', 'Breakfast', 'Pool', 'Parking', 'Gym'], brand: 'Accor', label: 'Popular' },
];

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
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{title}</Text>
        {badge && (
          <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, color: ACCENT, fontWeight: '600' }}>{badge}</Text>
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
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{rating}</Text>
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
      <Image source={{ uri: images[idx] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
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
                  source={{ uri: room.image }}
                  style={{ width: 80, height: 90 }}
                  resizeMode="cover"
                />
                <View style={{ flex: 1, padding: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? ACCENT : colors.text }}>
                        {room.type}
                      </Text>
                      {isSelected && (
                        <View style={{ backgroundColor: ACCENT, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>Selected</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: isSelected ? ACCENT : colors.text }}>
                        {'\u20ac'}{room.price}
                      </Text>
                      <Text style={{ fontSize: 9, color: colors.textTertiary }}>per night</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>{room.beds}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <FontAwesome name="users" size={9} color="#9ca3af" />
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>{room.guests}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>{room.size}</Text>
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
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Room</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{room.type}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Nightly Rate</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{'\u20ac'}{pricePerNight}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{nights} nights subtotal</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{'\u20ac'}{subtotal.toFixed(2)}</Text>
            </View>

            <View style={{ height: 1, backgroundColor: ACCENT + '15', marginVertical: 4 }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Taxes & Fees
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>City Tax</Text>
              <Text style={{ fontSize: 12, color: colors.text }}>{'\u20ac'}{cityTax.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Service Fee</Text>
              <Text style={{ fontSize: 12, color: colors.text }}>{'\u20ac'}{serviceFee.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>VAT (10%)</Text>
              <Text style={{ fontSize: 12, color: colors.text }}>{'\u20ac'}{vat.toFixed(2)}</Text>
            </View>

            <View style={{ height: 1, backgroundColor: ACCENT + '25', marginVertical: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>Total</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: ACCENT }}>{'\u20ac'}{total.toFixed(2)}</Text>
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
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Contact & Location</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => Linking.openURL(`tel:${phone}`)}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: '#f0fdf4', borderRadius: 10, paddingVertical: 12,
            borderWidth: 1, borderColor: '#bbf7d0',
          }}
        >
          <FontAwesome name="phone" size={14} color="#16a34a" />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#16a34a' }}>Call</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(`mailto:${email}`)}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: ACCENT + '10', borderRadius: 10, paddingVertical: 12,
            borderWidth: 1, borderColor: ACCENT + '25',
          }}
        >
          <FontAwesome name="envelope" size={13} color={ACCENT} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>Email</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)}
          style={{
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: '#fef3c7', borderRadius: 10, paddingVertical: 12,
            borderWidth: 1, borderColor: '#fde68a',
          }}
        >
          <FontAwesome name="map-marker" size={14} color="#d97706" />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#d97706' }}>Map</Text>
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
  ];

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Guest Ratings"
        icon="star-half-full"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={`${ratings.overall} ${ratings.label}`}
      />
      {isOpen && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          {/* Overall score */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View
              style={{
                width: 48, height: 48, borderRadius: 12,
                backgroundColor: ratingColor(ratings.overall, ACCENT),
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{ratings.overall}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{ratings.label}</Text>
              <Text style={{ fontSize: 11, color: colors.textTertiary }}>{reviews.toLocaleString()} reviews</Text>
            </View>
          </View>

          {/* Sub-scores with progress bars */}
          <View style={{ gap: 10 }}>
            {subscores.map((s) => (
              <View key={s.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{s.label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: ACCENT }}>{s.value}</Text>
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
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
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
                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>{item.name}</Text>
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

function OtherHotelCard({ hotel }: { hotel: typeof OTHER_HOTELS[number] }) {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 12,
        borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 10,
      }}
    >
      <Image source={{ uri: hotel.image }} style={{ width: 90, height: 100 }} resizeMode="cover" />
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
              {hotel.name}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: ACCENT, marginLeft: 8 }}>
              {'\u20ac'}{hotel.price}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <StarRow count={hotel.stars} />
            <Text style={{ fontSize: 10, color: colors.textTertiary, marginLeft: 4 }}>{hotel.neighborhood}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <RatingBadge rating={hotel.rating} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>{hotel.label}</Text>
          <Text style={{ fontSize: 10, color: colors.textTertiary }}>{hotel.reviews.toLocaleString()} reviews</Text>
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
          <Text style={{ fontSize: 12, fontWeight: '600', color: activeCount > 0 ? ACCENT : colors.textSecondary }}>Filters</Text>
          {activeCount > 0 && (
            <View style={{ backgroundColor: ACCENT, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{activeCount}</Text>
            </View>
          )}
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FontAwesome name="sort" size={12} color="#9ca3af" />
          <Pressable onPress={() => {
            const idx = SORT_OPTIONS.findIndex((o) => o.key === sortBy);
            setSortBy(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].key);
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>
              {SORT_OPTIONS.find((o) => o.key === sortBy)?.label}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Expanded filters */}
      {showFilters && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          {/* Star rating */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
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
                  <Text style={{ fontSize: 12, fontWeight: '600', color: active ? ACCENT : colors.textSecondary }}>{s}</Text>
                  <FontAwesome name="star" size={10} color={active ? '#fbbf24' : colors.border} />
                </Pressable>
              );
            })}
          </View>

          {/* Amenities */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
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
                  <Text style={{ fontSize: 11, fontWeight: '500', color: active ? ACCENT : colors.textSecondary }}>{a}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Brands */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
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
                  <Text style={{ fontSize: 11, fontWeight: '500', color: active ? ACCENT : colors.textSecondary }}>{b}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Reset */}
          {activeCount > 0 && (
            <Pressable onPress={resetAll} style={{ alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#ef4444' }}>Reset Filters</Text>
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

function BrowseHotelCard({ hotel }: { hotel: typeof BROWSE_HOTELS[number] }) {
  const ACCENT = useTabAccent('hotels');
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 12,
        borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 10,
      }}
    >
      <Image source={{ uri: hotel.image }} style={{ width: 110, height: 120 }} resizeMode="cover" />
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
              {hotel.name}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <StarRow count={hotel.stars} />
            <Text style={{ fontSize: 10, color: colors.textTertiary, marginLeft: 4 }}>{hotel.neighborhood}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <RatingBadge rating={hotel.rating} />
          <Text style={{ fontSize: 10, color: colors.textTertiary }}>{hotel.reviews.toLocaleString()} reviews</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          {hotel.label ? (
            <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 9, fontWeight: '600', color: ACCENT }}>{hotel.label}</Text>
            </View>
          ) : <View />}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: ACCENT }}>{'\u20ac'}{hotel.price}</Text>
            <Text style={{ fontSize: 9, color: colors.textTertiary }}>per night</Text>
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
                  <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '600' }}>{p.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>{p.value}</Text>
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

  const filteredHotels = useMemo(() => {
    let result = [...BROWSE_HOTELS];
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

  const hotel = SELECTED_HOTEL;
  const currentRoom = hotel.roomTypes[selectedRoom];

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
                <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 8 }}>No hotels match your filters</Text>
              </View>
            ) : (
              filteredHotels.map((h) => <BrowseHotelCard key={h.id} hotel={h} />)
            )}
          </View>
        )}
      </View>

      {/* ── Selected Hotel Detail ── */}
      <View style={{ backgroundColor: colors.background, borderRadius: 0, overflow: 'hidden' }}>

        {/* Image Carousel */}
        <ImageCarousel images={hotel.images} height={240} />

        {/* Hotel Info Header */}
        <View style={{ padding: 16 }}>

          {/* Name & Stars Row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{hotel.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <StarRow count={hotel.stars} />
                <Text style={{ fontSize: 11, color: colors.textTertiary }}>{hotel.stars}-star hotel</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <RatingBadge rating={hotel.rating} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: ratingColor(hotel.rating, ACCENT), marginTop: 3 }}>
                {hotel.guestRatings.label}
              </Text>
            </View>
          </View>

          {/* Address */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
            <FontAwesome name="map-marker" size={13} color="#9ca3af" />
            <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>{hotel.address}</Text>
          </View>

          {/* Reviews count */}
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}>
            {hotel.reviews.toLocaleString()} verified reviews
          </Text>

          {/* Check-in / Check-out Badges */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1, backgroundColor: ACCENT + '08', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: ACCENT + '15' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: ACCENT, marginBottom: 2 }}>Check-in</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Mar 22 {'\u00b7'} {hotel.checkIn}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: ACCENT + '08', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: ACCENT + '15' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: ACCENT, marginBottom: 2 }}>Check-out</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>Mar 27 {'\u00b7'} {hotel.checkOut}</Text>
            </View>
          </View>

          {/* Cancellation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#bbf7d0' }}>
            <FontAwesome name="shield" size={11} color="#16a34a" />
            <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '600' }}>{hotel.cancellation}</Text>
          </View>

          {/* ── Collapsible Sections ── */}

          {/* Room Selection */}
          <RoomSelection rooms={hotel.roomTypes} selectedRoom={selectedRoom} onSelect={setSelectedRoom} />

          {/* Price Breakdown */}
          <PriceBreakdown room={currentRoom} pricePerNight={currentRoom.price} />

          {/* Contact & Location */}
          <ContactActions phone={hotel.phone} email={hotel.email} address={hotel.address} />

          {/* Guest Ratings */}
          <GuestRatingsSection ratings={hotel.guestRatings} reviews={hotel.reviews} />

          {/* Amenities */}
          <AmenitiesSection categories={hotel.amenityCategories} />

          {/* Hotel Policies */}
          <HotelPoliciesSection />

          {/* Book Hotel Button */}
          <View style={{ marginTop: 20 }}>
            {booked ? (
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' }}>
                <FontAwesome name="check-circle" size={28} color="#16a34a" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#16a34a', marginTop: 8 }}>Hotel Booked!</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Confirmation: {confirmationNumber}</Text>
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                  {currentRoom.type} {'\u00b7'} {'\u20ac'}{currentRoom.price}/night {'\u00b7'} 5 nights
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
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Book Hotel</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* ── Other Hotels ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Other Hotels</Text>
        {OTHER_HOTELS.map((h) => (
          <OtherHotelCard key={h.id} hotel={h} />
        ))}
      </View>

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
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textTertiary }}>Add Hotel</Text>
        </Pressable>
      </View>
    </ScrollView>
    </PageTransition>
  );
}
