'use client'

import { supabase, type DocumentType, type DocumentParseData } from '@travyl/shared'
import type { QueryClient } from '@tanstack/react-query'

function resolveValue(val: any): any {
  if (val == null) return null
  if (typeof val === 'object' && 'value' in val) return val.value
  return val
}

export async function writeDocumentToTrip(
  docType: DocumentType,
  data: Record<string, any>,
  tripId: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  switch (docType) {
    case 'hotel': {
      const { error } = await supabase.from('hotels').insert({
        trip_id: tripId,
        data: {
          name: data.name ?? null,
          address: data.address ?? null,
          check_in: resolveValue(data.checkIn) ?? null,
          check_out: resolveValue(data.checkOut) ?? null,
          price_per_night: resolveValue(data.pricePerNight) ?? null,
          total_price: resolveValue(data.totalPrice) ?? null,
          currency: data.currency ?? null,
          booking_ref: data.bookingRef ?? null,
          phone: data.phone ?? null,
          notes: data.note ?? null,
        },
      })
      if (error) throw error
      break
    }

    case 'flight': {
      const { error } = await supabase.from('flights').insert({
        trip_id: tripId,
        data: {
          airline: data.airline ?? null,
          flight_number: data.flightNumber ?? null,
          departure_at: data.departureAt ?? null,
          arrival_at: data.arrivalAt ?? null,
          departure_airport: data.departureAirport ?? null,
          arrival_airport: data.arrivalAirport ?? null,
          booking_ref: data.bookingRef ?? null,
          seat: data.seat ?? null,
          price: resolveValue(data.price) ?? null,
          currency: data.currency ?? null,
          notes: data.note ?? null,
        },
      })
      if (error) throw error
      break
    }

    case 'car': {
      const { error } = await supabase.from('activity').insert({
        trip_id: tripId,
        user_id: user.id,
        activity_name: data.company ? `Car Rental — ${data.company}` : 'Car Rental',
        activity_type: 'transport',
        starting_date: data.pickupAt?.split('T')[0] ?? null,
        ending_date: data.dropoffAt?.split('T')[0] ?? data.pickupAt?.split('T')[0] ?? null,
        starting_time: data.pickupAt?.split('T')[1] ?? null,
        ending_time: data.dropoffAt?.split('T')[1] ?? null,
        notes: [data.pickupLocation, data.dropoffLocation, data.note].filter(Boolean).join(' — ') || null,
        sort_order: 0,
        activity_data: {
          type: 'car_rental',
          company: data.company ?? null,
          pickup_location: data.pickupLocation ?? null,
          dropoff_location: data.dropoffLocation ?? null,
          booking_ref: data.bookingRef ?? null,
          price: resolveValue(data.price) ?? null,
          currency: data.currency ?? null,
        },
      })
      if (error) throw error
      break
    }

    case 'activity': {
      const { error } = await supabase.from('activity').insert({
        trip_id: tripId,
        user_id: user.id,
        activity_name: data.name ?? 'Activity',
        activity_type: data.category ?? 'sightseeing',
        starting_date: data.date?.split('T')[0] ?? null,
        ending_date: data.date?.split('T')[0] ?? null,
        starting_time: data.time ?? null,
        ending_time: null,
        latitude: data.lat ?? null,
        longitude: data.lng ?? null,
        notes: data.note ?? null,
        sort_order: 0,
        activity_data: {
          type: 'booked_activity',
          booking_ref: data.bookingRef ?? null,
          price: resolveValue(data.price) ?? null,
          currency: data.currency ?? null,
        },
      })
      if (error) throw error
      break
    }

    default:
      throw new Error(`Cannot save document type: ${docType}. Please classify it first.`)
  }
}

/**
 * Invalidate React Query caches so the UI reflects new data.
 */
export function invalidateDocumentCaches(queryClient: QueryClient, tripId: string) {
  queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  queryClient.invalidateQueries({ queryKey: ['itinerary', tripId] })
  queryClient.invalidateQueries({ queryKey: ['activity', tripId] })
  queryClient.invalidateQueries({ queryKey: ['hotels', tripId] })
  queryClient.invalidateQueries({ queryKey: ['flights', tripId] })
}
