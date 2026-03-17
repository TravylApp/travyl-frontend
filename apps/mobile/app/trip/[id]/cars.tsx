import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { PageTransition, useTabAccent } from './_layout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CarFeature {
  name: string;
  icon: string;
}

interface CarData {
  id: string;
  name: string;
  category: string;
  image: string;
  images: string[];
  seats: number;
  doors: number;
  transmission: 'Automatic' | 'Manual';
  fuelType: string;
  ac: boolean;
  bags: { large: number; small: number };
  pricePerDay: number;
  provider: string;
  providerLogo: string;
  rating: number;
  reviews: number;
  features: CarFeature[];
  mileage: string;
  fuelPolicy: string;
  deposit: number;
  insuranceIncluded: boolean;
}

interface RentalBooking {
  car: CarData;
  pickupLocation: string;
  pickupAddress: string;
  pickupDate: string;
  pickupTime: string;
  dropoffLocation: string;
  dropoffAddress: string;
  dropoffDate: string;
  dropoffTime: string;
  days: number;
  confirmation: string;
  extras: { name: string; price: number }[];
}

/* ------------------------------------------------------------------ */
/*  Mock Data — Paris trip                                             */
/* ------------------------------------------------------------------ */

const CAR_CATEGORIES = ['All', 'Economy', 'Compact', 'SUV', 'Luxury', 'Van'] as const;
type CarCategory = (typeof CAR_CATEGORIES)[number];

const CATEGORY_ICONS: Record<string, string> = {
  All: 'th-large',
  Economy: 'leaf',
  Compact: 'car',
  SUV: 'truck',
  Luxury: 'diamond',
  Van: 'bus',
};

const BOOKED_RENTAL: RentalBooking = {
  car: {
    id: 'c1',
    name: 'Peugeot 3008 GT',
    category: 'SUV',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=800',
    images: [
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=800',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800',
    ],
    seats: 5,
    doors: 5,
    transmission: 'Automatic',
    fuelType: 'Diesel',
    ac: true,
    bags: { large: 2, small: 1 },
    pricePerDay: 68,
    provider: 'Europcar',
    providerLogo: 'EU',
    rating: 8.6,
    reviews: 342,
    features: [
      { name: 'GPS Navigation', icon: 'location-arrow' },
      { name: 'Bluetooth', icon: 'bluetooth-b' },
      { name: 'Cruise Control', icon: 'tachometer' },
      { name: 'Parking Sensors', icon: 'dot-circle-o' },
      { name: 'Apple CarPlay', icon: 'apple' },
      { name: 'USB Charging', icon: 'usb' },
    ],
    mileage: 'Unlimited',
    fuelPolicy: 'Full-to-Full',
    deposit: 500,
    insuranceIncluded: true,
  },
  pickupLocation: 'Paris CDG Airport',
  pickupAddress: 'Terminal 2E, Arrivals Hall',
  pickupDate: 'Mar 22, 2026',
  pickupTime: '10:00 AM',
  dropoffLocation: 'Paris CDG Airport',
  dropoffAddress: 'Terminal 2E, Departures',
  dropoffDate: 'Mar 27, 2026',
  dropoffTime: '8:00 AM',
  days: 5,
  confirmation: 'TRV-EU8K42NP',
  extras: [
    { name: 'Additional Driver', price: 10 },
    { name: 'Child Seat (ISOFIX)', price: 8 },
  ],
};

