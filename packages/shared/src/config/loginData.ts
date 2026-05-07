export interface LoginDestination {
  id: number;
  name: string;
  country: string;
  /** Optional override for the destination-image API lookup. Falls back to `${name}, ${country}`. */
  imageQuery?: string;
  tagline: string;
  highlights: string[];
  bestTime: string;
  vibe: string;
}

export const LOGIN_DESTINATIONS: LoginDestination[] = [
  {
    id: 1,
    name: 'Paris',
    country: 'France',
    tagline: 'The city of light never stops inspiring.',
    highlights: ['Eiffel Tower at sunset', 'Le Marais district', 'Montmartre cafés'],
    bestTime: 'Apr – Jun',
    vibe: 'Romantic & Cultural',
  },
  {
    id: 2,
    name: 'Bali',
    country: 'Indonesia',
    tagline: 'Where spirituality meets paradise.',
    highlights: ['Ubud rice terraces', 'Uluwatu temple', 'Seminyak beaches'],
    bestTime: 'May – Sep',
    vibe: 'Tropical & Serene',
  },
  {
    id: 3,
    name: 'Tokyo',
    country: 'Japan',
    tagline: 'Ancient traditions meet neon-lit futures.',
    highlights: ['Shibuya crossing', 'Tsukiji outer market', 'Meiji Shrine gardens'],
    bestTime: 'Mar – May',
    vibe: 'Electric & Immersive',
  },
  {
    id: 4,
    name: 'Santorini',
    country: 'Greece',
    tagline: 'Sunsets that paint the Aegean gold.',
    highlights: ['Oia blue domes', 'Volcanic wine trails', 'Amoudi Bay swim'],
    bestTime: 'Jun – Sep',
    vibe: 'Scenic & Relaxing',
  },
  {
    id: 5,
    name: 'New York',
    country: 'USA',
    imageQuery: 'Manhattan',
    tagline: 'The city that never sleeps, always surprises.',
    highlights: ['Central Park strolls', 'Brooklyn Bridge walk', 'Broadway nights'],
    bestTime: 'Sep – Nov',
    vibe: 'Urban & Energetic',
  },
];
