import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Text, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen,
  Navy,
  ITINERARY_COLORS,
  MOCK_FLIGHT_DETAILS,
  MOCK_HOTEL_DETAIL,
} from '@travyl/shared';
import type { MockFlightDetail, MockHotelDetail } from '@travyl/shared';
import { DaySelector, TimeGroupSection } from '@/components/itinerary';

// ─── Skeleton Components ────────────────────────────────────

function SkeletonBlock({ width, height, radius = 6, style }: { width: number | string; height: number; radius?: number; style?: any }) {
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: '#e5e7eb' }, style]} />;
}

function SkeletonActivityCard() {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' }}>
      <View style={{ height: 150, backgroundColor: '#f3f4f6', position: 'relative' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name="picture-o" size={28} color="#e5e7eb" />
        </View>
        <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <SkeletonBlock width={50} height={10} />
        </View>
        <View style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.9)' }} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', justifyContent: 'flex-end', padding: 12 }}
        >
          <SkeletonBlock width="65%" height={15} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <SkeletonBlock width="45%" height={11} style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 4 }} />
        </LinearGradient>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <FontAwesome name="clock-o" size={11} color="#d1d5db" />
          <SkeletonBlock width={60} height={12} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <FontAwesome name="star" size={11} color="#fde68a" />
            <SkeletonBlock width={22} height={12} />
          </View>
          <SkeletonBlock width={40} height={14} />
        </View>
      </View>
    </View>
  );
}

function SkeletonTimeSection({ icon }: { icon: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <LinearGradient
        colors={[ITINERARY_COLORS.primary, ITINERARY_COLORS.primary + 'cc']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <FontAwesome name={icon as any} size={18} color="#fff" />
          <View>
            <SkeletonBlock width={70} height={14} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <SkeletonBlock width={90} height={11} style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 4 }} />
          </View>
        </View>
        <FontAwesome name="chevron-down" size={14} color="rgba(255,255,255,0.5)" />
      </LinearGradient>
      <View style={{ marginTop: 10, gap: 10 }}>
        <SkeletonActivityCard />
        <SkeletonActivityCard />
      </View>
    </View>
  );
}

function ItinerarySkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: ITINERARY_COLORS.containerBg, paddingVertical: 8, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 10 }}>
          <LinearGradient colors={[Navy.DEFAULT, Navy.light]} style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 74, alignItems: 'center' }}>
            <SkeletonBlock width={30} height={10} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <SkeletonBlock width={50} height={12} style={{ backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 2 }} />
          </LinearGradient>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 74, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' }}>
              <SkeletonBlock width={30} height={10} />
              <SkeletonBlock width={50} height={12} style={{ marginTop: 2 }} />
            </View>
          ))}
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
        <SkeletonTimeSection icon="sun-o" />
        <SkeletonTimeSection icon="sun-o" />
        <SkeletonTimeSection icon="moon-o" />
      </ScrollView>
    </View>
  );
}

// ─── FlightSection (inline) ─────────────────────────────────

