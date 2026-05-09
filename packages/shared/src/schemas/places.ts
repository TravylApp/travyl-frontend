import { z } from 'zod';
import type { PlaceItem } from '../types';

export const placeTypeSchema = z.enum([
  'destination',
  'attraction',
  'restaurant',
  'experience',
  'event',
  'hotel',
]);

export const priceLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const placeItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string(),
  images: z.array(z.string()).optional(),
  type: placeTypeSchema,
  rating: z.number(),
  tagline: z.string(),
  category: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  priceLevel: priceLevelSchema.optional(),
  hours: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  reviewCount: z.number().optional(),
  address: z.string().optional(),
  bestTimeToVisit: z.string().optional(),
  duration: z.string().optional(),
  admissionFee: z.string().optional(),
  tips: z.array(z.string()).optional(),
  accessibility: z.array(z.string()).optional(),
  nearbyPlaces: z.array(z.string()).optional(),
});

export const placesResponseSchema = z.array(placeItemSchema);

// Compile-time guard: schema and PlaceItem interface must stay in sync.
// If this errors, fix the schema or the interface so they match.
const _placeItemTypeCheck: PlaceItem = {} as z.infer<typeof placeItemSchema>;
void _placeItemTypeCheck;

export const placesQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  q: z.string().min(1).max(200).optional(),
  category: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PlacesQuery = z.infer<typeof placesQuerySchema>;
