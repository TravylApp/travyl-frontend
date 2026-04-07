import type { } from '../types';

export interface LoginDestination {
  id: number;
  image: string;
  name: string;
  country: string;
  tagline: string;
  highlights: string[];
  bestTime: string;
  vibe: string;
}

export const LOGIN_DESTINATIONS: LoginDestination[] = [];
