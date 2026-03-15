import { useState, useEffect } from 'react';
import { View, ScrollView, Text, Pressable, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { PageTransition, useTabAccent } from './_layout';
import { adjustBrightness } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
/* ================================================================
   MOCK DATA — Paris trip: JFK <-> CDG
   ================================================================ */

const POPULAR_AIRPORTS = [
  { code: 'JFK', name: 'John F. Kennedy Intl', city: 'New York' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris' },
  { code: 'EWR', name: 'Newark Liberty Intl', city: 'Newark' },
  { code: 'LGA', name: 'LaGuardia', city: 'New York' },
  { code: 'ORY', name: 'Paris Orly', city: 'Paris' },
];

const BOOKED_FLIGHTS = [
  {
    id: 'outbound-1',
    type: 'outbound' as const,
    flightNumber: 'AA 100',
    airline: 'American Airlines',
    airlineLogo: 'AA',
    aircraft: 'Boeing 777-300ER',
    date: 'Mar 10, 2026',
    departure: { time: '7:30 PM', code: 'JFK', terminal: 'T8', gate: 'B44' },
    arrival: { time: '9:15 AM', code: 'CDG', terminal: 'T2A', gate: 'K26', nextDay: true },
    duration: '7h 45m',
    stops: 'Direct',
    cabinClass: 'Economy',
    seats: '24A, 24B',
    baggage: '1 carry-on + 1 checked (23 kg)',
    meal: 'Dinner + breakfast',
    wifi: 'Available (complimentary)',
    confirmation: 'XHGT7K',
    price: { base: 412, taxes: 86, total: 498 },
    status: 'Confirmed',
  },
  {
    id: 'return-1',
    type: 'return' as const,
    flightNumber: 'AA 101',
    airline: 'American Airlines',
    airlineLogo: 'AA',
    aircraft: 'Boeing 777-300ER',
    date: 'Mar 16, 2026',
    departure: { time: '11:00 AM', code: 'CDG', terminal: 'T2A', gate: 'K12' },
    arrival: { time: '2:30 PM', code: 'JFK', terminal: 'T8', gate: 'B38', nextDay: false },
    duration: '8h 30m',
    stops: 'Direct',
    cabinClass: 'Economy',
    seats: '26A, 26B',
    baggage: '1 carry-on + 1 checked (23 kg)',
    meal: 'Lunch + snack',
    wifi: 'Available (complimentary)',
    confirmation: 'XHGT7K',
    price: { base: 428, taxes: 91, total: 519 },
    status: 'Confirmed',
  },
];

const COMPARISON_FLIGHTS = [
  {
    id: 'dl-310',
    airline: 'Delta Air Lines',
    airlineLogo: 'DL',
    flightNumber: 'DL 310',
    departure: { time: '6:15 PM', airport: 'JFK' },
    arrival: { time: '8:45 AM', airport: 'CDG', nextDay: true },
    duration: '8h 30m',
    stops: 1,
    layover: 'ATL (1h 40m)',
    price: 520,
    fareClass: 'Main Cabin',
    amenities: { wifi: true, power: true, meals: true, entertainment: true },
    onTime: 84,
    co2: 312,
    badge: null as string | null,
    businessAvailable: false,
  },
  {
    id: 'ua-57',
    airline: 'United Airlines',
    airlineLogo: 'UA',
    flightNumber: 'UA 57',
    departure: { time: '9:00 PM', airport: 'EWR' },
    arrival: { time: '10:30 AM', airport: 'CDG', nextDay: true },
    duration: '7h 30m',
    stops: 0,
    layover: null,
    price: 485,
    fareClass: 'Economy',
    amenities: { wifi: true, power: true, meals: true, entertainment: true },
    onTime: 81,
    co2: 278,
    badge: 'Lowest Price',
    businessAvailable: false,
  },
  {
    id: 'lh-401',
    airline: 'Lufthansa',
    airlineLogo: 'LH',
    flightNumber: 'LH 401',
    departure: { time: '5:30 PM', airport: 'JFK' },
    arrival: { time: '7:15 AM', airport: 'CDG', nextDay: true },
    duration: '7h 45m',
    stops: 0,
    layover: null,
    price: 610,
    fareClass: 'Economy',
    amenities: { wifi: true, power: true, meals: true, entertainment: true },
    onTime: 88,
    co2: 265,
    badge: 'Best Overall',
    businessAvailable: true,
  },
];

const BOOKING_DETAILS = {
  confirmationNumber: 'XHGT7K',
  pnr: 'XHGT7K',
  ticketNumbers: ['001-2345678901', '001-2345678902'],
  fareClass: 'Y',
  fareType: 'Economy Flex',
  baggageAllowance: { carryOn: '1 bag (10 kg)', checked: '1 bag (23 kg)', fees: 0 },
  cancellationPolicy:
    'Free cancellation within 24 hours of booking. After that, a $200 fee per passenger applies.',
  changePolicy:
    'Changes permitted for a $75 fee plus any fare difference. Same-day standby is complimentary for AAdvantage members.',
  refundPolicy:
    'Refundable as travel credit within 12 months. Cash refund available for Flex fares.',
  checkInUrl: 'https://www.aa.com/checkin',
  checkInOpens: 'Mar 9, 2026 — 24 hours before departure',
};

/* ================================================================
   HELPER: toggle value in array
   ================================================================ */

function toggleInArray(arr: string[], val: string, setter: (v: string[]) => void) {
  setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
}

/* ================================================================
   FLIGHT SEARCH SECTION
   ================================================================ */

function FlightSearchSection() {
  const ACCENT = useTabAccent('flights');
  const colors = useThemeColors();
  const [collapsed, setCollapsed] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [from, setFrom] = useState('JFK');
  const [to, setTo] = useState('CDG');
  const [travelers, setTravelers] = useState(2);
  const [cabinClass, setCabinClass] = useState<'economy' | 'premium' | 'business' | 'first'>('economy');
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [depTimes, setDepTimes] = useState<string[]>([]);
  const [arrTimes, setArrTimes] = useState<string[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);

  const cabinLabel: Record<string, string> = {
    economy: 'Economy',
    premium: 'Premium',
    business: 'Business',
    first: 'First',
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const cabinOptions: Array<'economy' | 'premium' | 'business' | 'first'> = [
    'economy',
    'premium',
    'business',
    'first',
  ];
  const nextCabin = () => {
    const idx = cabinOptions.indexOf(cabinClass);
    setCabinClass(cabinOptions[(idx + 1) % cabinOptions.length]);
  };

  const activeFilterCount = [
    nonstopOnly,
    depTimes.length > 0,
    arrTimes.length > 0,
    maxPrice < 3000,
    airlines.length > 0,
  ].filter(Boolean).length;

  const timeSlots = [
    { label: 'Early', sub: '12a-6a', value: 'night' },
    { label: 'Morning', sub: '6a-12p', value: 'morning' },
    { label: 'Afternoon', sub: '12p-6p', value: 'afternoon' },
    { label: 'Evening', sub: '6p-12a', value: 'evening' },
  ];

  const airlineChips = [
    { code: 'AA', name: 'American', color: '#0078D2' },
    { code: 'DL', name: 'Delta', color: '#003366' },
    { code: 'UA', name: 'United', color: '#002244' },
    { code: 'LH', name: 'Lufthansa', color: '#05164D' },
    { code: 'AF', name: 'Air France', color: '#002157' },
    { code: 'BA', name: 'British Airways', color: '#075AAA' },
  ];

  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 }}>
      {/* Header */}
      <Pressable
        onPress={() => setCollapsed(!collapsed)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome name="plane" size={12} color="#fff" />
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Search Flights</Text>
            <Text style={{ fontSize: 10, color: colors.textTertiary }}>
              {from} → {to} · {travelers} traveler{travelers !== 1 ? 's' : ''} · {cabinLabel[cabinClass]}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!collapsed && (
            <Pressable
              onPress={() => setShowFilters(!showFilters)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: showFilters ? ACCENT : colors.border,
                backgroundColor: showFilters ? ACCENT : colors.cardBackground,
              }}
            >
              <FontAwesome name="sliders" size={9} color={showFilters ? '#fff' : colors.textSecondary} />
              <Text style={{ fontSize: 10, color: showFilters ? '#fff' : colors.textSecondary }}>Filters</Text>
              {activeFilterCount > 0 && !showFilters && (
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
                  <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{activeFilterCount}</Text>
                </View>
              )}
            </Pressable>
          )}
          <FontAwesome name={collapsed ? 'chevron-down' : 'chevron-up'} size={12} color={colors.textTertiary} />
        </View>
      </Pressable>

      {/* Expandable body */}
      {!collapsed && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12 }}>
          {/* Search strip */}
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden' }}>
            {/* From */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 8, letterSpacing: 1.5, color: colors.textTertiary, textTransform: 'uppercase' }}>From</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>{from}</Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary }}>{POPULAR_AIRPORTS.find((a) => a.code === from)?.city}</Text>
              </View>
            </View>

            {/* Swap button */}
            <View style={{ position: 'absolute', right: 16, top: 30, zIndex: 10 }}>
              <Pressable
                onPress={swap}
                style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }}
              >
                <FontAwesome name="exchange" size={10} color={colors.textTertiary} />
              </Pressable>
            </View>

            {/* To */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 8, letterSpacing: 1.5, color: colors.textTertiary, textTransform: 'uppercase' }}>To</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>{to}</Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary }}>{POPULAR_AIRPORTS.find((a) => a.code === to)?.city}</Text>
              </View>
            </View>

            {/* Travelers + Class row */}
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 10, borderRightWidth: 1, borderRightColor: colors.border }}>
                <Text style={{ fontSize: 8, letterSpacing: 1.5, color: colors.textTertiary, textTransform: 'uppercase' }}>Travelers</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>{travelers}</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Pressable
                      onPress={() => setTravelers(Math.max(1, travelers - 1))}
                      style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>-</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setTravelers(travelers + 1)}
                      style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
              <Pressable onPress={nextCabin} style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 10 }}>
                <Text style={{ fontSize: 8, letterSpacing: 1.5, color: colors.textTertiary, textTransform: 'uppercase' }}>Class</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>{cabinLabel[cabinClass]}</Text>
              </Pressable>
            </View>

            {/* Search button */}
            <Pressable style={{ backgroundColor: ACCENT, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <FontAwesome name="search" size={12} color="#fff" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Search</Text>
            </Pressable>
          </View>

          {/* Advanced filters */}
          {showFilters && (
            <View style={{ marginTop: 10, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
              {/* Stops */}
              <Text style={{ fontSize: 9, letterSpacing: 1.2, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 8 }}>Stops</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Nonstop', val: true },
                  { label: 'Any', val: false },
                ].map((opt) => (
                  <Pressable
                    key={String(opt.val)}
                    onPress={() => setNonstopOnly(opt.val)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: nonstopOnly === opt.val ? ACCENT : colors.border,
                      backgroundColor: nonstopOnly === opt.val ? ACCENT : colors.cardBackground,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: nonstopOnly === opt.val ? '#fff' : colors.textSecondary }}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Max price */}
              <Text style={{ fontSize: 9, letterSpacing: 1.2, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 8 }}>Max Price</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: colors.textTertiary }}>$</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{maxPrice}</Text>
              </View>

              {/* Departure time */}
              <Text style={{ fontSize: 9, letterSpacing: 1.2, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 8 }}>Departure time</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                {timeSlots.map((t) => {
                  const active = depTimes.includes(t.value);
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => toggleInArray(depTimes, t.value, setDepTimes)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: active ? ACCENT : colors.border,
                        backgroundColor: active ? 'rgba(37,99,235,0.05)' : colors.cardBackground,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '500', color: active ? ACCENT : colors.textSecondary }}>{t.label}</Text>
                      <Text style={{ fontSize: 8, color: active ? ACCENT : colors.textTertiary, opacity: 0.6 }}>{t.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Arrival time */}
              <Text style={{ fontSize: 9, letterSpacing: 1.2, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 8 }}>Arrival time</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                {timeSlots.map((t) => {
                  const active = arrTimes.includes(t.value);
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => toggleInArray(arrTimes, t.value, setArrTimes)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: active ? ACCENT : colors.border,
                        backgroundColor: active ? 'rgba(37,99,235,0.05)' : colors.cardBackground,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '500', color: active ? ACCENT : colors.textSecondary }}>{t.label}</Text>
                      <Text style={{ fontSize: 8, color: active ? ACCENT : colors.textTertiary, opacity: 0.6 }}>{t.sub}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Airline chips */}
              <Text style={{ fontSize: 9, letterSpacing: 1.2, color: colors.textTertiary, textTransform: 'uppercase', marginBottom: 8 }}>Airlines</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {airlineChips.map((a) => {
                  const active = airlines.includes(a.name);
                  return (
                    <Pressable
                      key={a.code}
                      onPress={() => toggleInArray(airlines, a.name, setAirlines)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: active ? ACCENT : colors.border,
                        backgroundColor: active ? ACCENT : colors.cardBackground,
                      }}
                    >
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: active ? '#fff' : a.color }} />
                      <Text style={{ fontSize: 11, color: active ? '#fff' : colors.textSecondary }}>{a.name}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Reset */}
              <Pressable
                onPress={() => {
                  setNonstopOnly(false);
                  setMaxPrice(3000);
                  setDepTimes([]);
                  setArrTimes([]);
                  setAirlines([]);
                }}
              >
                <Text style={{ fontSize: 11, color: colors.textTertiary, textDecorationLine: 'underline' }}>Reset all filters</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/* ================================================================
   BOOKED FLIGHT CARD
   ================================================================ */

function BookedFlightCard({ flight }: { flight: (typeof BOOKED_FLIGHTS)[0] }) {
  const ACCENT = useTabAccent('flights');
  const colors = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const isOutbound = flight.type === 'outbound';
  const gradientColors: [string, string] = isOutbound ? [ACCENT, adjustBrightness(ACCENT, 20)] : [ACCENT, ACCENT];

  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, overflow: 'hidden', marginBottom: 16 }}>
      {/* Gradient Header */}
      <Pressable onPress={() => setExpanded(!expanded)}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FontAwesome name="plane" size={12} color="#fff" style={isOutbound ? undefined : { transform: [{ rotate: '180deg' }] }} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{flight.flightNumber}</Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{flight.date}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>{flight.status}</Text>
            </View>
            <FontAwesome name={expanded ? 'chevron-up' : 'chevron-down'} size={11} color="#fff" />
          </View>
        </LinearGradient>
      </Pressable>

      {/* Route display */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {/* Departure */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{flight.departure.time}</Text>
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textSecondary }}>{flight.departure.code}</Text>
            <Text style={{ fontSize: 9, color: colors.textTertiary }}>{flight.departure.terminal} · Gate {flight.departure.gate}</Text>
          </View>

          {/* Duration line with plane */}
          <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 10, color: colors.textTertiary, marginBottom: 4 }}>{flight.duration}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <View style={{ flex: 1, height: 1, borderStyle: 'dashed', borderTopWidth: 1, borderColor: colors.border }} />
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 }}>
                <FontAwesome name="plane" size={11} color="#fff" />
              </View>
              <View style={{ flex: 1, height: 1, borderStyle: 'dashed', borderTopWidth: 1, borderColor: colors.border }} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#059669', marginTop: 4 }}>{flight.stops}</Text>
          </View>

          {/* Arrival */}
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>{flight.arrival.time}</Text>
              {flight.arrival.nextDay && (
                <Text style={{ fontSize: 9, fontWeight: '600', color: '#f59e0b', marginLeft: 2, marginTop: -2 }}>+1</Text>
              )}
            </View>
            <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textSecondary }}>{flight.arrival.code}</Text>
            <Text style={{ fontSize: 9, color: colors.textTertiary }}>{flight.arrival.terminal} · Gate {flight.arrival.gate}</Text>
          </View>
        </View>

        {/* Airline + price bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LinearGradient
            colors={[ACCENT, adjustBrightness(ACCENT, -30)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{flight.airlineLogo}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text }}>{flight.airline}</Text>
            <Text style={{ fontSize: 10, color: colors.textTertiary }}>{flight.cabinClass}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: ACCENT }}>${flight.price.total}</Text>
            <Text style={{ fontSize: 9, color: colors.textTertiary }}>per person</Text>
          </View>
        </View>
      </View>

      {/* Expandable details */}
      {expanded && (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12 }}>
          {/* 2-column detail grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'Aircraft', value: flight.aircraft },
              { label: 'Class', value: flight.cabinClass },
              { label: 'Seats', value: flight.seats },
              { label: 'Baggage', value: flight.baggage },
              { label: 'Meal', value: flight.meal },
              { label: 'Wi-Fi', value: flight.wifi },
            ].map((item) => (
              <View
                key={item.label}
                style={{ width: '47%', backgroundColor: colors.cardBackground, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.borderLight }}
              >
                <Text style={{ fontSize: 8, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{item.label}</Text>
                <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text }}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Price breakdown */}
          <View style={{ marginTop: 8, backgroundColor: colors.cardBackground, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.borderLight }}>
            <Text style={{ fontSize: 8, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Price Breakdown</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Base fare</Text>
              <Text style={{ fontSize: 11, color: colors.text }}>${flight.price.base}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Taxes & fees</Text>
              <Text style={{ fontSize: 11, color: colors.text }}>${flight.price.taxes}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 4, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>Total</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: ACCENT }}>${flight.price.total}</Text>
            </View>
          </View>

          {/* Confirmation */}
          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>Confirmation:</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: ACCENT, fontFamily: 'monospace' }}>{flight.confirmation}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/* ================================================================
   COMPARISON ALTERNATIVES
   ================================================================ */

