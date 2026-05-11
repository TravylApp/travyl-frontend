import { z } from 'zod';
import type { Activity, ItineraryDay } from '../types';

export const activitySourceSchema = z.enum(['agent', 'user', 'search']);

export const itineraryDaySchema = z.object({
  id: z.string(),
  trip_id: z.string(),
  day_number: z.number(),
  date: z.string(),
  theme: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
});

const _id: ItineraryDay = {} as z.infer<typeof itineraryDaySchema>;
void _id;

export const activitySchema = z.object({
  id: z.string(),
  itinerary_day_id: z.string(),
  trip_id: z.string(),
  name: z.string(),
  category: z.string(),
  location_name: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  estimated_cost: z.number().nullable(),
  currency: z.string(),
  sort_order: z.number().nullable(),
  booking_url: z.string().nullable(),
  notes: z.string().nullable(),
  source: activitySourceSchema,
  created_at: z.string(),
});

const _a: Activity = {} as z.infer<typeof activitySchema>;
void _a;

export const itineraryDayWithActivitiesSchema = itineraryDaySchema.extend({
  activities: z.array(activitySchema),
});

// Inbound — POST /api/activities body
export const createActivityBodySchema = z.object({
  trip_id: z.string(),
  itinerary_day_id: z.string(),
  name: z.string().min(1).max(200),
  category: z.string(),
  location_name: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  estimated_cost: z.number().nullable().optional(),
  currency: z.string().default('USD'),
  notes: z.string().nullable().optional(),
});
export type CreateActivityBody = z.infer<typeof createActivityBodySchema>;
