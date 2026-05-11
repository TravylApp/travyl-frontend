import { z } from 'zod';
import type { Trip, TripContextData, RouteLocation, TripRoute, SavedItem, TravelerMetadata } from '../types';

export const visibilitySchema = z.enum(['private', 'link', 'public']);
export const linkPermissionSchema = z.enum(['viewer', 'editor']);
export const collaboratorRoleSchema = linkPermissionSchema;
export const tripStatusSchema = z.enum(['planning', 'booked', 'active', 'completed', 'abandoned']);

export const travelerMetadataSchema = z.object({
  adults: z.number(),
  children: z.number(),
  infants: z.number(),
  child_ages: z.array(z.number()),
});

const _travelers: TravelerMetadata = {} as z.infer<typeof travelerMetadataSchema>;
void _travelers;

export const routeLocationSchema = z.object({
  name: z.string(),
  city: z.string().optional(),
  iata: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  country: z.string().optional(),
  continent: z.string().optional(),
});

const _route: RouteLocation = {} as z.infer<typeof routeLocationSchema>;
void _route;

export const tripRouteSchema = z.object({
  origin: routeLocationSchema,
  destinations: z.array(routeLocationSchema),
  stops: z.array(routeLocationSchema).optional(),
});

const _tripRoute: TripRoute = {} as z.infer<typeof tripRouteSchema>;
void _tripRoute;

export const savedItemSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  trip_id: z.string(),
  item_type: z.enum(['activity', 'flight', 'hotel']),
  item_id: z.string(),
  created_at: z.string(),
});

const _saved: SavedItem = {} as z.infer<typeof savedItemSchema>;
void _saved;

// trip_context is a JSONB blob with many third-party shapes (SerpAPI hotels,
// flights, news, etc.) that intentionally use `any` in the TS interface.
// We use a permissive schema with `passthrough` so unknown fields aren't
// stripped — validation here only protects the keys we actually rely on.
export const tripContextDataSchema = z.object({
  hero_image_url: z.string().optional(),
  hero_images: z.array(z.string()).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  lede_text: z.string().optional(),
  travelers: travelerMetadataSchema.optional(),
  quick_facts: z.object({
    currency: z.string().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
    power: z.string().optional(),
    transport: z.string().optional(),
    taxi: z.string().optional(),
    tipping: z.string().optional(),
    water: z.string().optional(),
    emergency: z.string().optional(),
  }).optional(),
  weather: z.object({
    current: z.object({
      high: z.number(),
      low: z.number(),
      condition: z.string(),
      temp: z.number().optional(),
      feelslike: z.number().optional(),
      conditions: z.string().optional(),
    }).optional(),
    forecast: z.array(z.object({
      day: z.string(),
      date: z.string().optional(),
      high: z.number(),
      low: z.number(),
      icon: z.string(),
      condition: z.string(),
    })).optional(),
  }).optional(),
  explore_items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    category: z.string(),
    description: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })).optional(),
  news: z.array(z.object({
    id: z.string(),
    title: z.string(),
    snippet: z.string(),
    category: z.enum(['event', 'advisory', 'news', 'tip']),
    source: z.string(),
    date: z.string(),
    url: z.string().optional(),
    image: z.string().optional(),
  })).optional(),
  hotels: z.array(z.any()).optional(),
  foursquare_venues: z.array(z.any()).optional(),
  events: z.array(z.any()).optional(),
  cuisine: z.array(z.any()).optional(),
  phrases: z.array(z.any()).optional(),
  cost_of_living: z.any().optional(),
  nearby_cities: z.array(z.any()).optional(),
  safety: z.any().optional(),
  timezone_info: z.any().optional(),
  sunrise: z.any().optional(),
  aqi: z.any().optional(),
  wiki: z.union([z.string(), z.object({ extract: z.string().optional() })]).optional(),
  country: z.any().optional(),
  holidays: z.array(z.any()).optional(),
  restaurants: z.array(z.any()).optional(),
  flights: z.array(z.any()).optional(),
  itinerary: z.array(z.any()).optional(),
  all_hotels: z.array(z.any()).optional(),
}).passthrough();

const _ctx: TripContextData = {} as z.infer<typeof tripContextDataSchema>;
void _ctx;

export const tripSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  destination: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  budget: z.number().nullable(),
  currency: z.string(),
  travelers: z.number(),
  status: tripStatusSchema,
  trip_context: tripContextDataSchema,
  is_generated: z.boolean(),
  visibility: visibilitySchema,
  link_permission: linkPermissionSchema,
  share_link_token: z.string().nullable(),
  forked_from_trip_id: z.string().nullable(),
  fork_count: z.number(),
  theme: z.string(),
  custom_theme_color: z.string().nullable(),
  tab_color_overrides: z.record(z.string(), z.string()).optional(),
  itinerary_color_overrides: z.record(z.string(), z.string()).optional(),
  hidden_tabs: z.record(z.string(), z.boolean()).optional(),
  cover_image_url: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

const _trip: Trip = {} as z.infer<typeof tripSchema>;
void _trip;

// Inbound — POST /api/trips body. Permissive to accommodate AI-planner
// pipelines that pass trip_context + itinerary alongside the trip metadata.
// Server still derives user_id from the verified session.
export const createTripBodySchema = z.object({
  title: z.union([z.string().max(200), z.null()]).optional(),
  destination: z.string().min(1).max(200),
  start_date: z.union([z.string(), z.null()]).optional(),
  end_date: z.union([z.string(), z.null()]).optional(),
  status: tripStatusSchema.optional(),
  budget: z.union([z.number(), z.string(), z.null()]).optional(),
  currency: z.string().optional(),
  travelers: z.union([z.number(), z.string()]).optional(),
  visibility: visibilitySchema.optional(),
  trip_context: tripContextDataSchema.optional(),
  itinerary: z.array(z.any()).optional(),
});
export type CreateTripBody = z.infer<typeof createTripBodySchema>;

// Inbound — PATCH /api/trips/:id body (all optional)
export const updateTripBodySchema = createTripBodySchema.partial().extend({
  status: tripStatusSchema.optional(),
  trip_context: tripContextDataSchema.optional(),
  theme: z.string().optional(),
  custom_theme_color: z.string().nullable().optional(),
});
export type UpdateTripBody = z.infer<typeof updateTripBodySchema>;
