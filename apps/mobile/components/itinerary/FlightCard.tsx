import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Navy, ITINERARY_COLORS } from '@travyl/shared';
import type { FlightViewModel } from '@travyl/shared';
import type { MockFlightDetail } from '@travyl/shared';

interface FlightCardProps {
  flight: FlightViewModel;
  detail?: MockFlightDetail;
  variant?: 'outbound' | 'return';
}

/* ── helpers ─────────────────────────────────────────────── */

function statusColor(status: MockFlightDetail['status']) {
  switch (status) {
    case 'On Time':
      return { bg: ITINERARY_COLORS.primary + '15', text: ITINERARY_COLORS.primary };
    case 'Delayed':
      return { bg: '#fef2f2', text: '#ef4444' };
    case 'Boarding':
      return { bg: '#fefce8', text: '#ca8a04' };
    default:
      return { bg: ITINERARY_COLORS.primary + '15', text: ITINERARY_COLORS.primary };
  }
}

function formatCurrency(amount: number, currency: string) {
  return `${currency === 'USD' ? '$' : currency + ' '}${amount.toLocaleString()}`;
}

/* ── component ───────────────────────────────────────────── */

export function FlightCard({ flight, detail, variant = 'outbound' }: FlightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isReturn = variant === 'return';

  const headerColors: [string, string] = isReturn
    ? [Navy.DEFAULT, Navy.light]
    : [ITINERARY_COLORS.primary, ITINERARY_COLORS.primaryDark];

  const hasDetail = !!detail;

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
      {/* ── Header band ─────────────────────────────────── */}
      <LinearGradient
        colors={headerColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FontAwesome
            name="plane"
            size={14}
            color="#fff"
            style={isReturn ? { transform: [{ rotate: '180deg' }] } : undefined}
          />
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
              {isReturn ? 'Return Flight' : 'Outbound Flight'}
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
              {flight.airline}{flight.flightNumber ? ` · ${flight.flightNumber}` : ''}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Confirmed badge */}
          <View style={{
            backgroundColor: '#10b981',
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '500', color: '#fff' }}>Confirmed</Text>
          </View>
          {flight.priceDisplay && (
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
              {flight.priceDisplay}
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* ── Route section ───────────────────────────────── */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Departure */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: Navy.DEFAULT }}>{flight.originIata}</Text>
            <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Departure</Text>
            {flight.departureDisplay && (
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', marginTop: 2 }}>{flight.departureDisplay}</Text>
            )}
          </View>

          {/* Route connector */}
          <View style={{ flex: 2, alignItems: 'center', paddingHorizontal: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <View style={{ flex: 1, height: 1, borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#d1d5db' }} />
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: ITINERARY_COLORS.primary,
                alignItems: 'center', justifyContent: 'center', marginHorizontal: 4,
              }}>
                <FontAwesome name="plane" size={11} color="#fff" />
              </View>
              <View style={{ flex: 1, height: 1, borderStyle: 'dashed', borderTopWidth: 1, borderColor: '#d1d5db' }} />
            </View>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              {detail ? detail.duration : 'Direct'}
            </Text>
          </View>

          {/* Arrival */}
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: Navy.DEFAULT }}>{flight.destIata}</Text>
            <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Arrival</Text>
            {flight.arrivalDisplay && (
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', marginTop: 2 }}>{flight.arrivalDisplay}</Text>
            )}
          </View>
        </View>

        {/* Status + Cabin row */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6',
        }}>
          {/* Status badge */}
          {detail ? (
            <View style={{
              backgroundColor: statusColor(detail.status).bg,
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '500', color: statusColor(detail.status).text }}>
                {detail.status}
              </Text>
            </View>
          ) : (
            <View style={{
              backgroundColor: ITINERARY_COLORS.primary + '15',
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '500', color: ITINERARY_COLORS.primary }}>On Time</Text>
            </View>
          )}
          {(detail?.cabinClass ?? flight.cabinClass) && (
            <View style={{
              backgroundColor: Navy.DEFAULT + '15',
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
            }}>
              <Text style={{ fontSize: 10, fontWeight: '500', color: Navy.DEFAULT }}>
                {detail?.cabinClass ?? flight.cabinClass}
              </Text>
            </View>
          )}
        </View>

        {/* ── Expand / collapse toggle ──────────────────── */}
        {hasDetail && (
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 12,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: '#f3f4f6',
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: ITINERARY_COLORS.primary }}>
              {expanded ? 'Hide Details' : 'View Details'}
            </Text>
            <FontAwesome
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={10}
              color={ITINERARY_COLORS.primary}
            />
          </Pressable>
        )}
      </View>

      {/* ── Expanded details section ────────────────────── */}
      {hasDetail && expanded && detail && (
        <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>

          {/* Details grid (2-column) */}
          <View style={{ backgroundColor: '#f9fafb', padding: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: Navy.DEFAULT, marginBottom: 10 }}>
              Flight Details
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <DetailCell icon="building" label="Dep. Terminal" value={detail.departureTerminal} />
              <DetailCell icon="sign-in" label="Gate" value={detail.gate} />
              <DetailCell icon="clock-o" label="Boarding" value={detail.boardingTime} />
              <DetailCell icon="fighter-jet" label="Aircraft" value={detail.aircraft} />
              <DetailCell icon="hourglass-half" label="Duration" value={detail.duration} />
              <DetailCell icon="users" label="Seats" value={detail.seats} />
            </View>
          </View>

          {/* Amenities row */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 12,
            gap: 16,
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
          }}>
            <AmenityChip icon="suitcase" text={detail.baggage} />
            <AmenityChip icon="cutlery" text={detail.meal} />
            <AmenityChip
              icon="wifi"
              text={detail.wifi ? 'Wi-Fi' : 'No Wi-Fi'}
              active={detail.wifi}
            />
          </View>

          {/* Booking section */}
          <View style={{
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
            backgroundColor: detail.isBooked ? '#f0fdf4' : '#fff',
          }}>
            {/* Confirmation row */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <View>
                <Text style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>Confirmation</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: detail.isBooked ? '#059669' : Navy.DEFAULT,
                    letterSpacing: 1,
                  }}>
                    {detail.confirmation}
                  </Text>
                  <FontAwesome name="copy" size={12} color="#9ca3af" />
                </View>
              </View>
              {/* Booking status badge */}
              <View style={{
                backgroundColor: detail.isBooked ? '#059669' : '#f59e0b',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 10,
              }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>
                  {detail.isBooked ? 'Booked' : 'Pending'}
                </Text>
              </View>
            </View>

            {/* Price breakdown */}
            <View style={{
              borderTopWidth: 1,
              borderTopColor: detail.isBooked ? '#bbf7d0' : '#f3f4f6',
              paddingTop: 10,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Per traveler</Text>
                <Text style={{ fontSize: 12, color: '#374151' }}>
                  {formatCurrency(detail.pricePerTraveler, detail.currency)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Travelers</Text>
                <Text style={{ fontSize: 12, color: '#374151' }}>
                  x {Math.round(detail.totalPrice / detail.pricePerTraveler)}
                </Text>
              </View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 4,
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: detail.isBooked ? '#bbf7d0' : '#e5e7eb',
              }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Navy.DEFAULT }}>Total</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: Navy.DEFAULT }}>
                  {formatCurrency(detail.totalPrice, detail.currency)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

/* ── sub-components ──────────────────────────────────────── */

function DetailCell({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={{ width: '50%', marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <FontAwesome name={icon} size={11} color={ITINERARY_COLORS.primary} />
        <Text style={{ fontSize: 10, color: '#9ca3af' }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginTop: 2, marginLeft: 17 }}>
        {value}
      </Text>
    </View>
  );
}

function AmenityChip({
  icon,
  text,
  active = true,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  text: string;
  active?: boolean;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: active ? ITINERARY_COLORS.primary + '12' : '#f3f4f6',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
    }}>
      <FontAwesome
        name={icon}
        size={11}
        color={active ? ITINERARY_COLORS.primary : '#9ca3af'}
      />
      <Text style={{
        fontSize: 11,
        fontWeight: '500',
        color: active ? Navy.DEFAULT : '#9ca3af',
      }}>
        {text}
      </Text>
    </View>
  );
}
