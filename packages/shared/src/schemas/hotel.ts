import { z } from 'zod';
import type { Hotel, HotelData } from '../types';

export const hotelDataSchema = z.object({
  name: z.string(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  check_in: z.string(),
  check_out: z.string(),
  price_per_night: z.number().nullable(),
  total_price: z.number().nullable(),
  currency: z.string().nullable(),
  rating: z.number().nullable(),
  star_rating: z.number().nullable(),
  image_url: z.string().nullable(),
  booking_ref: z.string().nullable(),
  offer_id: z.string().nullable(),
});

const _hd: HotelData = {} as z.infer<typeof hotelDataSchema>;
void _hd;

export const hotelSchema = z.object({
  id: z.string(),
  trip_id: z.string(),
  data: hotelDataSchema,
  created_at: z.string(),
});

const _h: Hotel = {} as z.infer<typeof hotelSchema>;
void _h;

// Inbound — hotel search query
export const hotelSearchQuerySchema = z.object({
  destination: z.string().min(1).max(200).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  check_in: z.string(),
  check_out: z.string(),
  guests: z.coerce.number().int().min(1).max(20).default(2),
  rooms: z.coerce.number().int().min(1).max(10).default(1),
}).refine(
  (q) => q.destination || (q.lat != null && q.lng != null),
  { message: 'Provide either destination or lat+lng' },
);
export type HotelSearchQuery = z.infer<typeof hotelSearchQuerySchema>;
