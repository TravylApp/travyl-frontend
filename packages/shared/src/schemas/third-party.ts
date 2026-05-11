import { z } from 'zod';
import type { BackendPlace } from '../utils/places';

// ─── Travyl FastAPI backend ─────────────────────────────────

export const backendPlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  category: z.string(),
  subcategory: z.string().optional(),
  rating: z.number(),
  review_count: z.number().optional(),
  price_level: z.union([z.string(), z.number(), z.null()]).optional(),
  description: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  opening_hours: z.record(z.string(), z.string()).optional(),
  visit_duration_min: z.number().nullable().optional(),
  cuisine: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

const _bp: BackendPlace = {} as z.infer<typeof backendPlaceSchema>;
void _bp;

// FastAPI `/api/places/nearby` envelope: { places: [...], total: N }
export const backendNearbyResponseSchema = z.union([
  z.object({
    places: z.array(backendPlaceSchema.passthrough()),
    total: z.number().optional(),
  }),
  z.array(backendPlaceSchema.passthrough()),
]);

// ─── SerpAPI Google Flights ─────────────────────────────────

export const serpFlightLegSchema = z.object({
  flightNumber: z.string(),
  airline: z.string(),
  airlineLogo: z.string(),
  airplane: z.string(),
  travelClass: z.string(),
  legroom: z.string(),
  duration: z.number(),
  overnight: z.boolean(),
  departure: z.object({ airport: z.string(), id: z.string(), time: z.string() }),
  arrival: z.object({ airport: z.string(), id: z.string(), time: z.string() }),
  extensions: z.array(z.string()),
});

export const serpFlightSchema = z.object({
  id: z.string(),
  tier: z.enum(['best', 'other']),
  price: z.number().nullable(),
  type: z.string(),
  totalDuration: z.number(),
  stops: z.number(),
  airlineLogo: z.string(),
  carbonEmissions: z.object({
    this_flight: z.number().optional(),
    typical_for_this_route: z.number().optional(),
    difference_percent: z.number().optional(),
  }).nullable(),
  legs: z.array(serpFlightLegSchema),
  layovers: z.array(z.object({ duration: z.number(), airport: z.string(), id: z.string() })),
});

export const serpFlightSearchResponseSchema = z.object({
  flights: z.array(serpFlightSchema),
  priceInsights: z.unknown().optional(),
  total: z.number(),
  flights_state: z.string().optional(),
  error: z.string().optional(),
});

// ─── SerpAPI Google Hotels ──────────────────────────────────

export const serpHotelNearbyPlaceSchema = z.object({
  name: z.string(),
  transportations: z.array(z.object({ type: z.string(), duration: z.string() })),
});

export const serpHotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  stars: z.number(),
  rating: z.number(),
  reviews: z.number(),
  price: z.number().nullable(),
  currency: z.string(),
  totalRate: z.number().nullable(),
  address: z.string(),
  neighborhood: z.string(),
  lat: z.number(),
  lng: z.number(),
  images: z.array(z.string()),
  amenities: z.array(z.string()),
  excludedAmenities: z.array(z.string()),
  checkIn: z.string(),
  checkOut: z.string(),
  description: z.string(),
  link: z.string(),
  source: z.string(),
  propertyType: z.string().nullable(),
  ecoCertified: z.boolean(),
  nearbyPlaces: z.array(serpHotelNearbyPlaceSchema),
  deal: z.string().nullable(),
  dealDescription: z.string().nullable(),
});

export const serpHotelSearchResponseSchema = z.object({
  total: z.number(),
  hotels: z.array(serpHotelSchema),
  error: z.string().optional(),
});

// ─── Nominatim geocoding ─────────────────────────────────────

export const nominatimResultSchema = z.object({
  place_id: z.union([z.string(), z.number()]).optional(),
  lat: z.string(),
  lon: z.string(),
  display_name: z.string().optional(),
  type: z.string().optional(),
  class: z.string().optional(),
  importance: z.number().optional(),
  boundingbox: z.array(z.string()).optional(),
}).passthrough();

export const nominatimResponseSchema = z.array(nominatimResultSchema);

// ─── Foursquare Places ───────────────────────────────────────

export const foursquareVenueSchema = z.object({
  fsq_id: z.string().optional(),
  name: z.string(),
  geocodes: z.object({
    main: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  }).optional(),
  location: z.object({
    address: z.string().optional(),
    locality: z.string().optional(),
    region: z.string().optional(),
    country: z.string().optional(),
    formatted_address: z.string().optional(),
  }).optional(),
  categories: z.array(z.object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string(),
    icon: z.object({
      prefix: z.string().optional(),
      suffix: z.string().optional(),
    }).optional(),
  })).optional(),
}).passthrough();
