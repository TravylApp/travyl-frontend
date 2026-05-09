import { z } from 'zod';
import type { HeroSuggestion, HeroConfig, InspirationCard } from '../types';

export const heroSuggestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  short_label: z.string().nullable(),
});

const _hs: HeroSuggestion = {} as z.infer<typeof heroSuggestionSchema>;
void _hs;

export const heroConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  search_placeholder: z.string(),
  background_image_url: z.string().nullable(),
  suggestions: z.array(heroSuggestionSchema),
});

const _hc: HeroConfig = {} as z.infer<typeof heroConfigSchema>;
void _hc;

export const inspirationCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  destination: z.string(),
  image_url: z.string().nullable(),
});

const _ic: InspirationCard = {} as z.infer<typeof inspirationCardSchema>;
void _ic;
