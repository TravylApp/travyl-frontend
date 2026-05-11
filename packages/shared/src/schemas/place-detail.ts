import { z } from 'zod';
import type { PlaceDetailResponse, MenuItem, MenuResponse, SuggestResponse, DestinationDetail } from '../types';
import { placeItemSchema } from './places';

export const placeDetailResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  rating: z.number().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  description: z.string().nullable(),
  images: z.array(z.string()),
  image_url: z.string().nullable(),
  categories: z.array(z.string()),
  hours: z.string().nullable(),
  price: z.number().nullable(),
  reviewCount: z.number().nullable(),
});

const _pdr: PlaceDetailResponse = {} as z.infer<typeof placeDetailResponseSchema>;
void _pdr;

export const menuItemSchema = z.object({
  name: z.string(),
  price: z.string().nullable(),
  description: z.string().nullable(),
});

const _mi: MenuItem = {} as z.infer<typeof menuItemSchema>;
void _mi;

export const menuResponseSchema = z.object({
  restaurant_name: z.string(),
  menu_url: z.string().nullable(),
  items: z.array(menuItemSchema),
  source: z.string(),
});

const _mr: MenuResponse = {} as z.infer<typeof menuResponseSchema>;
void _mr;

export const suggestResponseSchema = z.object({
  suggestions: z.array(placeItemSchema),
  hasMore: z.boolean(),
  nextPage: z.number().nullable(),
});

const _sr: SuggestResponse = {} as z.infer<typeof suggestResponseSchema>;
void _sr;

export const destinationDetailSchema = z.object({
  name: z.string(),
  country: z.string(),
  description: z.string(),
  language: z.string(),
  currency: z.string(),
  timezone: z.string(),
  bestTimeToVisit: z.string(),
  budgetLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  tags: z.array(z.string()),
  image: z.string(),
  images: z.array(z.string()).optional(),
  latitude: z.number(),
  longitude: z.number(),
  population: z.string().optional(),
});

const _dd: DestinationDetail = {} as z.infer<typeof destinationDetailSchema>;
void _dd;