function FlightSection({ flight, collapsed }: { flight: MockFlightDetail; collapsed?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (collapsed !== undefined) setExpanded(!collapsed);
  }, [collapsed]);

  const label = flight.type === 'arrival' ? 'Arrival Flight' : 'Return Flight';
  const gradientColors: [string, string] = flight.type === 'arrival'
    ? ['#2563eb', '#1d4ed8']
    : ['#1e3a5f', '#0f2440'];

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Header */}
      <Pressable onPress={() => setExpanded(!expanded)}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <FontAwesome name="plane" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{label}</Text>
                {flight.isBooked && (
                  <View style={{ backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>Booked</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
                Flight {flight.flightNumber} &bull; {flight.departureTime}
              </Text>
            </View>
          </View>
          <FontAwesome
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#fff"
          />
        </LinearGradient>
      </Pressable>

      {/* Expandable details */}
      {expanded && (
        <View style={{
          marginTop: 8,
          backgroundColor: '#fff',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#bfdbfe',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}>
          {/* Flight Route Visualization */}
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Departure */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Departure</Text>
                <Text style={{ fontSize: 22, color: '#1e3a5f', fontWeight: '700' }}>{flight.originIata}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1f2937', marginTop: 4 }}>{flight.departureTime}</Text>
                <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{flight.departureTerminal}</Text>
                <Text style={{ fontSize: 10, color: '#9ca3af' }}>Gate {flight.gate}</Text>
                <Text style={{ fontSize: 10, color: '#9ca3af' }}>Boarding: {flight.boardingTime}</Text>
              </View>

              {/* Duration line */}
              <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
                <View style={{ width: '100%', position: 'relative', alignItems: 'center' }}>
                  <View style={{ width: '100%', height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#d1d5db' }} />
                  <View style={{
                    position: 'absolute',
                    top: -10,
                    backgroundColor: '#1e3a5f',
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FontAwesome name="plane" size={10} color="#fff" />
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 12 }}>{flight.duration}</Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#10b981' }}>Direct</Text>
              </View>

              {/* Arrival */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>Arrival</Text>
                <Text style={{ fontSize: 22, color: '#1e3a5f', fontWeight: '700' }}>{flight.destIata}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1f2937', marginTop: 4 }}>{flight.arrivalTime}</Text>
                <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{flight.arrivalTerminal}</Text>
              </View>
            </View>

            {/* Airline & Status row */}
            <View style={{
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#f3f4f6',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#1f2937' }}>{flight.airline}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#6b7280' }}>Check-in: {flight.boardingTime}</Text>
                <View style={{ backgroundColor: '#1e3a5f15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#1e3a5f' }}>{flight.status}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Details Grid */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
            <View style={{ paddingTop: 12 }}>
              {[
                { left: { label: 'Flight', value: flight.flightNumber }, right: { label: 'Duration', value: flight.duration } },
                { left: { label: 'Aircraft', value: flight.aircraft }, right: { label: 'Class', value: flight.cabinClass } },
                { left: { label: 'Seats', value: flight.seats }, right: { label: 'Baggage', value: flight.baggage } },
                { left: { label: 'Meal', value: flight.meal }, right: { label: 'Wi-Fi', value: flight.wifi ? 'Available' : 'N/A' } },
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingRight: 12 }}>
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>{row.left.label}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#1f2937' }}>{row.left.value}</Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 12 }}>
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>{row.right.label}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#1f2937' }}>{row.right.value}</Text>
                  </View>
                </View>
              ))}
              {/* Confirmation */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={{ fontSize: 11, color: '#6b7280' }}>Confirmation</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1e3a5f', fontFamily: 'monospace' }}>{flight.confirmation}</Text>
              </View>
            </View>

            {/* Booking row */}
            <View style={{
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#f3f4f6',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View>
                <Text style={{ fontSize: 10, color: '#6b7280' }}>Per traveler</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e3a5f' }}>${flight.pricePerTraveler}</Text>
                <Text style={{ fontSize: 10, color: '#9ca3af' }}>Total: ${flight.totalPrice}</Text>
              </View>
              <View style={{
                backgroundColor: flight.isBooked ? '#10b981' : '#1e3a5f',
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}>
                <FontAwesome name={flight.isBooked ? 'check' : 'plane'} size={12} color="#fff" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>
                  {flight.isBooked ? 'Flight Booked' : 'Book Flight'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── HotelSection (inline) ──────────────────────────────────

function HotelSection({ hotel, label, collapsed }: { hotel: MockHotelDetail; label: string; collapsed?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (collapsed !== undefined) setExpanded(!collapsed);
  }, [collapsed]);

  const roomPrice = hotel.rooms.find((r) => r.isSelected)?.pricePerNight ?? hotel.rooms[0]?.pricePerNight ?? 0;
  const isConfirmed = hotel.confirmationNumber && hotel.isBooked;

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Header */}
      <Pressable onPress={() => setExpanded(!expanded)}>
        <LinearGradient
          colors={['#1e3a5f', 'rgba(30, 58, 95, 0.85)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <FontAwesome name="building" size={16} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{hotel.name}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
                {'★'} {hotel.rating} &bull; ${roomPrice}/night &bull; {label}
              </Text>
            </View>
          </View>
          <FontAwesome
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#fff"
          />
        </LinearGradient>
      </Pressable>

      {/* Expandable details */}
      {expanded && (
        <View style={{
          marginTop: 8,
          backgroundColor: '#fff',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}>
          <View style={{ padding: 16 }}>
            {/* Status badges */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <View style={{
                backgroundColor: isConfirmed ? '#1e3a5f' : '#60a5fa',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 10,
              }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>
                  {isConfirmed ? 'Confirmed' : 'Selected'}
                </Text>
              </View>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                backgroundColor: '#dbeafe',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}>
                <FontAwesome name="star" size={9} color="#2563eb" />
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#1e40af' }}>
                  {hotel.rating}/5
                </Text>
              </View>
              {hotel.starRating > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <FontAwesome key={i} name="star" size={10} color="#f59e0b" />
                  ))}
                </View>
              )}
            </View>

            {/* Hotel name */}
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{hotel.name}</Text>

            {/* Check-in / Check-out times */}
            <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
              Check-in: {hotel.checkInTime} &bull; Check-out: {hotel.checkOutTime}
            </Text>

            {/* Address */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 6,
              backgroundColor: '#f9fafb',
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#f3f4f6',
              marginBottom: 12,
            }}>
              <FontAwesome name="map-marker" size={14} color="#8b6f47" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#111827', lineHeight: 17 }}>{hotel.address}</Text>
                {hotel.neighborhood && (
                  <Text style={{ fontSize: 10, color: '#1e3a5f', marginTop: 2 }}>{hotel.neighborhood}</Text>
                )}
              </View>
            </View>

            {/* Room info */}
            {hotel.rooms.length > 0 && (() => {
              const selectedRoom = hotel.rooms.find((r) => r.isSelected) ?? hotel.rooms[0];
              return (
                <View style={{
                  backgroundColor: '#f0f4f8',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <FontAwesome name="bed" size={12} color="#1e3a5f" />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>{selectedRoom.name}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e3a5f' }}>${selectedRoom.pricePerNight}/nt</Text>
                  </View>
                  {selectedRoom.beds && (
                    <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{selectedRoom.beds}</Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {selectedRoom.maxGuests && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <FontAwesome name="user" size={10} color="#6b7280" />
                        <Text style={{ fontSize: 10, color: '#6b7280' }}>{selectedRoom.maxGuests} guests</Text>
                      </View>
                    )}
                    {selectedRoom.size && (
                      <Text style={{ fontSize: 10, color: '#6b7280' }}>{selectedRoom.size}</Text>
                    )}
                  </View>
                </View>
              );
            })()}

            {/* Amenities */}
            {hotel.amenities.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {hotel.amenities.map((amenity) => (
                  <View key={amenity} style={{
                    backgroundColor: '#f3f4f6',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#e5e7eb',
                  }}>
                    <Text style={{ fontSize: 10, color: '#4b5563' }}>{amenity}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Confirmation */}
            {isConfirmed && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#ecfdf5',
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#a7f3d0',
              }}>
                <FontAwesome name="check-circle" size={14} color="#10b981" />
                <View>
                  <Text style={{ fontSize: 9, color: '#059669', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Confirmation</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857', fontFamily: 'monospace' }}>{hotel.confirmationNumber}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── CheckoutSection (inline) ───────────────────────────────

function CheckoutSection({ hotelName, hotelAddress, checkOutTime, collapsed }: {
  hotelName: string;
  hotelAddress: string;
  checkOutTime: string;
  collapsed?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (collapsed !== undefined) setExpanded(!collapsed);
  }, [collapsed]);

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Header */}
      <Pressable onPress={() => setExpanded(!expanded)}>
        <LinearGradient
          colors={['#2d4a6f', '#3a6b9f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <FontAwesome name="sign-out" size={18} color="#fff" />
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Check-out</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
                {checkOutTime} &bull; {hotelName}
              </Text>
            </View>
          </View>
          <FontAwesome
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#fff"
          />
        </LinearGradient>
      </Pressable>

      {/* Expandable details */}
      {expanded && (
        <View style={{
          marginTop: 8,
          backgroundColor: '#fff',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          overflow: 'hidden',
          padding: 16,
          gap: 12,
        }}>
          {/* Checkout time */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#fff7ed',
            padding: 12,
            borderRadius: 12,
          }}>
            <FontAwesome name="clock-o" size={16} color="#f97316" />
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Check-out by {checkOutTime}</Text>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Late checkout may incur additional charges</Text>
            </View>
          </View>

          {/* Hotel info */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#f9fafb',
            padding: 12,
            borderRadius: 12,
          }}>
            <FontAwesome name="building" size={16} color="#6b7280" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>{hotelName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <FontAwesome name="map-marker" size={10} color="#9ca3af" />
                <Text style={{ fontSize: 11, color: '#6b7280' }}>{hotelAddress}</Text>
              </View>
            </View>
          </View>

          {/* Reminders */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Reminders</Text>
            <View style={{ gap: 6 }}>
              <ReminderRow icon="key" text="Return room keys to front desk" />
              <ReminderRow icon="exclamation-circle" text="Check minibar charges before leaving" />
              <ReminderRow icon="car" text="Arrange transportation to next destination" />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function ReminderRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#fffbeb',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#fef3c7',
    }}>
      <FontAwesome name={icon as any} size={13} color="#d97706" />
      <Text style={{ fontSize: 12, color: '#374151', flex: 1 }}>{text}</Text>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────

export default function ItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { days, selectedDayIndex, setSelectedDayIndex, selectedDay, isLoading, isEmpty } =
    useItineraryScreen(id);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [allCollapsedOverride, setAllCollapsedOverride] = useState<boolean | null>(null);

  const arrivalFlight = MOCK_FLIGHT_DETAILS.find((f) => f.type === 'arrival');
  const returnFlight = MOCK_FLIGHT_DETAILS.find((f) => f.type === 'return');

  const isFirstDay = selectedDayIndex === 0;
  const isLastDay = selectedDayIndex === days.length - 1;

  const allCollapsed = selectedDay
    ? selectedDay.timeGroups.every((g) => collapsedSections[g.timeOfDay])
    : false;

  const toggleCollapseAll = useCallback(() => {
    if (!selectedDay) return;
    const newState = !allCollapsed;
    const next: Record<string, boolean> = {};
    for (const g of selectedDay.timeGroups) {
      next[g.timeOfDay] = newState;
    }
    setCollapsedSections(next);
    setAllCollapsedOverride(newState);
  }, [selectedDay, allCollapsed]);

  const toggleSectionCollapse = useCallback((timeOfDay: string) => {
    setCollapsedSections((prev) => ({ ...prev, [timeOfDay]: !prev[timeOfDay] }));
    setAllCollapsedOverride(null);
  }, []);

  const handleAddActivity = useCallback((timeOfDay: string) => {
    // Placeholder: will open browse/add panel in future
    console.log('Add activity to:', timeOfDay);
  }, []);

  if (isLoading || isEmpty) {
    return <ItinerarySkeleton />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Day Selector */}
      <DaySelector days={days} selectedIndex={selectedDayIndex} onSelect={setSelectedDayIndex} />

      {/* Collapse All bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}>
        <Text style={{ fontSize: 12, color: '#6b7280' }}>
          {selectedDay?.timeGroups.length ?? 0} time blocks
        </Text>
        <Pressable
          onPress={toggleCollapseAll}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            backgroundColor: allCollapsed ? '#1e3a5f' : '#f3f4f6',
          }}
        >
          <FontAwesome
            name={allCollapsed ? 'expand' : 'compress'}
            size={11}
            color={allCollapsed ? '#fff' : '#6b7280'}
          />
          <Text style={{ fontSize: 11, fontWeight: '500', color: allCollapsed ? '#fff' : '#6b7280' }}>
            {allCollapsed ? 'Expand All' : 'Collapse All'}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 32 }}>
        {selectedDay && (
          <View>
            {/* Arrival flight on first day */}
            {isFirstDay && arrivalFlight && (
              <FlightSection flight={arrivalFlight} collapsed={allCollapsedOverride ?? undefined} />
            )}

            {/* Hotel check-in on first day */}
            {isFirstDay && (
              <HotelSection
                hotel={MOCK_HOTEL_DETAIL}
                label={`Check-in \u00b7 ${selectedDay.dateLabel}`}
                collapsed={allCollapsedOverride ?? undefined}
              />
            )}

            {/* Time groups */}
            {selectedDay.timeGroups.map((group) => (
              <TimeGroupSection
                key={group.timeOfDay}
                group={group}
                collapsed={collapsedSections[group.timeOfDay]}
                onToggleCollapse={toggleSectionCollapse}
                onAddActivity={handleAddActivity}
              />
            ))}

            {/* Hotel nightly on middle days */}
            {!isFirstDay && !isLastDay && (
              <HotelSection
                hotel={MOCK_HOTEL_DETAIL}
                label={`Night ${selectedDay.dayNumber} \u00b7 ${selectedDay.dateLabel}`}
                collapsed={allCollapsedOverride ?? undefined}
              />
            )}

            {/* Checkout + return flight on last day */}
            {isLastDay && (
              <>
                <CheckoutSection
                  hotelName={MOCK_HOTEL_DETAIL.name}
                  hotelAddress={MOCK_HOTEL_DETAIL.address}
                  checkOutTime={MOCK_HOTEL_DETAIL.checkOutTime}
                  collapsed={allCollapsedOverride ?? undefined}
                />
                {returnFlight && (
                  <FlightSection flight={returnFlight} collapsed={allCollapsedOverride ?? undefined} />
                )}
              </>
            )}

            {/* Day notes */}
            {selectedDay.notes && (
              <View style={{
                backgroundColor: '#f9fafb',
                borderRadius: 10,
                padding: 12,
                marginTop: 4,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#f3f4f6',
              }}>
                <Text style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', lineHeight: 18 }}>
                  {selectedDay.notes}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
