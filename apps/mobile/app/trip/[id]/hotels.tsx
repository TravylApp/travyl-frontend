import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Linking, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Navy } from '@travyl/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ratingColor(r: number): string {
  if (r >= 9) return '#10b981';
  if (r >= 8) return Navy.DEFAULT;
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
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: isOpen ? 10 : 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name={icon as any} size={14} color={Navy.DEFAULT} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{title}</Text>
        {badge && (
          <View style={{ backgroundColor: Navy.DEFAULT + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
            <Text style={{ fontSize: 10, color: Navy.DEFAULT, fontWeight: '600' }}>{badge}</Text>
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
  return (
    <View style={{ backgroundColor: ratingColor(rating), paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }}>
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{rating}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Image Carousel                                                     */
/* ------------------------------------------------------------------ */

function ImageCarousel({ images, height = 220 }: { images: string[]; height?: number }) {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <View style={{ width: '100%', height, backgroundColor: '#e5e7eb', position: 'relative' }}>
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
                  borderColor: isSelected ? Navy.DEFAULT : '#e5e7eb',
                  backgroundColor: isSelected ? Navy.DEFAULT + '08' : '#fff',
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
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? Navy.DEFAULT : '#1e293b' }}>
                        {room.type}
                      </Text>
                      {isSelected && (
                        <View style={{ backgroundColor: Navy.DEFAULT, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>Selected</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: isSelected ? Navy.DEFAULT : '#1e293b' }}>
                        {'\u20ac'}{room.price}
                      </Text>
                      <Text style={{ fontSize: 9, color: '#9ca3af' }}>per night</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{room.beds}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <FontAwesome name="users" size={9} color="#9ca3af" />
                      <Text style={{ fontSize: 10, color: '#6b7280' }}>{room.guests}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#6b7280' }}>{room.size}</Text>
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
        <View style={{ backgroundColor: Navy.DEFAULT + '08', borderRadius: 10, padding: 14 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Room</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: Navy.DEFAULT }}>{room.type}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Nightly Rate</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: Navy.DEFAULT }}>{'\u20ac'}{pricePerNight}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{nights} nights subtotal</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: Navy.DEFAULT }}>{'\u20ac'}{subtotal.toFixed(2)}</Text>
            </View>

            <View style={{ height: 1, backgroundColor: Navy.DEFAULT + '15', marginVertical: 4 }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Taxes & Fees
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>City Tax</Text>
              <Text style={{ fontSize: 12, color: '#374151' }}>{'\u20ac'}{cityTax.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>Service Fee</Text>
              <Text style={{ fontSize: 12, color: '#374151' }}>{'\u20ac'}{serviceFee.toFixed(2)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>VAT (10%)</Text>
              <Text style={{ fontSize: 12, color: '#374151' }}>{'\u20ac'}{vat.toFixed(2)}</Text>
            </View>

            <View style={{ height: 1, backgroundColor: Navy.DEFAULT + '25', marginVertical: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>Total</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: Navy.DEFAULT }}>{'\u20ac'}{total.toFixed(2)}</Text>
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
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 10 }}>Contact & Location</Text>
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
            backgroundColor: '#eff6ff', borderRadius: 10, paddingVertical: 12,
            borderWidth: 1, borderColor: '#bfdbfe',
          }}
        >
          <FontAwesome name="envelope" size={13} color="#2563eb" />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#2563eb' }}>Email</Text>
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
        <View style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
          {/* Overall score */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <View
              style={{
                width: 48, height: 48, borderRadius: 12,
                backgroundColor: ratingColor(ratings.overall),
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{ratings.overall}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b' }}>{ratings.label}</Text>
              <Text style={{ fontSize: 11, color: '#9ca3af' }}>{reviews.toLocaleString()} reviews</Text>
            </View>
          </View>

          {/* Sub-scores with progress bars */}
          <View style={{ gap: 10 }}>
            {subscores.map((s) => (
              <View key={s.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: Navy.DEFAULT }}>{s.value}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3 }}>
                  <View
                    style={{
                      height: 6, borderRadius: 3,
                      backgroundColor: ratingColor(s.value),
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
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                {cat.category}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {cat.items.map((item) => (
                  <View
                    key={item.name}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: '#f1f5f9', borderRadius: 8,
                      paddingHorizontal: 10, paddingVertical: 7,
                      borderWidth: 1, borderColor: '#e2e8f0',
                    }}
                  >
                    <FontAwesome name={item.icon as any} size={11} color={Navy.DEFAULT} />
                    <Text style={{ fontSize: 11, color: '#475569', fontWeight: '500' }}>{item.name}</Text>
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
  return (
    <View
      style={{
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', marginBottom: 10,
      }}
    >
      <Image source={{ uri: hotel.image }} style={{ width: 90, height: 100 }} resizeMode="cover" />
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b', flex: 1 }} numberOfLines={1}>
              {hotel.name}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: Navy.DEFAULT, marginLeft: 8 }}>
              {'\u20ac'}{hotel.price}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <StarRow count={hotel.stars} />
            <Text style={{ fontSize: 10, color: '#9ca3af', marginLeft: 4 }}>{hotel.neighborhood}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <RatingBadge rating={hotel.rating} />
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>{hotel.label}</Text>
          <Text style={{ fontSize: 10, color: '#9ca3af' }}>{hotel.reviews.toLocaleString()} reviews</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function HotelsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedRoom, setSelectedRoom] = useState(0);
  const [booked, setBooked] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState('');

  const hotel = SELECTED_HOTEL;
  const currentRoom = hotel.roomTypes[selectedRoom];

  const handleBook = () => {
    const conf = generateConfirmation();
    setConfirmationNumber(conf);
    setBooked(true);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Selected Hotel Detail ── */}
      <View style={{ backgroundColor: '#fff', borderRadius: 0, overflow: 'hidden' }}>

        {/* Image Carousel */}
        <ImageCarousel images={hotel.images} height={240} />

        {/* Hotel Info Header */}
        <View style={{ padding: 16 }}>

          {/* Name & Stars Row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1e293b' }}>{hotel.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <StarRow count={hotel.stars} />
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>{hotel.stars}-star hotel</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <RatingBadge rating={hotel.rating} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: ratingColor(hotel.rating), marginTop: 3 }}>
                {hotel.guestRatings.label}
              </Text>
            </View>
          </View>

          {/* Address */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
            <FontAwesome name="map-marker" size={13} color="#9ca3af" />
            <Text style={{ fontSize: 12, color: '#6b7280', flex: 1 }}>{hotel.address}</Text>
          </View>

          {/* Reviews count */}
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
            {hotel.reviews.toLocaleString()} verified reviews
          </Text>

          {/* Check-in / Check-out Badges */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1, backgroundColor: Navy.DEFAULT + '08', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Navy.DEFAULT + '15' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: Navy.DEFAULT, marginBottom: 2 }}>Check-in</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>Mar 22 {'\u00b7'} {hotel.checkIn}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: Navy.DEFAULT + '08', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Navy.DEFAULT + '15' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: Navy.DEFAULT, marginBottom: 2 }}>Check-out</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>Mar 27 {'\u00b7'} {hotel.checkOut}</Text>
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

          {/* Book Hotel Button */}
          <View style={{ marginTop: 20 }}>
            {booked ? (
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' }}>
                <FontAwesome name="check-circle" size={28} color="#16a34a" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#16a34a', marginTop: 8 }}>Hotel Booked!</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Confirmation: {confirmationNumber}</Text>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  {currentRoom.type} {'\u00b7'} {'\u20ac'}{currentRoom.price}/night {'\u00b7'} 5 nights
                </Text>
              </View>
            ) : (
              <Pressable onPress={handleBook}>
                <LinearGradient
                  colors={[Navy.DEFAULT, Navy.light]}
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
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 12 }}>Other Hotels</Text>
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
            borderWidth: 1.5, borderColor: '#d1d5db', borderStyle: 'dashed',
          }}
        >
          <FontAwesome name="plus-circle" size={16} color="#9ca3af" />
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#9ca3af' }}>Add Hotel</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
