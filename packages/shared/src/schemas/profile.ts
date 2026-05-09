import { z } from 'zod';
import type { Profile } from '../types';

export const profileSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  home_airport: z.string().nullable(),
  onboarding_completed: z.boolean(),
  preferences: z.record(z.string(), z.any()),
  created_at: z.string(),
  updated_at: z.string(),
});

const _check: Profile = {} as z.infer<typeof profileSchema>;
void _check;
