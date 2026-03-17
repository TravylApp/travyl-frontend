// ─── How It Works ─────────────────────────────────────────────
export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Tell us your dream trip',
    description: 'Pick your destination, dates, group size, and interests. It takes less than 30 seconds to get started.',
    iconId: 'chat',
    features: ['Natural language input', 'Smart destination suggestions', 'Flexible date planning'],
  },
  {
    step: 2,
    title: 'We build your perfect trip',
    description: 'Our AI curates flights, hotels, day-by-day activities, and restaurants — all personalized to your preferences.',
    iconId: 'magic',
    features: ['Day-by-day itinerary', 'Curated hotels & flights', 'Restaurant reservations'],
  },
  {
    step: 3,
    title: "Everything's booked. You're set.",
    description: 'Flights, hotels, reservations — all confirmed. Just open the app and enjoy your trip, stress-free.',
    iconId: 'check',
    features: ['One-tap booking', 'Instant confirmations', 'Real-time trip updates'],
  },
] as const;

// ─── Phone Screen Data (How It Works mockups) ───────────────
export const STEP1_QUICK_CHIPS = [
  { iconId: 'mapPin', label: 'Paris' },
  { iconId: 'calendar', label: 'Weekend' },
  { iconId: 'users', label: 'Family' },
] as const;

export const STEP1_RECENT_SEARCHES = [
  { dest: 'Tokyo, Japan', days: '7 days', travelers: 'Solo' },
  { dest: 'Bali, Indonesia', days: '10 days', travelers: 'Couple' },
] as const;

export const STEP2_ITINERARY_ITEMS = [
  { time: '9:00 AM', title: 'Colosseum Tour', iconId: 'camera', color: '#003594', duration: '2h' },
  { time: '11:30 AM', title: 'Roman Forum Walk', iconId: 'mapPin', color: '#1A5CC8', duration: '1.5h' },
  { time: '1:00 PM', title: 'Lunch at Roscioli', iconId: 'utensils', color: '#D97706', duration: '1h' },
  { time: '2:30 PM', title: 'Vatican Museums', iconId: 'camera', color: '#003594', duration: '3h' },
  { time: '6:00 PM', title: 'Coffee at Sant\'Eustachio', iconId: 'coffee', color: '#6b7280', duration: '30m' },
] as const;

export const STEP3_TRIP_DETAILS = {
  destination: 'Rome, Italy',
  subtitle: '5-Day Adventure',
  dates: 'Mar 15 – Mar 20, 2026',
  travelers: '2 Adults',
  flight: 'AA 123 \u2022 Mar 15, 8:30 AM',
  bookingRef: 'TRV-2026-3451',
  totalPrice: '$2,847',
} as const;

// ─── Tile Category Colors ─────────────────────────────────────
export const TILE_CATEGORY_COLORS = {
  destination: { hex: '#059669', label: 'Destination' },
  attraction: { hex: '#2563EB', label: 'Attraction' },
  dining: { hex: '#D97706', label: 'Dining' },
  experience: { hex: '#9333EA', label: 'Experience' },
} as const;

export const TILE_CATEGORY_GRADIENTS = {
  destination: { from: '#1e3a5f', to: '#2d5a8a' },
  attraction: { from: '#162d4a', to: '#1e3a5f' },
  dining: { from: '#1e3a5f', to: '#3a6b9f' },
  experience: { from: '#0f2440', to: '#1e3a5f' },
} as const;

// ─── Tag Us / Social ─────────────────────────────────────────
export const SOCIAL_HASHTAGS = [
  '#Travyl',
  '#TravylAI',
  '#Travyling',
  '#Travyler',
  '#Travyltogether',
  '#TravylMoments',
  '#Travylourway',
] as const;

export const SOCIAL_LINKS = [
  { platform: 'instagram' as const, url: 'https://instagram.com/travyl' },
] as const;

// ─── Footer ──────────────────────────────────────────────────
// ─── Category Gradient Cycle ─────────────────────────────────
export const CATEGORY_GRADIENT_CYCLE = [
  TILE_CATEGORY_GRADIENTS.destination,
  TILE_CATEGORY_GRADIENTS.attraction,
  TILE_CATEGORY_GRADIENTS.experience,
  TILE_CATEGORY_GRADIENTS.dining,
] as const;

export function getCyclicGradient(index: number) {
  return CATEGORY_GRADIENT_CYCLE[index % CATEGORY_GRADIENT_CYCLE.length];
}

// ─── Footer ──────────────────────────────────────────────────
export const FOOTER_COLUMNS = [
  {
    heading: 'Products',
    links: [
      { label: 'Download App', href: '/download' },
      { label: 'Help Center', href: '/help' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
] as const;

// ─── Takeoff Transition ──────────────────────────────────────────
export const TAKEOFF_LOADING_MESSAGES = [
  'Folding your itinerary...',
  'Mapping the best routes...',
  'Finding hidden gems...',
  'Packing your adventure...',
] as const;
