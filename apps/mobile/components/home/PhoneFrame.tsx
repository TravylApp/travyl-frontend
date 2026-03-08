import React from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Blue,
  Gray,
  STEP1_QUICK_CHIPS,
  STEP1_RECENT_SEARCHES,
  STEP2_ITINERARY_ITEMS,
  STEP3_TRIP_DETAILS,
} from '@travyl/shared';
import { PaperPlane } from './PaperPlane';

const PHONE_W = 200;
const PHONE_H = 410;
const BEZEL = 6;
const RADIUS = 36;
const INNER_RADIUS = 30;

interface Props {
  children: React.ReactNode;
  accentColor?: string;
  floatDelay?: number;
}

export function PhoneFrame({ children, accentColor = Blue[600], floatDelay = 0 }: Props) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      translateY.value = withRepeat(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }, floatDelay);
    return () => clearTimeout(timeout);
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[{ alignItems: 'center' }, floatStyle]}>
      {/* Phone body */}
      <View
        style={{
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: RADIUS,
          backgroundColor: Gray[800],
          padding: BEZEL,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 12,
        }}
      >
        {/* Screen */}
        <View
          style={{
            flex: 1,
            borderRadius: INNER_RADIUS,
            overflow: 'hidden',
            backgroundColor: '#fff',
          }}
        >
          {/* Notch */}
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <View
              style={{
                width: 80,
                height: 22,
                borderRadius: 12,
                backgroundColor: Gray[800],
              }}
            />
          </View>

          {/* Status bar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 4,
              paddingBottom: 6,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: Gray[900] }}>9:41</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <View style={{ width: 12, height: 8, borderRadius: 2, backgroundColor: Gray[900] }} />
              <View style={{ width: 14, height: 8, borderRadius: 2, backgroundColor: Gray[900] }} />
            </View>
          </View>

          {/* Screen content */}
          <View style={{ flex: 1 }}>
            {children}
          </View>

          {/* Home indicator */}
          <View style={{ alignItems: 'center', paddingBottom: 6, paddingTop: 4 }}>
            <View
              style={{
                width: 100,
                height: 4,
                borderRadius: 2,
                backgroundColor: Gray[300],
              }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Step-specific screen contents ───────────────────────────────

const CHIP_FA_ICONS: Record<string, string> = {
  mapPin: 'map-marker',
  calendar: 'calendar',
  users: 'users',
};

export function SearchScreen() {
  return (
    <LinearGradient
      colors={['#eef4fb', '#ffffff', '#f0f7ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, padding: 14 }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <LinearGradient
          colors={[Blue[600], '#1A5CC8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <PaperPlane size={13} color="#fff" style={{ transform: [{ rotate: '-8deg' }] }} />
        </LinearGradient>
        <Text style={{ fontSize: 10, fontWeight: '800', color: Blue[600] }}>TRAVYL</Text>
      </View>

      {/* Greeting */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: Gray[900], marginBottom: 2 }}>
          Where to next?
        </Text>
        <Text style={{ fontSize: 9, color: Gray[500] }}>Describe your dream trip</Text>
      </View>

      {/* Search bar */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: Gray[100],
          padding: 9,
          marginBottom: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <FontAwesome name="search" size={10} color={Gray[400]} />
          <Text style={{ fontSize: 10, color: Gray[800] }}>5 days in Rome for 2 people...</Text>
        </View>
        <View
          style={{
            backgroundColor: '#D97706',
            borderRadius: 7,
            paddingVertical: 6,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <FontAwesome name="star" size={8} color="#fff" />
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>Plan My Trip</Text>
        </View>
      </View>

      {/* Quick chips */}
      <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
        {STEP1_QUICK_CHIPS.map((chip) => {
          const faIcon = CHIP_FA_ICONS[chip.iconId];
          return (
            <View
              key={chip.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                backgroundColor: 'rgba(0,53,148,0.08)',
                paddingHorizontal: 7,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              {faIcon && <FontAwesome name={faIcon as any} size={8} color={Blue[600]} />}
              <Text style={{ fontSize: 8, fontWeight: '500', color: Blue[600] }}>{chip.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Recent searches */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 8, color: Gray[400], fontWeight: '500', marginBottom: 6, letterSpacing: 1 }}>
          RECENT
        </Text>
        {STEP1_RECENT_SEARCHES.map((item, i) => (
          <View
            key={item.dest}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              paddingVertical: 6,
              borderBottomWidth: i < STEP1_RECENT_SEARCHES.length - 1 ? 1 : 0,
              borderBottomColor: Gray[100],
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                backgroundColor: Gray[100],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <FontAwesome name="map-marker" size={9} color={Gray[400]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, fontWeight: '500', color: Gray[800] }}>{item.dest}</Text>
              <Text style={{ fontSize: 7, color: Gray[400] }}>
                {item.days} · {item.travelers}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const ITINERARY_FA_ICONS: Record<string, string> = {
  camera: 'camera',
  mapPin: 'map-marker',
  utensils: 'cutlery',
  coffee: 'coffee',
};

export function ItineraryScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fdf8f0' }}>
      {/* Header */}
      <LinearGradient
        colors={[Blue[600], '#1A5CC8']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <FontAwesome name="map-marker" size={8} color="rgba(255,255,255,0.8)" />
          <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.8)' }}>Rome, Italy</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff', marginBottom: 1 }}>5-Day Itinerary</Text>
        <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)' }}>Mar 15 – Mar 20, 2026</Text>
      </LinearGradient>

      {/* Day selector */}
      <View
        style={{
          flexDirection: 'row',
          gap: 3,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: Gray[100],
        }}
      >
        {['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'].map((day, i) => (
          <View
            key={day}
            style={{
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 4,
              backgroundColor: i === 0 ? Blue[600] : Gray[100],
            }}
          >
            <Text style={{ fontSize: 7, fontWeight: '500', color: i === 0 ? '#fff' : Gray[500] }}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Day title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 }}>
        <FontAwesome name="sun-o" size={9} color="#F59E0B" />
        <Text style={{ fontSize: 9, fontWeight: '600', color: Gray[800] }}>Day 1 — Arrival & Ancient Rome</Text>
      </View>

      {/* Timeline */}
      <View style={{ flex: 1, paddingHorizontal: 10, overflow: 'hidden' }}>
        {STEP2_ITINERARY_ITEMS.map((item, i) => {
          const faIcon = ITINERARY_FA_ICONS[item.iconId];
          return (
            <View key={item.title} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
              {/* Timeline dot + connector */}
              <View style={{ alignItems: 'center', width: 12 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    borderWidth: 1.5,
                    borderColor: item.color,
                    backgroundColor: `${item.color}15`,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: item.color }} />
                </View>
                {i < STEP2_ITINERARY_ITEMS.length - 1 && (
                  <View style={{ width: 1, flex: 1, backgroundColor: Gray[200], marginTop: 1 }} />
                )}
              </View>

              {/* Content */}
              <View style={{ flex: 1, paddingBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                  <FontAwesome name="clock-o" size={6} color={Gray[400]} />
                  <Text style={{ fontSize: 6, color: Gray[400] }}>{item.time}</Text>
                  <Text style={{ fontSize: 5, color: Gray[300], marginLeft: 'auto' }}>{item.duration}</Text>
                </View>
                <View
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: Gray[100],
                    padding: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      backgroundColor: `${item.color}12`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {faIcon && <FontAwesome name={faIcon as any} size={8} color={item.color} />}
                  </View>
                  <Text style={{ fontSize: 8, fontWeight: '500', color: Gray[800] }}>{item.title}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function BookedScreen() {
  return (
    <LinearGradient
      colors={['#f0fdf4', '#eff6ff', '#ffffff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, padding: 10, alignItems: 'center' }}
    >
      {/* Success icon */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#22C55E',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 10,
          marginBottom: 5,
        }}
      >
        <FontAwesome name="check-circle" size={16} color="#fff" />
      </View>

      <Text style={{ fontSize: 12, fontWeight: '800', color: Gray[900], marginBottom: 1 }}>
        Trip Confirmed!
      </Text>
      <Text style={{ fontSize: 7, color: Gray[500], marginBottom: 8 }}>
        Your Rome adventure awaits
      </Text>

      {/* Trip Summary Card */}
      <View
        style={{
          width: '100%',
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        {/* Destination */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: Gray[100], paddingBottom: 5, marginBottom: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 1 }}>
            <FontAwesome name="map-marker" size={8} color={Blue[600]} />
            <Text style={{ fontSize: 8, fontWeight: '600', color: Blue[600] }}>
              {STEP3_TRIP_DETAILS.destination}
            </Text>
          </View>
          <Text style={{ fontSize: 9, fontWeight: '700', color: Gray[900] }}>
            {STEP3_TRIP_DETAILS.subtitle}
          </Text>
        </View>

        {/* Details */}
        {[
          { icon: 'calendar' as const, label: 'Dates', value: STEP3_TRIP_DETAILS.dates },
          { icon: 'users' as const, label: 'Travelers', value: STEP3_TRIP_DETAILS.travelers },
          { icon: 'plane' as const, label: 'Flight', value: STEP3_TRIP_DETAILS.flight },
        ].map((detail) => (
          <View key={detail.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <FontAwesome name={detail.icon} size={8} color="#1A5CC8" />
            <View>
              <Text style={{ fontSize: 5, color: Gray[400] }}>{detail.label}</Text>
              <Text style={{ fontSize: 7, fontWeight: '600', color: Gray[800] }}>{detail.value}</Text>
            </View>
          </View>
        ))}

        {/* Booking Reference */}
        <View style={{ borderTopWidth: 1, borderTopColor: Gray[100], paddingTop: 5, marginTop: 2 }}>
          <Text style={{ fontSize: 5, color: Gray[400], marginBottom: 1 }}>Booking Reference</Text>
          <Text style={{ fontSize: 8, fontWeight: '700', color: Gray[900], letterSpacing: 1 }}>
            {STEP3_TRIP_DETAILS.bookingRef}
          </Text>
        </View>

        {/* Total Price */}
        <LinearGradient
          colors={['#eff6ff', '#f0fdf4']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            borderRadius: 5,
            padding: 6,
            marginTop: 5,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 7, fontWeight: '500', color: Gray[600] }}>Total Price</Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: Gray[900] }}>
            {STEP3_TRIP_DETAILS.totalPrice}
          </Text>
        </LinearGradient>
      </View>

      {/* CTA Button */}
      <View
        style={{
          width: '100%',
          backgroundColor: Blue[600],
          borderRadius: 6,
          paddingVertical: 6,
          alignItems: 'center',
          marginTop: 6,
        }}
      >
        <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff' }}>View Full Itinerary</Text>
      </View>

      {/* Confirmation note */}
      <Text style={{ fontSize: 6, color: Gray[400], marginTop: 5 }}>
        Confirmation email sent to your inbox
      </Text>
    </LinearGradient>
  );
}
