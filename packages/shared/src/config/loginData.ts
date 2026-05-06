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
    image: 'https://images.pexels.com/photos/33800139/pexels-photo-33800139.jpeg?auto=compress&cs=tinysrgb&w=1200',
    name: 'Paris',
    country: 'France',
    tagline: 'The city of light never stops inspiring.',
    highlights: ['Eiffel Tower at sunset', 'Le Marais district', 'Montmartre cafés'],
    bestTime: 'Apr – Jun',
    vibe: 'Romantic & Cultural',
  },
  {
    id: 2,
    image: 'https://images.pexels.com/photos/24995221/pexels-photo-24995221.jpeg?auto=compress&cs=tinysrgb&w=1200',
    name: 'Bali',
    country: 'Indonesia',
    tagline: 'Where spirituality meets paradise.',
    highlights: ['Ubud rice terraces', 'Uluwatu temple', 'Seminyak beaches'],
    bestTime: 'May – Sep',
    vibe: 'Tropical & Serene',
  },
  {
    id: 3,
    image: 'https://images.pexels.com/photos/31409369/pexels-photo-31409369.jpeg?auto=compress&cs=tinysrgb&w=1200',
    name: 'Tokyo',
    country: 'Japan',
    tagline: 'Ancient traditions meet neon-lit futures.',
    highlights: ['Shibuya crossing', 'Tsukiji outer market', 'Meiji Shrine gardens'],
    bestTime: 'Mar – May',
    vibe: 'Electric & Immersive',
  },
  {
    id: 4,
    image: 'https://images.pexels.com/photos/29081769/pexels-photo-29081769.jpeg?auto=compress&cs=tinysrgb&w=1200',
    name: 'Santorini',
    country: 'Greece',
    tagline: 'Sunsets that paint the Aegean gold.',
    highlights: ['Oia blue domes', 'Volcanic wine trails', 'Amoudi Bay swim'],
    bestTime: 'Jun – Sep',
    vibe: 'Scenic & Relaxing',
  },
  {
    id: 5,
    image: 'https://images.pexels.com/photos/30843624/pexels-photo-30843624.jpeg?auto=compress&cs=tinysrgb&w=1200',
    name: 'New York',
    country: 'United States',
    tagline: 'The city that never sleeps, always surprises.',
    highlights: ['Central Park strolls', 'Brooklyn Bridge walk', 'Broadway nights'],
    bestTime: 'Sep – Nov',
    vibe: 'Urban & Energetic',
  },
];
