import { z } from 'zod';
import type { TravylEvent } from '../types';

export const travylEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  time: z.string().nullable(),
  venue: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  description: z.string().nullable(),
  price: z.string().nullable(),
  category: z.string().nullable(),
  photo_url: z.string().nullable(),
  link: z.string().nullable(),
});

const _te: TravylEvent = {} as z.infer<typeof travylEventSchema>;
void _te;

export const travylEventsResponseSchema = z.array(travylEventSchema);

export const eventsQuerySchema = z.object({
  destination: z.string().min(1).max(200).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type EventsQuery = z.infer<typeof eventsQuerySchema>;