const OTHER_CARS: CarData[] = [
  {
    id: 'c2',
    name: 'Renault Clio',
    category: 'Economy',
    image: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400',
    images: ['https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400'],
    seats: 5,
    doors: 5,
    transmission: 'Manual',
    fuelType: 'Petrol',
    ac: true,
    bags: { large: 1, small: 1 },
    pricePerDay: 32,
    provider: 'Hertz',
    providerLogo: 'HZ',
    rating: 7.8,
    reviews: 518,
    features: [
      { name: 'Bluetooth', icon: 'bluetooth-b' },
      { name: 'USB Charging', icon: 'usb' },
    ],
    mileage: 'Unlimited',
    fuelPolicy: 'Full-to-Full',
    deposit: 300,
    insuranceIncluded: true,
  },
  {
    id: 'c3',
    name: 'BMW 3 Series',
    category: 'Luxury',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400',
    images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400'],
    seats: 5,
    doors: 4,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    ac: true,
    bags: { large: 2, small: 1 },
    pricePerDay: 95,
    provider: 'Sixt',
    providerLogo: 'SX',
    rating: 9.1,
    reviews: 267,
    features: [
      { name: 'GPS Navigation', icon: 'location-arrow' },
      { name: 'Leather Seats', icon: 'certificate' },
      { name: 'Heated Seats', icon: 'fire' },
      { name: 'Parking Sensors', icon: 'dot-circle-o' },
    ],
    mileage: 'Unlimited',
    fuelPolicy: 'Full-to-Full',
    deposit: 800,
    insuranceIncluded: true,
  },
  {
    id: 'c4',
    name: 'Citroen Berlingo',
    category: 'Van',
    image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=400',
    images: ['https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=400'],
    seats: 7,
    doors: 5,
    transmission: 'Manual',
    fuelType: 'Diesel',
    ac: true,
    bags: { large: 4, small: 2 },
    pricePerDay: 55,
    provider: 'Europcar',
    providerLogo: 'EU',
    rating: 8.0,
    reviews: 189,
    features: [
      { name: 'GPS Navigation', icon: 'location-arrow' },
      { name: 'Bluetooth', icon: 'bluetooth-b' },
      { name: 'Rear Camera', icon: 'video-camera' },
    ],
    mileage: 'Unlimited',
    fuelPolicy: 'Full-to-Full',
    deposit: 400,
    insuranceIncluded: false,
  },
  {
    id: 'c5',
    name: 'Volkswagen Golf',
    category: 'Compact',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400',
    images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400'],
    seats: 5,
    doors: 5,
    transmission: 'Automatic',
    fuelType: 'Petrol',
    ac: true,
    bags: { large: 1, small: 2 },
    pricePerDay: 45,
    provider: 'Avis',
    providerLogo: 'AV',
    rating: 8.4,
    reviews: 421,
    features: [
      { name: 'GPS Navigation', icon: 'location-arrow' },
      { name: 'Apple CarPlay', icon: 'apple' },
      { name: 'Cruise Control', icon: 'tachometer' },
    ],
    mileage: 'Unlimited',
    fuelPolicy: 'Full-to-Full',
    deposit: 350,
    insuranceIncluded: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ratingColor(r: number): string {
  if (r >= 9) return '#10b981';
  if (r >= 8) return '#1e3a5f';
  return '#f97316';
}

function generateConfirmation(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TRV-';
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonCarCard() {
  const ACCENT = useTabAccent('cars');
  const colors = useThemeColors();
  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ height: 130, backgroundColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome name="car" size={32} color="#d1d5db" />
      </View>
      <View style={{ padding: 14 }}>
        <SkeletonBlock width="60%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonBlock width="40%" height={12} style={{ marginBottom: 10 }} />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <FontAwesome name="users" size={10} color="#9ca3af" />
            <SkeletonBlock width={20} height={10} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <FontAwesome name="cog" size={10} color="#9ca3af" />
            <SkeletonBlock width={40} height={10} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <FontAwesome name="snowflake-o" size={10} color="#9ca3af" />
            <SkeletonBlock width={20} height={10} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <SkeletonBlock width={70} height={20} />
          <View style={{ backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
            <SkeletonBlock width={60} height={12} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
          </View>
        </View>
      </View>
    </View>
  );
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
  const ACCENT = useTabAccent('cars');
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
/*  Car Specs Row                                                      */
/* ------------------------------------------------------------------ */

function CarSpecsRow({ car }: { car: CarData }) {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <FontAwesome name="users" size={11} color="#9ca3af" />
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{car.seats} seats</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <FontAwesome name="cog" size={11} color="#9ca3af" />
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{car.transmission}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <FontAwesome name="snowflake-o" size={11} color="#9ca3af" />
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{car.ac ? 'A/C' : 'No A/C'}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <FontAwesome name="suitcase" size={11} color="#9ca3af" />
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{car.bags.large}L {car.bags.small}S</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <FontAwesome name="tint" size={11} color="#9ca3af" />
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{car.fuelType}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <FontAwesome name="columns" size={11} color="#9ca3af" />
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{car.doors} doors</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Pickup / Dropoff Section                                           */
/* ------------------------------------------------------------------ */

function PickupDropoffSection({ booking }: { booking: RentalBooking }) {
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Pickup & Drop-off"
        icon="map-marker"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={`${booking.days} days`}
      />
      {isOpen && (
        <View style={{ gap: 10 }}>
          {/* Pickup */}
          <View style={{ backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#bbf7d0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome name="arrow-up" size={10} color="#fff" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a' }}>Pickup</Text>
            </View>
            <View style={{ gap: 4, paddingLeft: 30 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FontAwesome name="building" size={10} color="#6b7280" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{booking.pickupLocation}</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{booking.pickupAddress}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <FontAwesome name="calendar" size={10} color="#6b7280" />
                <Text style={{ fontSize: 12, color: colors.text }}>{booking.pickupDate}</Text>
                <Text style={{ fontSize: 12, color: colors.border }}>{'\u00b7'}</Text>
                <FontAwesome name="clock-o" size={10} color="#6b7280" />
                <Text style={{ fontSize: 12, color: colors.text }}>{booking.pickupTime}</Text>
              </View>
            </View>
          </View>

          {/* Connector line */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 2, height: 16, backgroundColor: colors.border }} />
            <FontAwesome name="long-arrow-down" size={14} color="#9ca3af" />
            <View style={{ width: 2, height: 16, backgroundColor: colors.border }} />
          </View>

          {/* Dropoff */}
          <View style={{ backgroundColor: '#fef3c7', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#fde68a' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#d97706', alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome name="arrow-down" size={10} color="#fff" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#d97706' }}>Drop-off</Text>
            </View>
            <View style={{ gap: 4, paddingLeft: 30 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FontAwesome name="building" size={10} color="#6b7280" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{booking.dropoffLocation}</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{booking.dropoffAddress}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <FontAwesome name="calendar" size={10} color="#6b7280" />
                <Text style={{ fontSize: 12, color: colors.text }}>{booking.dropoffDate}</Text>
                <Text style={{ fontSize: 12, color: colors.border }}>{'\u00b7'}</Text>
                <FontAwesome name="clock-o" size={10} color="#6b7280" />
                <Text style={{ fontSize: 12, color: colors.text }}>{booking.dropoffTime}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Features Section                                                   */
/* ------------------------------------------------------------------ */

function FeaturesSection({ car }: { car: CarData }) {
  const ACCENT = useTabAccent('cars');
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle
        title="Features & Specs"
        icon="list-ul"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        badge={`${car.features.length} features`}
      />
      {isOpen && (
        <View style={{ gap: 14 }}>
          {/* Features grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {car.features.map((feat) => (
              <View
                key={feat.name}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: colors.surface, borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 7,
                  borderWidth: 1, borderColor: colors.border,
                }}
              >
                <FontAwesome name={feat.icon as any} size={11} color={ACCENT} />
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '500' }}>{feat.name}</Text>
              </View>
            ))}
          </View>

          {/* Policies */}
          <View style={{ backgroundColor: ACCENT + '08', borderRadius: 10, padding: 14, gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Rental Policies
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Mileage</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{car.mileage}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Fuel Policy</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{car.fuelPolicy}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Security Deposit</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{'\u20ac'}{car.deposit}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Insurance</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome
                  name={car.insuranceIncluded ? 'check-circle' : 'times-circle'}
                  size={12}
                  color={car.insuranceIncluded ? '#16a34a' : '#ef4444'}
                />
                <Text style={{ fontSize: 12, fontWeight: '600', color: car.insuranceIncluded ? '#16a34a' : '#ef4444' }}>
                  {car.insuranceIncluded ? 'Included' : 'Not Included'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Price Breakdown Section                                            */
/* ------------------------------------------------------------------ */

function PriceBreakdown({ booking }: { booking: RentalBooking }) {
  const ACCENT = useTabAccent('cars');
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const { car, days, extras } = booking;
  const subtotal = car.pricePerDay * days;
  const extrasTotal = extras.reduce((sum, e) => sum + e.price * days, 0);
  const insuranceFee = car.insuranceIncluded ? 0 : 15 * days;
  const vat = (subtotal + extrasTotal + insuranceFee) * 0.2;
  const total = subtotal + extrasTotal + insuranceFee + vat;

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
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Vehicle</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{car.name}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>Daily Rate</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{'\u20ac'}{car.pricePerDay}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{days} days subtotal</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: ACCENT }}>{'\u20ac'}{subtotal.toFixed(2)}</Text>
            </View>

            {extras.length > 0 && (
              <>
                <View style={{ height: 1, backgroundColor: ACCENT + '15', marginVertical: 4 }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Extras
                </Text>
                {extras.map((extra) => (
                  <View key={extra.name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{extra.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.text }}>{'\u20ac'}{(extra.price * days).toFixed(2)}</Text>
                  </View>
                ))}
              </>
            )}

            <View style={{ height: 1, backgroundColor: ACCENT + '15', marginVertical: 4 }} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Taxes & Fees
            </Text>

            {insuranceFee > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Insurance</Text>
                <Text style={{ fontSize: 12, color: colors.text }}>{'\u20ac'}{insuranceFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>VAT (20%)</Text>
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
/*  Provider & Contact                                                 */
/* ------------------------------------------------------------------ */

function ProviderContact({ provider, booking }: { provider: string; booking: RentalBooking }) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('cars');
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Provider & Support</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => Linking.openURL('tel:+33-1-44-38-55-55')}
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
          onPress={() => Linking.openURL(`mailto:support@${provider.toLowerCase()}.com`)}
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
          onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(booking.pickupAddress + ' ' + booking.pickupLocation)}`)}
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
/*  Other Car Compact Card                                             */
/* ------------------------------------------------------------------ */

function OtherCarCard({ car }: { car: CarData }) {
  const ACCENT = useTabAccent('cars');
  const colors = useThemeColors();
  return (
    <View
      style={{
        flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 12,
        borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 10,
      }}
    >
      <Image source={{ uri: car.image }} style={{ width: 100, height: 110 }} resizeMode="cover" />
      <View style={{ flex: 1, padding: 10, justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
              {car.name}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: ACCENT, marginLeft: 8 }}>
              {'\u20ac'}{car.pricePerDay}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: '600', color: ACCENT }}>{car.category}</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.textTertiary }}>{car.provider}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <FontAwesome name="users" size={9} color="#9ca3af" />
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>{car.seats}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <FontAwesome name="cog" size={9} color="#9ca3af" />
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>{car.transmission}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <FontAwesome name="snowflake-o" size={9} color="#9ca3af" />
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>{car.ac ? 'AC' : '-'}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <RatingBadge rating={car.rating} />
          <Text style={{ fontSize: 10, color: colors.textTertiary }}>{car.reviews} reviews</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 9, color: colors.textTertiary }}>/day</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Screen                                                        */
/* ------------------------------------------------------------------ */

export default function CarRentalScreen() {
  const ACCENT = useTabAccent('cars');
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booked, setBooked] = useState(true);
  const [confirmationNumber, setConfirmationNumber] = useState(BOOKED_RENTAL.confirmation);
  const [categoryFilter, setCategoryFilter] = useState<CarCategory>('All');

  const booking = BOOKED_RENTAL;
  const car = booking.car;

  const filteredCars = OTHER_CARS.filter(
    (c) => categoryFilter === 'All' || c.category === categoryFilter,
  );

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
      {/* ── Booked Car Detail ── */}
      <View style={{ backgroundColor: colors.background, overflow: 'hidden' }}>

        {/* Image Carousel */}
        <ImageCarousel images={car.images} height={240} />

        {/* Car Info Header */}
        <View style={{ padding: 16 }}>

          {/* Name & Category */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{car.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: ACCENT }}>{car.category}</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textTertiary }}>{car.provider}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <RatingBadge rating={car.rating} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: ratingColor(car.rating), marginTop: 3 }}>
                {car.rating >= 9 ? 'Excellent' : car.rating >= 8 ? 'Very Good' : 'Good'}
              </Text>
            </View>
          </View>

          {/* Reviews count */}
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}>
            {car.reviews.toLocaleString()} verified reviews
          </Text>

          {/* Car Specs */}
          <CarSpecsRow car={car} />

          {/* Daily rate badges */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1, backgroundColor: ACCENT + '08', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: ACCENT + '15' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: ACCENT, marginBottom: 2 }}>Daily Rate</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{'\u20ac'}{car.pricePerDay}/day</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: ACCENT + '08', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: ACCENT + '15' }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: ACCENT, marginBottom: 2 }}>Duration</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{booking.days} days</Text>
            </View>
          </View>

          {/* Confirmation badge */}
          {booked && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#bbf7d0' }}>
              <FontAwesome name="check-circle" size={11} color="#16a34a" />
              <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '600' }}>
                Confirmed {'\u00b7'} {confirmationNumber}
              </Text>
            </View>
          )}

          {/* Insurance badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#bbf7d0' }}>
            <FontAwesome name="shield" size={11} color="#16a34a" />
            <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '600' }}>
              {car.insuranceIncluded ? 'Full insurance included' : 'Basic coverage only'}
            </Text>
          </View>

          {/* ── Collapsible Sections ── */}

          {/* Pickup & Drop-off */}
          <PickupDropoffSection booking={booking} />

          {/* Features & Specs */}
          <FeaturesSection car={car} />

          {/* Price Breakdown */}
          <PriceBreakdown booking={booking} />

          {/* Provider Contact */}
          <ProviderContact provider={car.provider} booking={booking} />

          {/* Book / Booked Button */}
          <View style={{ marginTop: 20 }}>
            {booked ? (
              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#bbf7d0', alignItems: 'center' }}>
                <FontAwesome name="check-circle" size={28} color="#16a34a" />
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#16a34a', marginTop: 8 }}>Car Rental Booked!</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Confirmation: {confirmationNumber}</Text>
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                  {car.name} {'\u00b7'} {'\u20ac'}{car.pricePerDay}/day {'\u00b7'} {booking.days} days
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
                  <FontAwesome name="car" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Book Car Rental</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* ── Other Available Cars ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Other Available Cars</Text>

        {/* Category filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{ gap: 8, paddingRight: 4 }}
        >
          {CAR_CATEGORIES.map((cat) => {
            const count = cat === 'All' ? OTHER_CARS.length : OTHER_CARS.filter((c) => c.category === cat).length;
            if (count === 0 && cat !== 'All') return null;
            const isActive = categoryFilter === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategoryFilter(cat)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  backgroundColor: isActive ? ACCENT : colors.cardBackground,
                  borderColor: isActive ? ACCENT : colors.border,
                }}
              >
                <FontAwesome
                  name={CATEGORY_ICONS[cat] as any}
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
                  {cat}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: isActive ? 'rgba(255,255,255,0.7)' : colors.textTertiary,
                  }}
                >
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Results count */}
        <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 10 }}>
          {filteredCars.length} {filteredCars.length === 1 ? 'car' : 'cars'} available
        </Text>

        {/* Car cards */}
        {filteredCars.length > 0 ? (
          filteredCars.map((c) => <OtherCarCard key={c.id} car={c} />)
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <FontAwesome name="search" size={28} color="#d1d5db" style={{ marginBottom: 10 }} />
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 6 }}>No cars match this filter</Text>
            <Pressable onPress={() => setCategoryFilter('All')}>
              <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }}>Show all cars</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Add Car Rental Button (dashed border) ── */}
      <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
        <Pressable
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingVertical: 14, borderRadius: 12,
            borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
          }}
        >
          <FontAwesome name="plus-circle" size={16} color="#9ca3af" />
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textTertiary }}>Add Car Rental</Text>
        </Pressable>
      </View>
    </ScrollView>
    </PageTransition>
  );
}
