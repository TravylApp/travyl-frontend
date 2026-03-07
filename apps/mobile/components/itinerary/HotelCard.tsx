import { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Linking,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Navy } from '@travyl/shared';
import type { HotelViewModel, MockHotelDetail, MockHotelRoom } from '@travyl/shared';

interface HotelCardProps {
  hotel: HotelViewModel;
  detail?: MockHotelDetail;
}

/* ---------- helpers ---------- */

const AMENITY_ICONS: Record<string, string> = {
  'Wi-Fi': 'wifi',
  'wifi': 'wifi',
  'Coffee': 'coffee',
  'coffee': 'coffee',
  'AC': 'snowflake-o',
  'air conditioning': 'snowflake-o',
  'Pool': 'tint',
  'pool': 'tint',
  'Gym': 'heartbeat',
  'gym': 'heartbeat',
  'Spa': 'leaf',
  'spa': 'leaf',
  'Restaurant': 'cutlery',
  'restaurant': 'cutlery',
  'Bar': 'glass',
  'bar': 'glass',
  'Parking': 'car',
  'parking': 'car',
  'Pet Friendly': 'paw',
  'Laundry': 'refresh',
  'Room Service': 'bell',
  'TV': 'television',
  'tv': 'television',
  'Minibar': 'glass',
};

function amenityIcon(name: string): string {
  return AMENITY_ICONS[name] ?? 'check';
}

function ratingColor(score: number): string {
  if (score >= 8.5) return '#10b981';
  if (score >= 7) return '#14b8a6';
  if (score >= 5) return '#f59e0b';
  return '#ef4444';
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn);
  const d2 = new Date(checkOut);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
}

/* ---------- sub-components ---------- */

