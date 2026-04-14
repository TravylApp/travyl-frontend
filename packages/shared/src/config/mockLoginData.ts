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

export const LOGIN_DESTINATIONS: LoginDestination[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80',
    name: 'Paris',
    country: 'France',
    tagline: 'The city of light never stops inspiring.',
    highlights: ['Eiffel Tower at sunset', 'Le Marais district', 'Montmartre cafés'],
    bestTime: 'Apr – Jun',
    vibe: 'Romantic & Cultural',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80',
    name: 'Bali',
    country: 'Indonesia',
    tagline: 'Where spirituality meets paradise.',
    highlights: ['Ubud rice terraces', 'Uluwatu temple', 'Seminyak beaches'],
    bestTime: 'May – Sep',
    vibe: 'Tropical & Serene',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=1200&q=80',
    name: 'Tokyo',
    country: 'Japan',
    tagline: 'Ancient traditions meet neon-lit futures.',
    highlights: ['Shibuya crossing', 'Tsukiji outer market', 'Meiji Shrine gardens'],
    bestTime: 'Mar – May',
    vibe: 'Electric & Immersive',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80',
    name: 'Santorini',
    country: 'Greece',
    tagline: 'Sunsets that paint the Aegean gold.',
    highlights: ['Oia blue domes', 'Volcanic wine trails', 'Amoudi Bay swim'],
    bestTime: 'Jun – Sep',
    vibe: 'Scenic & Relaxing',
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=1200&q=80',
    name: 'New York',
    country: 'United States',
    tagline: 'The city that never sleeps, always surprises.',
    highlights: ['Central Park strolls', 'Brooklyn Bridge walk', 'Broadway nights'],
    bestTime: 'Sep – Nov',
    vibe: 'Urban & Energetic',
  },
];