function ComparisonAlternatives() {
  const ACCENT = useTabAccent('flights');
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<'price' | 'duration' | 'value'>('value');
  const [altAirports, setAltAirports] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [maxLayover, setMaxLayover] = useState<number | null>(null);

  const filtered = COMPARISON_FLIGHTS.filter((f) => {
    if (maxLayover === null) return true;
    if (f.stops === 0 || !f.layover) return true;
    const match = f.layover.match(/(\d+)h\s*(\d+)?m?/);
    if (!match) return true;
    const layoverHours = Number(match[1]) + (match[2] ? Number(match[2]) / 60 : 0);
    return layoverHours <= maxLayover;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'price') return a.price - b.price;
    if (sort === 'duration') {
      const toMin = (d: string) => {
        const p = d.match(/(\d+)h\s*(\d+)m/);
        return p ? Number(p[1]) * 60 + Number(p[2]) : 0;
      };
      return toMin(a.duration) - toMin(b.duration);
    }
    return a.price / a.onTime - b.price / b.onTime;
  });

  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 }}>
      {/* Header */}
      <Pressable
        onPress={() => setOpen(!open)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FontAwesome name="line-chart" size={14} color="#059669" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Compare Alternatives</Text>
          <Text style={{ fontSize: 9, color: colors.textTertiary }}>{filtered.length} options</Text>
        </View>
        <FontAwesome name={open ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textTertiary} />
      </Pressable>

      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12 }}>
          {/* Sort + alt airports */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {(['price', 'duration', 'value'] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSort(s)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: sort === s ? ACCENT : colors.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 11, color: sort === s ? '#fff' : colors.textSecondary }}>
                    {s === 'price' ? 'Price' : s === 'duration' ? 'Fastest' : 'Best Value'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => setAltAirports(!altAirports)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: altAirports ? '#dbeafe' : colors.borderLight,
              }}
            >
              <Text style={{ fontSize: 11, color: altAirports ? '#1d4ed8' : colors.textSecondary }}>Alt Airports</Text>
            </Pressable>
          </View>

          {/* Max Layover filter */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, color: colors.text }}>Max Layover</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {[null, 2, 4, 6, 8].map(hours => (
                <Pressable
                  key={String(hours)}
                  onPress={() => setMaxLayover(hours)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                    backgroundColor: maxLayover === hours ? ACCENT : colors.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 11, color: maxLayover === hours ? '#fff' : colors.textSecondary }}>
                    {hours === null ? 'Any' : `${hours}h`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Alt airports chips */}
          {altAirports && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[
                { code: 'EWR', savings: 50 },
                { code: 'LGA', savings: 35 },
                { code: 'ORY', savings: 75 },
              ].map((ap) => (
                <Pressable
                  key={ap.code}
                  style={{ flex: 1, padding: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{ap.code}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669' }}>-${ap.savings}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Price range info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 4 }}>
            <FontAwesome name="info-circle" size={10} color={colors.textTertiary} />
            <Text style={{ fontSize: 9, color: colors.textSecondary }}>
              Prices from{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>${Math.min(...COMPARISON_FLIGHTS.map((f) => f.price))}</Text> to{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>${Math.max(...COMPARISON_FLIGHTS.map((f) => f.price))}</Text> per person incl. taxes
            </Text>
          </View>

          {/* Flight option cards */}
          {sorted.map((flight) => {
            const isExpanded = expandedId === flight.id;
            return (
              <View
                key={flight.id}
                style={{
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: isExpanded ? 'rgba(37,99,235,0.2)' : colors.border,
                }}
              >
                {/* Badge */}
                {flight.badge && (
                  <LinearGradient
                    colors={[ACCENT, adjustBrightness(ACCENT, 20)]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ paddingHorizontal: 12, paddingVertical: 3 }}
                  >
                    <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.9)', fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                      {flight.badge}
                    </Text>
                  </LinearGradient>
                )}

                {/* Summary row */}
                <Pressable
                  onPress={() => setExpandedId(isExpanded ? null : flight.id)}
                  style={{ backgroundColor: colors.cardBackground, padding: 12 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {/* Airline logo */}
                    <LinearGradient
                      colors={[ACCENT, ACCENT]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{flight.airlineLogo}</Text>
                    </LinearGradient>

                    {/* Times */}
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{flight.departure.time}</Text>
                        <Text style={{ fontSize: 10, color: colors.textTertiary }}>{flight.departure.airport}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.border, paddingHorizontal: 2 }}>→</Text>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{flight.arrival.time}</Text>
                          {flight.arrival.nextDay && (
                            <Text style={{ fontSize: 8, fontWeight: '600', color: '#f59e0b', marginLeft: 2, marginTop: -2 }}>+1</Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 10, color: colors.textTertiary }}>{flight.arrival.airport}</Text>
                      </View>
                    </View>

                    <View style={{ flex: 1 }} />

                    {/* Duration / stops */}
                    <View style={{ alignItems: 'flex-end', marginRight: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.text }}>{flight.duration}</Text>
                      {flight.stops === 0 ? (
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#059669' }}>Direct</Text>
                      ) : (
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#d97706' }}>{flight.stops} stop</Text>
                      )}
                    </View>

                    {/* Divider */}
                    <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />

                    {/* Price */}
                    <View style={{ alignItems: 'flex-end', minWidth: 56 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: ACCENT }}>${flight.price}</Text>
                      <Text style={{ fontSize: 10, color: colors.textTertiary }}>{flight.fareClass}</Text>
                    </View>

                    <FontAwesome name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color="#d1d5db" />
                  </View>

                  {/* Amenity row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginLeft: 50 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <FontAwesome name="wifi" size={10} color={flight.amenities.wifi ? colors.textSecondary : colors.border} />
                      <FontAwesome name="bolt" size={10} color={flight.amenities.power ? colors.textSecondary : colors.border} />
                      <FontAwesome name="cutlery" size={10} color={flight.amenities.meals ? colors.textSecondary : colors.border} />
                      <FontAwesome name="television" size={10} color={flight.amenities.entertainment ? colors.textSecondary : colors.border} />
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textTertiary }}>{flight.airline}</Text>
                    {flight.businessAvailable && (
                      <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ fontSize: 9, color: '#b45309' }}>Business avail.</Text>
                      </View>
                    )}
                  </View>
                </Pressable>

                {/* Expanded details */}
                {isExpanded && (
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight, backgroundColor: colors.surface, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8 }}>
                    {/* Flight info */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary }}>{flight.airline}</Text>
                      <Text style={{ fontSize: 10, color: colors.textTertiary }}>·</Text>
                      <Text style={{ fontSize: 10, color: colors.textTertiary }}>{flight.flightNumber}</Text>
                      {flight.layover && (
                        <>
                          <Text style={{ fontSize: 10, color: colors.textTertiary }}>·</Text>
                          <Text style={{ fontSize: 10, color: '#d97706' }}>Stop: {flight.layover}</Text>
                        </>
                      )}
                    </View>

                    {/* Stats bar */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardBackground, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.borderLight, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: flight.onTime >= 85 ? '#22c55e' : flight.onTime >= 78 ? '#fbbf24' : '#f87171',
                          }}
                        />
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{flight.onTime}% on-time</Text>
                      </View>
                      <View style={{ width: 1, height: 12, backgroundColor: colors.border }} />
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <FontAwesome name="leaf" size={10} color={flight.co2 <= 280 ? '#16a34a' : colors.textTertiary} />
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{flight.co2}kg CO2</Text>
                      </View>
                    </View>

                    {/* Select button */}
                    <Pressable>
                      <LinearGradient
                        colors={[ACCENT, adjustBrightness(ACCENT, 20)]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{ paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>Select This Flight</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ================================================================
   BOOKING DETAILS SECTION
   ================================================================ */

function BookingDetailsSection() {
  const ACCENT = useTabAccent('flights');
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const d = BOOKING_DETAILS;

  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      {/* Header */}
      <Pressable
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: open ? 'rgba(239,246,255,0.5)' : 'transparent',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FontAwesome name="file-text-o" size={14} color={ACCENT} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Booking Details</Text>
        </View>
        <FontAwesome name={open ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textTertiary} />
      </Pressable>

      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12 }}>
          {/* Booking reference */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Booking Reference</Text>
            {[
              { label: 'Confirmation Number', value: d.confirmationNumber, bold: true },
              { label: 'PNR Code', value: d.pnr, mono: true },
              { label: 'Fare Class', value: `${d.fareClass} - ${d.fareType}` },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{row.label}</Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: row.bold ? '800' : '600',
                    color: row.bold ? ACCENT : colors.text,
                    fontFamily: row.mono ? 'monospace' : undefined,
                  }}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Baggage */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Baggage Allowance</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Carry-on</Text>
              <Text style={{ fontSize: 11, color: colors.text }}>{d.baggageAllowance.carryOn}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Checked</Text>
              <Text style={{ fontSize: 11, color: colors.text }}>{d.baggageAllowance.checked}</Text>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Baggage Fees</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>
                {d.baggageAllowance.fees === 0 ? 'Included' : `$${d.baggageAllowance.fees}/person`}
              </Text>
            </View>
          </View>

          {/* Ticket numbers */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 8 }}>Ticket Numbers</Text>
            {d.ticketNumbers.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Passenger {i + 1}</Text>
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: colors.text }}>{t}</Text>
              </View>
            ))}
          </View>

          {/* Policies */}
          {[
            { title: 'Cancellation Policy', text: d.cancellationPolicy },
            { title: 'Change Policy', text: d.changePolicy },
            { title: 'Refund Policy', text: d.refundPolicy },
          ].map((p) => (
            <View key={p.title} style={{ backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{p.title}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 18 }}>{p.text}</Text>
            </View>
          ))}

          {/* Check-in CTA */}
          <LinearGradient
            colors={[ACCENT, adjustBrightness(ACCENT, -30)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 6 }}>Check-in Information</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Check-in Opens</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>{d.checkInOpens}</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(d.checkInUrl)}
              style={{ alignSelf: 'flex-start', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: ACCENT }}>Check-in Online →</Text>
            </Pressable>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

/* ================================================================
   LOADING SKELETON
   ================================================================ */

function FlightSkeleton() {
  const colors = useThemeColors();
  return (
    <View style={{ padding: 14, gap: 14, backgroundColor: colors.background }}>
      {[1, 2].map(i => (
        <View key={i} style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <View style={{ height: 44, backgroundColor: colors.skeleton }} />
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: '30%', height: 18, borderRadius: 6, backgroundColor: colors.borderLight }} />
              <View style={{ width: '20%', height: 18, borderRadius: 6, backgroundColor: colors.borderLight }} />
              <View style={{ width: '30%', height: 18, borderRadius: 6, backgroundColor: colors.borderLight }} />
            </View>
            <View style={{ width: '60%', height: 14, borderRadius: 6, backgroundColor: colors.borderLight }} />
            <View style={{ width: '40%', height: 14, borderRadius: 6, backgroundColor: colors.borderLight }} />
          </View>
        </View>
      ))}
    </View>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function FlightsScreen() {
  const ACCENT = useTabAccent('flights');
  const colors = useThemeColors();
  const { id: _id } = useLocalSearchParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <PageTransition><FlightSkeleton /></PageTransition>;

  return (
    <PageTransition>
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* 1. Flight Search Section */}
      <FlightSearchSection />

      {/* 2. Booked Flight Cards */}
      {BOOKED_FLIGHTS.filter((f) => f.type === 'outbound').map((f) => (
        <BookedFlightCard key={f.id} flight={f} />
      ))}
      {BOOKED_FLIGHTS.filter((f) => f.type === 'return').map((f) => (
        <BookedFlightCard key={f.id} flight={f} />
      ))}

      {/* 3. Add Flight button */}
      <Pressable
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 14,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: colors.border,
          borderStyle: 'dashed',
          marginBottom: 16,
        }}
      >
        <FontAwesome name="plus" size={14} color={colors.textTertiary} />
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textTertiary }}>Add Flight</Text>
      </Pressable>

      {/* 4. Comparison Alternatives */}
      <ComparisonAlternatives />

      {/* 5. Booking Details */}
      <BookingDetailsSection />
    </ScrollView>
    </PageTransition>
  );
}