function ImageCarousel({
  images,
  width,
}: {
  images: string[];
  width: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / width);
    setCurrentIndex(idx);
  };

  return (
    <View style={{ position: 'relative' }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      >
        {images.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={{ width, height: 180 }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      {/* Counter badge */}
      <View
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          backgroundColor: 'rgba(0,0,0,0.55)',
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 10,
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>
          {currentIndex + 1}/{images.length}
        </Text>
      </View>
    </View>
  );
}

function AmenitiesRow({ amenities }: { amenities: string[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 10 }}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}
    >
      {amenities.map((a) => (
        <View
          key={a}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: '#eff6ff',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 10,
          }}
        >
          <FontAwesome name={amenityIcon(a) as any} size={10} color={Navy.DEFAULT} />
          <Text style={{ fontSize: 10, color: Navy.DEFAULT, fontWeight: '500' }}>{a}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function RoomCard({
  room,
  onSelect,
}: {
  room: MockHotelRoom;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={{
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        borderWidth: room.isSelected ? 2 : 1,
        borderColor: room.isSelected ? '#3b82f6' : '#e5e7eb',
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      <Image
        source={{ uri: room.image }}
        style={{ width: 60, height: 60 }}
        resizeMode="cover"
      />
      <View style={{ flex: 1, padding: 8, gap: 3 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: Navy.DEFAULT }} numberOfLines={1}>
          {room.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {room.beds && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <FontAwesome name="bed" size={8} color="#6b7280" />
              <Text style={{ fontSize: 9, color: '#6b7280' }}>{room.beds}</Text>
            </View>
          )}
          {room.size && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <FontAwesome name="expand" size={8} color="#6b7280" />
              <Text style={{ fontSize: 9, color: '#6b7280' }}>{room.size}</Text>
            </View>
          )}
          {room.maxGuests != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <FontAwesome name="users" size={8} color="#6b7280" />
              <Text style={{ fontSize: 9, color: '#6b7280' }}>{room.maxGuests} guests</Text>
            </View>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4, marginTop: 2 }}
        >
          {room.amenities.map((a) => (
            <View
              key={a}
              style={{
                backgroundColor: '#e0e7ff',
                paddingHorizontal: 5,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 8, color: '#4338ca' }}>{a}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={{ justifyContent: 'center', paddingRight: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: Navy.DEFAULT }}>
          ${room.pricePerNight}
        </Text>
        <Text style={{ fontSize: 8, color: '#9ca3af', textAlign: 'right' }}>/night</Text>
      </View>
    </Pressable>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
      <Text style={{ fontSize: 10, color: '#6b7280', width: 72 }}>{label}</Text>
      <View
        style={{
          flex: 1,
          height: 5,
          backgroundColor: '#e5e7eb',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: ratingColor(value),
            borderRadius: 3,
          }}
        />
      </View>
      <Text style={{ fontSize: 10, fontWeight: '600', color: '#374151', width: 24, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

/* ---------- main component ---------- */

export function HotelCard({ hotel, detail }: HotelCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [roomsExpanded, setRoomsExpanded] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    detail?.rooms.find((r) => r.isSelected)?.id ?? null,
  );

  // Card width accounting for parent padding (estimated 16 each side + border)
  const cardWidth = screenWidth - 32;

  const nights = detail
    ? nightsBetween(detail.checkInDate, detail.checkOutDate)
    : undefined;

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      {/* ===== Navy header band ===== */}
      <View
        style={{
          backgroundColor: Navy.DEFAULT,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <FontAwesome name="building" size={14} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }} numberOfLines={1}>
              {hotel.name}
            </Text>
            {(detail?.starRating ?? hotel.starRating) != null && (
              <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                {Array.from({ length: detail?.starRating ?? hotel.starRating ?? 0 }).map((_, i) => (
                  <FontAwesome key={i} name="star" size={8} color="#fbbf24" />
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Confirmation / Booked badge */}
          {(detail?.isBooked ?? true) && (
            <View
              style={{
                backgroundColor: '#10b981',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '500', color: '#fff' }}>Booked</Text>
            </View>
          )}
          {hotel.priceDisplay && (
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
              {hotel.priceDisplay}
            </Text>
          )}
        </View>
      </View>

      {/* ===== Image section ===== */}
      {detail && detail.images.length > 0 ? (
        <ImageCarousel images={detail.images} width={cardWidth} />
      ) : hotel.imageUrl ? (
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: hotel.imageUrl }}
            style={{ width: '100%', height: 160 }}
            resizeMode="cover"
          />
          {hotel.rating != null && (
            <View
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                backgroundColor: 'rgba(255,255,255,0.9)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <FontAwesome name="star" size={10} color="#fbbf24" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: Navy.DEFAULT }}>
                {hotel.rating}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View
          style={{
            height: 120,
            backgroundColor: '#eff6ff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesome name="image" size={28} color={Navy.DEFAULT + '30'} />
        </View>
      )}

      {/* ===== Amenities row ===== */}
      {detail && detail.amenities.length > 0 && (
        <AmenitiesRow amenities={detail.amenities} />
      )}

      {/* ===== Details section ===== */}
      <View style={{ padding: 14 }}>
        {/* Address + neighborhood */}
        {(detail?.address ?? hotel.address) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            <FontAwesome name="map-marker" size={10} color="#9ca3af" />
            <Text style={{ fontSize: 11, color: '#6b7280', flex: 1 }} numberOfLines={1}>
              {detail?.address ?? hotel.address}
              {detail?.neighborhood ? ` \u2022 ${detail.neighborhood}` : ''}
            </Text>
          </View>
        ) : null}

        {/* Check-in / Check-out badges */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <View
            style={{
              backgroundColor: '#ecfdf5',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <FontAwesome name="sign-in" size={9} color="#059669" />
            <Text style={{ fontSize: 10, color: '#059669', fontWeight: '500' }}>
              {detail ? `${detail.checkInDate} ${detail.checkInTime}` : hotel.checkInDisplay}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#fffbeb',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <FontAwesome name="sign-out" size={9} color="#d97706" />
            <Text style={{ fontSize: 10, color: '#d97706', fontWeight: '500' }}>
              {detail ? `${detail.checkOutDate} ${detail.checkOutTime}` : hotel.checkOutDisplay}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: '#6b7280' }}>
            {detail ? `${nights} night${nights !== 1 ? 's' : ''}` : hotel.nightsLabel}
          </Text>
        </View>

        {/* ===== Confirmation badge (when booked) ===== */}
        {detail?.isBooked && detail.confirmationNumber ? (
          <View
            style={{
              marginTop: 12,
              backgroundColor: '#ecfdf5',
              borderWidth: 1,
              borderColor: '#a7f3d0',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FontAwesome name="check-circle" size={16} color="#10b981" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#059669' }}>
                Confirmed
              </Text>
              <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                Confirmation #{detail.confirmationNumber}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ===== Guest Ratings ===== */}
        {detail?.guestRatings && (
          <View style={{ marginTop: 14 }}>
            {/* Overall badge + label */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View
                style={{
                  backgroundColor: ratingColor(detail.guestRatings.overall),
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
                  {detail.guestRatings.overall}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Navy.DEFAULT }}>
                  {detail.guestRatings.label}
                </Text>
                <Text style={{ fontSize: 10, color: '#9ca3af' }}>
                  {detail.guestRatings.totalRatings.toLocaleString()} ratings
                </Text>
              </View>
            </View>
            {/* Sub-scores */}
            <RatingBar label="Cleanliness" value={detail.guestRatings.cleanliness} />
            <RatingBar label="Staff" value={detail.guestRatings.staff} />
            <RatingBar label="Location" value={detail.guestRatings.location} />
            <RatingBar label="Comfort" value={detail.guestRatings.comfort} />
            <RatingBar label="Value" value={detail.guestRatings.value} />
          </View>
        )}

        {/* ===== Room Selection ===== */}
        {detail && detail.rooms.length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Pressable
              onPress={() => setRoomsExpanded((prev) => !prev)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 8,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: Navy.DEFAULT }}>
                Room Types
              </Text>
              <FontAwesome
                name={roomsExpanded ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={Navy.DEFAULT}
              />
            </Pressable>
            {roomsExpanded &&
              detail.rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={{ ...room, isSelected: room.id === selectedRoomId }}
                  onSelect={() => setSelectedRoomId(room.id)}
                />
              ))}
          </View>
        )}

        {/* ===== Price Breakdown ===== */}
        {detail && nights != null && (
          <View
            style={{
              marginTop: 14,
              backgroundColor: '#f8fafc',
              borderRadius: 10,
              padding: 12,
              gap: 5,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: Navy.DEFAULT, marginBottom: 4 }}>
              Price Breakdown
            </Text>
            {/* Nightly rate */}
            {detail.rooms.length > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: '#6b7280' }}>
                  {detail.currency}
                  {(detail.rooms.find((r) => r.id === selectedRoomId) ?? detail.rooms[0])
                    .pricePerNight}{' '}
                  x {nights} night{nights !== 1 ? 's' : ''}
                </Text>
                <Text style={{ fontSize: 11, color: '#374151' }}>
                  {detail.currency}
                  {(
                    (detail.rooms.find((r) => r.id === selectedRoomId) ?? detail.rooms[0])
                      .pricePerNight * nights
                  ).toFixed(2)}
                </Text>
              </View>
            )}
            {/* Taxes & fees */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, color: '#6b7280' }}>City Tax</Text>
              <Text style={{ fontSize: 11, color: '#374151' }}>
                {detail.currency}{detail.taxesAndFees.cityTax.toFixed(2)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, color: '#6b7280' }}>Service Fee</Text>
              <Text style={{ fontSize: 11, color: '#374151' }}>
                {detail.currency}{detail.taxesAndFees.serviceFee.toFixed(2)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, color: '#6b7280' }}>VAT</Text>
              <Text style={{ fontSize: 11, color: '#374151' }}>
                {detail.currency}{detail.taxesAndFees.vat.toFixed(2)}
              </Text>
            </View>
            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#e5e7eb', marginVertical: 4 }} />
            {/* Total */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Navy.DEFAULT }}>Total</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Navy.DEFAULT }}>
                {detail.currency}{detail.totalPrice.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* ===== Contact Buttons ===== */}
        {detail && (
          <View
            style={{
              marginTop: 14,
              flexDirection: 'row',
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            {/* Call */}
            <Pressable
              onPress={() => Linking.openURL(`tel:${detail.phone}`)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                gap: 4,
                borderRightWidth: 1,
                borderRightColor: '#e5e7eb',
              }}
            >
              <FontAwesome name="phone" size={16} color={Navy.DEFAULT} />
              <Text style={{ fontSize: 10, color: Navy.DEFAULT, fontWeight: '500' }}>Call</Text>
            </Pressable>
            {/* Email */}
            <Pressable
              onPress={() => Linking.openURL(`mailto:${detail.email}`)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                gap: 4,
                borderRightWidth: 1,
                borderRightColor: '#e5e7eb',
              }}
            >
              <FontAwesome name="envelope" size={16} color={Navy.DEFAULT} />
              <Text style={{ fontSize: 10, color: Navy.DEFAULT, fontWeight: '500' }}>Email</Text>
            </Pressable>
            {/* Map */}
            <Pressable
              onPress={() =>
                Linking.openURL(
                  `https://maps.google.com/?q=${detail.lat},${detail.lng}`,
                )
              }
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                gap: 4,
              }}
            >
              <FontAwesome name="map" size={16} color={Navy.DEFAULT} />
              <Text style={{ fontSize: 10, color: Navy.DEFAULT, fontWeight: '500' }}>Map</Text>
            </Pressable>
          </View>
        )}

        {/* ===== Book / View Website button ===== */}
        {detail ? (
          <Pressable
            onPress={() => Linking.openURL(detail.website)}
            style={{
              marginTop: 12,
              backgroundColor: detail.isBooked ? Navy.DEFAULT : '#60a5fa',
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
              {detail.isBooked ? 'View on Website' : 'Book Hotel'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={{
              marginTop: 12,
              backgroundColor: '#60a5fa',
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>Book Hotel</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
