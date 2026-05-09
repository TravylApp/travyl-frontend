import { z } from 'zod';
import type { DiscoverItem, FavoriteItem, ServerFavorite, PostcardData } from '../types';

export const discoverItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  rating: z.number(),
  reviewCount: z.number().optional(),
  reviews: z.number().optional(),
  tags: z.array(z.string()),
  price: z.string().optional(),
  category: z.string().optional(),
  cuisine: z.string().optional(),
  isBooked: z.boolean().optional(),
  bookedDay: z.number().optional(),
  bookedTime: z.string().optional(),
  mealType: z.string().optional(),
  distance: z.string().optional(),
  hours: z.string().optional(),
  isOpen: z.boolean().optional(),
  bookingUrl: z.string().optional(),
  bookingLabel: z.string().optional(),
  dealPrice: z.string().optional(),
  originalPrice: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  included: z.array(z.string()).optional(),
  notIncluded: z.array(z.string()).optional(),
  meetingPoint: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  minParticipants: z.number().optional(),
  maxParticipants: z.number().optional(),
  languages: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  accessibility: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  popularityScore: z.number().optional(),
  duration: z.string().optional(),
  phoneSteps: z.array(z.object({
    title: z.string(),
    description: z.string(),
    screenshot: z.string(),
  })).optional(),
});

const _di: DiscoverItem = {} as z.infer<typeof discoverItemSchema>;
void _di;

export const favoriteItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  category: z.string(),
  type: z.enum(['place', 'event']),
  rating: z.number(),
  description: z.string(),
  tags: z.array(z.string()),
  board: z.string(),
  image: z.string(),
  date: z.string().optional(),
});

const _fi: FavoriteItem = {} as z.infer<typeof favoriteItemSchema>;
void _fi;

export const serverFavoriteSchema = z.object({
  id: z.string(),
  place_id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
});

const _sf: ServerFavorite = {} as z.infer<typeof serverFavoriteSchema>;
void _sf;

export const postcardDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  imageUrl: z.string(),
  category: z.string(),
  type: z.enum(['place', 'event']),
  rating: z.number().optional(),
  date: z.string().optional(),
  note: z.string().optional(),
  board: z.string().optional(),
  color: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const _pd: PostcardData = {} as z.infer<typeof postcardDataSchema>;
void _pd;

// Inbound — POST favorite
export const createFavoriteBodySchema = z.object({
  place_id: z.string(),
  trip_id: z.string().optional(),
});
export type CreateFavoriteBody = z.infer<typeof createFavoriteBodySchema>;
