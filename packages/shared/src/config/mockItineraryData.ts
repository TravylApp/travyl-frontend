import type { ItineraryDayViewModel, TimeGroup, ActivityViewModel, FlightViewModel, HotelViewModel } from '../viewmodels/itineraryViewModel';
import type { BudgetSummary } from '../viewmodels/budgetViewModel';
import type { Trip, BudgetItem, PackingList, WeatherInfo, DiscoverItem, CalendarActivity, WeatherForecast, CollaboratorPresence } from '../types';

// ─── Mock Activities ────────────────────────────────────────

const MOCK_ACTIVITIES: ActivityViewModel[] = [
  {
    id: 'mock-a1',
    name: 'Visit the Eiffel Tower',
    category: 'sightseeing',
    locationName: 'Champ de Mars, Paris',
    startTime: '9:00 AM',
    endTime: '11:00 AM',
    timeDisplay: '9:00 AM – 11:00 AM',
    costDisplay: '$25',
    bookingUrl: null,
    notes: null,
    source: 'agent',
    timeOfDay: 'morning',
  },
  {
    id: 'mock-a2',
    name: 'Seine River Cruise',
    category: 'tour',
    locationName: 'Port de la Bourdonnais',
    startTime: '10:30 AM',
    endTime: null,
    timeDisplay: '10:30 AM',
    costDisplay: '$18',
    bookingUrl: null,
    notes: null,
    source: 'agent',
    timeOfDay: 'morning',
  },
  {
    id: 'mock-a3',
    name: 'Lunch at Le Comptoir',
    category: 'dining',
    locationName: 'Saint-Germain-des-Prés',
    startTime: '12:30 PM',
    endTime: '2:00 PM',
    timeDisplay: '12:30 PM – 2:00 PM',
    costDisplay: '$45',
    bookingUrl: null,
    notes: null,
    source: 'agent',
    timeOfDay: 'afternoon',
  },
  {
    id: 'mock-a4',
    name: 'Louvre Museum',
    category: 'cultural',
    locationName: 'Rue de Rivoli, Paris',
    startTime: '2:30 PM',
    endTime: '5:00 PM',
    timeDisplay: '2:30 PM – 5:00 PM',
    costDisplay: '$17',
    bookingUrl: null,
    notes: null,
    source: 'agent',
    timeOfDay: 'afternoon',
  },
  {
    id: 'mock-a5',
    name: 'Dinner at Le Jules Verne',
    category: 'dining',
    locationName: 'Eiffel Tower, 2nd Floor',
    startTime: '7:30 PM',
    endTime: '9:30 PM',
    timeDisplay: '7:30 PM – 9:30 PM',
    costDisplay: '$120',
    bookingUrl: null,
    notes: null,
    source: 'agent',
    timeOfDay: 'evening',
  },
  {
    id: 'mock-a6',
    name: 'Montmartre Night Walk',
    category: 'nightlife',
    locationName: 'Sacré-Cœur, Montmartre',
    startTime: '9:30 PM',
    endTime: null,
    timeDisplay: '9:30 PM',
    costDisplay: null,
    bookingUrl: null,
    notes: null,
    source: 'agent',
    timeOfDay: 'evening',
  },
  {
    id: 'mock-a6b',
    name: 'Jazz at Le Caveau de la Huchette',
    category: 'nightlife',
    locationName: '5 Rue de la Huchette',
    startTime: '10:30 PM',
    endTime: null,
    timeDisplay: '10:30 PM',
    costDisplay: '$15',
    bookingUrl: null,
    notes: 'Historic jazz club in the Latin Quarter',
    source: 'agent',
    timeOfDay: 'latenight',
  },
  {
    id: 'mock-a6c',
    name: 'Seine River Night Cruise',
    category: 'nightlife',
    locationName: 'Port de la Bourdonnais',
    startTime: '11:00 PM',
    endTime: null,
    timeDisplay: '11:00 PM',
    costDisplay: '$18',
    bookingUrl: null,
    notes: 'See Paris illuminated from the water',
    source: 'agent',
    timeOfDay: 'latenight',
  },
];

// Day 2 activities
const MOCK_ACTIVITIES_DAY2: ActivityViewModel[] = [
  {
    id: 'mock-a7',
    name: 'Versailles Palace',
    category: 'sightseeing',
    locationName: 'Place d\'Armes, Versailles',
    startTime: '9:00 AM',
    endTime: '1:00 PM',
    timeDisplay: '9:00 AM – 1:00 PM',
    costDisplay: '$22',
    bookingUrl: null,
    notes: null,
    source: 'agent',
    timeOfDay: 'morning',
  },
  {
    id: 'mock-a8',
    name: 'Gardens of Versailles',
    category: 'outdoor',
    locationName: 'Versailles Gardens',
    startTime: '1:30 PM',
    endTime: '3:00 PM',
    timeDisplay: '1:30 PM – 3:00 PM',
    costDisplay: null,
    bookingUrl: null,
    notes: null,
    source: 'agent',
    timeOfDay: 'afternoon',
  },
  {
    id: 'mock-a9',
    name: 'Shopping at Champs-Élysées',
    category: 'shopping',
    locationName: 'Avenue des Champs-Élysées',
    startTime: '4:00 PM',
    endTime: '6:00 PM',
    timeDisplay: '4:00 PM – 6:00 PM',
    costDisplay: '$200',
    bookingUrl: null,
    notes: null,
    source: 'agent',
    timeOfDay: 'afternoon',
  },
];

// ─── Mock Time Groups ───────────────────────────────────────

function groupByTimeOfDay(activities: ActivityViewModel[]): TimeGroup[] {
  const groups: Record<string, ActivityViewModel[]> = {};
  for (const a of activities) {
    if (!groups[a.timeOfDay]) groups[a.timeOfDay] = [];
    groups[a.timeOfDay].push(a);
  }
  const order = ['morning', 'afternoon', 'evening', 'latenight'] as const;
  return order
    .filter((tod) => groups[tod]?.length)
    .map((tod) => ({ timeOfDay: tod, activities: groups[tod] }));
}

// ─── Mock Days ──────────────────────────────────────────────

export const MOCK_DAYS: ItineraryDayViewModel[] = [
  {
    id: 'mock-day-1',
    dayNumber: 1,
    dayLabel: 'Day 1',
    dateLabel: 'Mon, Mar 10',
    theme: 'Iconic Paris',
    notes: null,
    timeGroups: groupByTimeOfDay(MOCK_ACTIVITIES),
    activityCount: MOCK_ACTIVITIES.length,
  },
  {
    id: 'mock-day-2',
    dayNumber: 2,
    dayLabel: 'Day 2',
    dateLabel: 'Tue, Mar 11',
    theme: 'Versailles & Shopping',
    notes: null,
    timeGroups: groupByTimeOfDay(MOCK_ACTIVITIES_DAY2),
    activityCount: MOCK_ACTIVITIES_DAY2.length,
  },
  {
    id: 'mock-day-3',
    dayNumber: 3,
    dayLabel: 'Day 3',
    dateLabel: 'Wed, Mar 12',
    theme: 'Art & Culture',
    notes: null,
    timeGroups: [],
    activityCount: 0,
  },
  {
    id: 'mock-day-4',
    dayNumber: 4,
    dayLabel: 'Day 4',
    dateLabel: 'Thu, Mar 13',
    theme: 'Hidden Gems',
    notes: null,
    timeGroups: [],
    activityCount: 0,
  },
  {
    id: 'mock-day-5',
    dayNumber: 5,
    dayLabel: 'Day 5',
    dateLabel: 'Fri, Mar 14',
    theme: 'Departure',
    notes: null,
    timeGroups: [],
    activityCount: 0,
  },
];

// ─── Mock Flights ───────────────────────────────────────────

export const MOCK_FLIGHTS: FlightViewModel[] = [
  {
    id: 'mock-flight-1',
    airline: 'Air France',
    flightNumber: 'AF 007',
    route: 'JFK → CDG',
    originIata: 'JFK',
    destIata: 'CDG',
    originName: 'John F. Kennedy Intl',
    destName: 'Charles de Gaulle',
    departureDisplay: 'Mon, Mar 10, 8:30 PM',
    arrivalDisplay: 'Tue, Mar 11, 9:45 AM',
    priceDisplay: '$485',
    cabinClass: 'Economy',
    bookingRef: 'AF-MOCK-123',
  },
  {
    id: 'mock-flight-2',
    airline: 'Air France',
    flightNumber: 'AF 008',
    route: 'CDG → JFK',
    originIata: 'CDG',
    destIata: 'JFK',
    originName: 'Charles de Gaulle',
    destName: 'John F. Kennedy Intl',
    departureDisplay: 'Sun, Mar 16, 11:00 AM',
    arrivalDisplay: 'Sun, Mar 16, 2:15 PM',
    priceDisplay: '$520',
    cabinClass: 'Economy',
    bookingRef: 'AF-MOCK-456',
  },
];

// ─── Mock Hotels ────────────────────────────────────────────

export const MOCK_HOTELS: HotelViewModel[] = [
  {
    id: 'mock-hotel-1',
    name: 'Hôtel Le Marais',
    address: '12 Rue de Rivoli, 75004 Paris',
    checkIn: '2026-03-10',
    checkOut: '2026-03-16',
    checkInDisplay: 'Mar 10',
    checkOutDisplay: 'Mar 16',
    nights: 6,
    nightsLabel: '6 nights',
    priceDisplay: '$1,080',
    rating: 4.6,
    starRating: 4,
    imageUrl: null,
    bookingRef: 'HLM-MOCK-789',
  },
];

// ─── Mock Trip ──────────────────────────────────────────────

export const MOCK_TRIP: Trip = {
  id: 'mock-trip-1',
  user_id: 'mock-user',
  title: 'Paris Adventure',
  destination: 'Paris, France',
  start_date: '2026-03-10',
  end_date: '2026-03-16',
  budget: 3000,
  currency: 'USD',
  travelers: 2,
  status: 'planning',
  trip_context: {},
  is_generated: true,
  is_shared: false,
  share_link_token: null,
  share_link_role: 'viewer',
  forked_from_trip_id: null,
  fork_count: 0,
  is_public: false,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

// ─── Mock Destination Coordinates ────────────────────────────

export const MOCK_DESTINATION_COORDS = { lat: 48.8566, lng: 2.3522 }; // Paris, France

// ─── Mock Budget ────────────────────────────────────────────

export const MOCK_BUDGET: BudgetSummary = {
  total: 2085,
  totalFormatted: '$2,085',
  categories: [
    { label: 'Flights', amount: 1005, formatted: '$1,005' },
    { label: 'Hotels', amount: 1080, formatted: '$1,080' },
    { label: 'Activities', amount: 225, formatted: '$225' },
  ],
  currency: 'USD',
};

// ─── Mock Budget Items (Interactive) ────────────────────────

export const MOCK_BUDGET_ITEMS: BudgetItem[] = [
  {
    id: 'flights',
    category: 'Flights',
    budgeted: 1005,
    actual: 1005,
    fixed: true,
    expenses: [
      { id: 'flight-1', description: 'Outbound Flight AF 007 – Economy', amount: 485 },
      { id: 'flight-2', description: 'Return Flight AF 008 – Economy', amount: 520 },
    ],
  },
  {
    id: 'hotels',
    category: 'Hotels',
    budgeted: 1080,
    actual: 1080,
    fixed: true,
    expenses: [
      { id: 'hotel-1', description: 'Hôtel Le Marais (6 nights) – includes taxes', amount: 1080 },
    ],
  },
  {
    id: 'food',
    category: 'Food & Dining',
    budgeted: 600,
    actual: 425,
    fixed: false,
    expenses: [
      { id: 'food-1', description: 'Lunch at Le Comptoir', amount: 45 },
      { id: 'food-2', description: 'Dinner at Le Jules Verne', amount: 120 },
      { id: 'food-3', description: 'Café & pastries', amount: 35 },
      { id: 'food-4', description: 'Seine dinner cruise', amount: 85 },
      { id: 'food-5', description: 'Street food & snacks', amount: 40 },
      { id: 'food-6', description: 'Wine & cheese tasting', amount: 100 },
    ],
  },
  {
    id: 'activities',
    category: 'Activities & Tours',
    budgeted: 400,
    actual: 282,
    fixed: false,
    expenses: [
      { id: 'act-1', description: 'Eiffel Tower tickets', amount: 50 },
      { id: 'act-2', description: 'Seine River Cruise', amount: 36 },
      { id: 'act-3', description: 'Louvre Museum entry', amount: 34 },
      { id: 'act-4', description: 'Versailles Palace tickets', amount: 44 },
      { id: 'act-5', description: 'Montmartre walking tour', amount: 30 },
      { id: 'act-6', description: 'Musée d\'Orsay', amount: 18 },
      { id: 'act-7', description: 'Catacombs entry', amount: 30 },
      { id: 'act-8', description: 'Arc de Triomphe', amount: 16 },
      { id: 'act-9', description: 'Sainte-Chapelle', amount: 24 },
    ],
  },
  {
    id: 'transportation',
    category: 'Transportation',
    budgeted: 150,
    actual: 85,
    fixed: false,
    expenses: [
      { id: 'trans-1', description: 'Airport transfer (arrival)', amount: 35 },
      { id: 'trans-2', description: 'Metro passes (6 days)', amount: 35 },
      { id: 'trans-3', description: 'Taxi to Versailles', amount: 15 },
    ],
  },
  {
    id: 'shopping',
    category: 'Shopping',
    budgeted: 300,
    actual: 150,
    fixed: false,
    expenses: [
      { id: 'shop-1', description: 'Champs-Élysées shopping', amount: 75 },
      { id: 'shop-2', description: 'Market souvenirs', amount: 45 },
      { id: 'shop-3', description: 'Perfume at Galeries Lafayette', amount: 30 },
    ],
  },
];

// ─── Mock Packing List ──────────────────────────────────────

export const MOCK_PACKING_LIST: PackingList = {
  'Clothing': [
    { item: 'Shirts (7)', packed: false },
    { item: 'Pants/Shorts (4)', packed: false },
    { item: 'Underwear (7)', packed: false },
    { item: 'Socks (7 pairs)', packed: false },
    { item: 'Jacket/Sweater', packed: false },
    { item: 'Comfortable shoes', packed: false },
    { item: 'Sandals', packed: false },
    { item: 'Sleepwear', packed: false },
  ],
  'Toiletries': [
    { item: 'Toothbrush & toothpaste', packed: false },
    { item: 'Shampoo & conditioner', packed: false },
    { item: 'Body wash/soap', packed: false },
    { item: 'Deodorant', packed: false },
    { item: 'Sunscreen SPF 30+', packed: false },
    { item: 'Medications', packed: false },
    { item: 'First aid kit', packed: false },
  ],
  'Electronics': [
    { item: 'Phone & charger', packed: false },
    { item: 'Camera & charger', packed: false },
    { item: 'Power adapter (EU plug)', packed: false },
    { item: 'Headphones', packed: false },
    { item: 'Portable battery', packed: false },
  ],
  'Documents': [
    { item: 'Passport', packed: false },
    { item: 'Flight tickets', packed: false },
    { item: 'Hotel confirmations', packed: false },
    { item: 'Travel insurance', packed: false },
    { item: 'Credit cards & cash', packed: false },
    { item: 'Driver\'s license', packed: false },
  ],
  'Miscellaneous': [
    { item: 'Reusable water bottle', packed: false },
    { item: 'Umbrella', packed: false },
    { item: 'Sunglasses', packed: false },
    { item: 'Day backpack', packed: false },
    { item: 'Travel pillow', packed: false },
    { item: 'Book/Entertainment', packed: false },
  ],
};

export const MOCK_WEATHER: WeatherInfo = {
  destination: 'Paris',
  high: 12,
  low: 4,
  unit: '°C',
  conditions: 'Partly cloudy with occasional showers. Pack layers.',
};

// ─── Mock Discover Activities ───────────────────────────────

export const MOCK_DISCOVER_ACTIVITIES: DiscoverItem[] = [
  {
    id: 'da1',
    name: 'Skip-the-Line Eiffel Tower Summit',
    location: 'Champ de Mars, Paris',
    description: 'Skip the queues and head straight to the summit for breathtaking panoramic views of Paris. Expert guide shares fascinating history.',
    images: [
      'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=800',
      'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=800',
      'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=800',
    ],
    rating: 4.9,
    reviewCount: 12430,
    reviews: 12430,
    tags: ['Skip-the-Line', 'Summit Access', 'Guided Tour'],
    price: '€65',
    category: 'Tours',
    distance: '0.3 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Book Now',
    dealPrice: '€49',
    originalPrice: '€65',
    lat: 48.8584,
    lng: 2.2945,
    duration: '2 hours',
    highlights: ['Skip-the-line access', 'Summit level views', 'Expert English-speaking guide', 'Small group (max 15)', 'Champagne toast at top'],
    included: ['Skip-the-line ticket', 'Expert guide', 'Champagne at summit', 'Headset for commentary'],
    notIncluded: ['Food and drinks', 'Hotel pickup', 'Gratuities'],
    meetingPoint: 'South pillar of the Eiffel Tower, next to the ticket office',
    cancellationPolicy: 'Free cancellation up to 24 hours before the activity',
    minParticipants: 2,
    maxParticipants: 15,
    languages: ['English', 'French', 'Spanish'],
    difficulty: 'Easy',
    accessibility: 'Elevator access available',
    phoneSteps: [
      { title: 'Show your e-ticket', description: 'Present the QR code on your phone at the South Pillar entrance', screenshot: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400' },
      { title: 'Meet your guide', description: 'Look for the guide holding a yellow umbrella near the ticket booth', screenshot: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=400' },
      { title: 'Enjoy the summit', description: 'Take the elevator to the top and enjoy panoramic views with champagne', screenshot: 'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=400' },
    ],
  },
  {
    id: 'da2',
    name: 'Louvre Museum Masterpieces Tour',
    location: 'Rue de Rivoli, Paris',
    description: 'See the Mona Lisa, Venus de Milo, and Winged Victory with an art historian guide. 2.5 hours covering the must-see masterpieces.',
    images: [
      'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800',
      'https://images.unsplash.com/photo-1491245338813-c6832976196e?w=800',
    ],
    rating: 4.8,
    reviewCount: 8721,
    reviews: 8721,
    tags: ['Museum', 'Art', 'Guided'],
    price: '€55',
    category: 'Museums',
    distance: '1.2 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Book Now',
    lat: 48.8606,
    lng: 2.3376,
    duration: '2.5 hours',
    highlights: ['See the Mona Lisa up close', 'Expert art historian guide', 'Skip-the-line entry', 'Venus de Milo & Winged Victory'],
    languages: ['English', 'French'],
    difficulty: 'Easy',
    cancellationPolicy: 'Free cancellation up to 48 hours before',
  },
  {
    id: 'da3',
    name: 'Montmartre Walking Tour',
    location: 'Sacré-Cœur, Montmartre',
    description: 'Wander through the artistic heart of Paris. Discover hidden alleys, street art, and the stories of Picasso and Van Gogh.',
    images: ['https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=800', 'https://images.unsplash.com/photo-1551634979-2b11f8c946fe?w=800'],
    rating: 4.7,
    reviewCount: 3452,
    reviews: 3452,
    tags: ['Walking Tour', 'Art', 'Neighborhood'],
    price: '€25',
    category: 'Tours',
    distance: '2.8 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Get Deal',
    dealPrice: '€15',
    originalPrice: '€25',
    lat: 48.8867,
    lng: 2.3431,
    duration: '2 hours',
    highlights: ['Visit Sacré-Cœur Basilica', 'See Place du Tertre artists', 'Discover hidden passages', 'Picasso & Van Gogh stories'],
  },
  {
    id: 'da4',
    name: 'Musée d\'Orsay Impressionist Highlights',
    location: 'Esplanade Valéry Giscard d\'Estaing',
    description: 'Explore the world\'s finest Impressionist collection — Monet, Renoir, Degas, and Van Gogh in a stunning Beaux-Arts station.',
    images: ['https://images.unsplash.com/photo-1591289009723-aef0a1a8a211?w=800'],
    rating: 4.8,
    reviewCount: 5621,
    tags: ['Museum', 'Impressionism', 'Art'],
    price: '€16',
    category: 'Museums',
    distance: '0.9 km',
    isOpen: false,
    bookingUrl: '#',
    bookingLabel: 'Reserve',
  },
  {
    id: 'da5',
    name: 'Versailles Palace & Gardens Day Trip',
    location: 'Place d\'Armes, Versailles',
    description: 'Full-day guided tour of the Hall of Mirrors, Royal Apartments, and stunning gardens with skip-the-line access.',
    images: ['https://images.unsplash.com/photo-1597910037310-7dd7ff4b4b0a?w=800'],
    rating: 4.7,
    reviewCount: 6234,
    tags: ['Day Trip', 'Palace', 'History'],
    price: '€75',
    category: 'Sightseeing',
    distance: '17.0 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Book Now',
  },
  {
    id: 'da6',
    name: 'Seine River Jazz Cruise',
    location: 'Port de la Bourdonnais',
    description: 'Sunset cruise with live jazz, champagne, and stunning views of Notre-Dame, the Louvre, and Eiffel Tower.',
    images: ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800'],
    rating: 4.7,
    reviewCount: 1832,
    tags: ['River Cruise', 'Jazz', 'Sunset'],
    price: '€55',
    category: 'Events',
    distance: '0.5 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Get Deal',
    dealPrice: '€39',
    originalPrice: '€55',
  },
  {
    id: 'da7',
    name: 'Paris Catacombs Skip-the-Line',
    location: 'Avenue du Colonel Henri',
    description: 'Descend into the underground ossuaries beneath Paris. See the remains of 6 million people in this hauntingly beautiful labyrinth.',
    images: ['https://images.unsplash.com/photo-1536663060084-a0d9eeeaf44b?w=800'],
    rating: 4.6,
    reviewCount: 4521,
    tags: ['Underground', 'History', 'Skip-the-Line'],
    price: '€29',
    category: 'Monuments',
    distance: '3.2 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Book Now',
  },
  {
    id: 'da8',
    name: 'Luxembourg Gardens & Latin Quarter',
    location: 'Jardin du Luxembourg',
    description: 'Stroll through the most beautiful park in Paris, then explore the vibrant Latin Quarter\'s bookshops and cafés.',
    images: ['https://images.unsplash.com/photo-1555992457-b8fefdd09699?w=800'],
    rating: 4.5,
    reviewCount: 2145,
    tags: ['Garden', 'Walking', 'Free'],
    price: 'Free',
    category: 'Nature',
    distance: '1.7 km',
    isOpen: true,
  },
  {
    id: 'da9',
    name: 'Moulin Rouge Dinner Show',
    location: 'Boulevard de Clichy, Montmartre',
    description: 'Experience the world\'s most famous cabaret with a gourmet French dinner and half a bottle of champagne per person.',
    images: ['https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800'],
    rating: 4.6,
    reviewCount: 3210,
    tags: ['Cabaret', 'Dinner Show', 'Nightlife'],
    price: '€185',
    category: 'Events',
    distance: '3.1 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Book Now',
  },
  {
    id: 'da10',
    name: 'Rooftop Wine Tasting at Galeries Lafayette',
    location: 'Boulevard Haussmann',
    description: 'Curated tasting of French wines on the iconic rooftop terrace with sweeping views of Opéra Garnier and the city skyline.',
    images: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800'],
    rating: 4.8,
    reviewCount: 892,
    tags: ['Wine Tasting', 'Rooftop', 'Views'],
    price: '€45',
    category: 'Events',
    distance: '1.4 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Get Deal',
    dealPrice: '€35',
    originalPrice: '€45',
  },
];

// ─── Mock Discover Restaurants ──────────────────────────────

export const MOCK_DISCOVER_RESTAURANTS: DiscoverItem[] = [
  // ── BOOKED items ──
  {
    id: 'rb1',
    name: 'Le Comptoir du Panthéon',
    location: 'Saint-Germain-des-Prés, Paris',
    description: 'Classic Parisian bistro with zinc bar and sidewalk seating. Famous for their duck confit and crème brûlée.',
    images: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'],
    rating: 4.6,
    reviewCount: 3891,
    tags: ['Bistro', 'Classic French', 'Sidewalk Seating'],
    price: '€€€',
    category: 'Restaurant',
    cuisine: 'Classic French',
    isBooked: true,
    bookedDay: 1,
    bookedTime: '12:30 PM',
    mealType: 'Lunch',
    distance: '0.8 km',
  },
  {
    id: 'rb2',
    name: 'Le Jules Verne',
    location: 'Eiffel Tower, 2nd Floor',
    description: 'Michelin-starred dining 125 meters above Paris. Chef Frédéric Anton\'s tasting menu with Eiffel Tower views.',
    images: ['https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=800'],
    rating: 4.9,
    reviewCount: 1247,
    tags: ['Fine Dining', 'Michelin Star', 'Eiffel Tower View'],
    price: '€€€€',
    category: 'Restaurant',
    cuisine: 'Modern French',
    isBooked: true,
    bookedDay: 1,
    bookedTime: '7:30 PM',
    mealType: 'Dinner',
    distance: '0.3 km',
  },
  {
    id: 'rb3',
    name: 'Paris Food Tour: Le Marais',
    location: 'Le Marais, Paris',
    description: '3-hour walking food tour through Le Marais. Taste artisan cheese, charcuterie, crêpes, wine, and chocolate at 7 stops.',
    images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'],
    rating: 4.8,
    reviewCount: 6842,
    tags: ['Food Tour', 'Walking', 'Local Guide'],
    price: '€89 pp',
    category: 'Experience',
    cuisine: 'French Street Food',
    isBooked: true,
    bookedDay: 2,
    bookedTime: '10:00 AM',
    mealType: 'Tour',
    distance: '1.5 km',
  },
  // ── DISCOVER items ──
  {
    id: 'rd1',
    name: 'Breizh Café',
    location: 'Le Marais, Paris',
    description: 'Brittany-style crêperie with organic buckwheat galettes and artisanal cider. Always a queue — worth the wait.',
    images: ['https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800'],
    rating: 4.7,
    reviewCount: 3241,
    tags: ['Crêperie', 'Organic', 'Queue-Worthy'],
    price: '€€',
    category: 'Restaurant',
    cuisine: 'Crêpes & Galettes',
    distance: '1.4 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Reserve',
  },
  {
    id: 'rd2',
    name: 'Berthillon',
    location: 'Île Saint-Louis, Paris',
    description: 'The most famous ice cream in Paris since 1954. Over 70 rotating flavors of artisanal ice cream and sorbet.',
    images: ['https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=800'],
    rating: 4.9,
    reviewCount: 5612,
    tags: ['Ice Cream', 'Artisanal', 'Iconic'],
    price: '€',
    category: 'Dessert',
    cuisine: 'Ice Cream & Sorbet',
    distance: '1.9 km',
    isOpen: true,
  },
  {
    id: 'rd3',
    name: 'Le Bar du Caveau',
    location: 'Place Dauphine, Paris',
    description: 'Hidden wine bar on one of Paris\'s most charming squares. Natural wines and charcuterie plates in a cozy setting.',
    images: ['https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800'],
    rating: 4.5,
    reviewCount: 1876,
    tags: ['Wine Bar', 'Natural Wine', 'Cozy'],
    price: '€€',
    category: 'Bar',
    cuisine: 'Wine Bar',
    distance: '0.9 km',
    isOpen: false,
    bookingUrl: '#',
    bookingLabel: 'Reserve',
  },
  {
    id: 'rd4',
    name: 'Ô Chateau Wine Tasting',
    location: 'Rue Jean-Jacques Rousseau',
    description: 'Expert-led French wine tastings in a beautiful 16th-century cellar. Learn about terroir from certified sommeliers.',
    images: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800'],
    rating: 4.9,
    reviewCount: 982,
    tags: ['Wine Tasting', 'Cellar', 'Sommelier'],
    price: '€€€',
    category: 'Experience',
    cuisine: 'Wine Experience',
    distance: '1.1 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Get Deal',
    dealPrice: '€45',
    originalPrice: '€75',
  },
  {
    id: 'rd5',
    name: 'French Pastry Masterclass',
    location: 'Le Cordon Bleu, Paris',
    description: 'Learn to make croissants and macarons from scratch with a Le Cordon Bleu chef. Take home your creations.',
    images: ['https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?w=800'],
    rating: 4.8,
    reviewCount: 2156,
    tags: ['Cooking Class', 'Pastry', 'Hands-on'],
    price: '€€€',
    category: 'Experience',
    cuisine: 'Pastry Class',
    distance: '2.1 km',
    isOpen: false,
    bookingUrl: '#',
    bookingLabel: 'Get Deal',
    dealPrice: '€69',
    originalPrice: '€99',
  },
  {
    id: 'rd6',
    name: 'Le Bouillon Chartier',
    location: 'Rue du Faubourg Montmartre',
    description: 'Historic Parisian canteen since 1896. Incredible value three-course French meals in a stunning Belle Époque dining room.',
    images: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'],
    rating: 4.4,
    reviewCount: 7893,
    tags: ['Historic', 'Budget-Friendly', 'Belle Époque'],
    price: '€',
    category: 'Restaurant',
    cuisine: 'Traditional French',
    distance: '2.3 km',
    isOpen: true,
    bookingUrl: '#',
    bookingLabel: 'Reserve',
  },
  {
    id: 'rd7',
    name: 'Du Pain et des Idées',
    location: 'Rue Yves Toudic, Canal Saint-Martin',
    description: 'Paris\'s most acclaimed bakery. Their pain des amis and escargot pastries are legendary. Closed weekends.',
    images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800'],
    rating: 4.8,
    reviewCount: 4231,
    tags: ['Bakery', 'Pastries', 'Artisanal'],
    price: '€',
    category: 'Bakery',
    cuisine: 'Artisan Bakery',
    distance: '2.8 km',
    isOpen: true,
  },
  {
    id: 'rd8',
    name: 'L\'As du Fallafel',
    location: 'Rue des Rosiers, Le Marais',
    description: 'The king of Parisian falafel. Massive pittas stuffed with crispy falafel, grilled aubergine, and tahini.',
    images: ['https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800'],
    rating: 4.4,
    reviewCount: 6521,
    tags: ['Street Food', 'Falafel', 'Queue-Worthy'],
    price: '€',
    category: 'Street Food',
    cuisine: 'Middle Eastern',
    distance: '1.5 km',
    isOpen: true,
  },
];

// ─── Enhanced Flight Data (for itinerary sections) ──────────

export interface MockFlightDetail {
  id: string;
  type: 'arrival' | 'return';
  airline: string;
  flightNumber: string;
  originIata: string;
  originName: string;
  destIata: string;
  destName: string;
  departureTime: string;
  arrivalTime: string;
  departureTerminal: string;
  arrivalTerminal: string;
  gate: string;
  boardingTime: string;
  duration: string;
  aircraft: string;
  cabinClass: string;
  seats: string;
  baggage: string;
  meal: string;
  wifi: boolean;
  confirmation: string;
  status: 'On Time' | 'Delayed' | 'Boarding';
  pricePerTraveler: number;
  totalPrice: number;
  currency: string;
  isBooked: boolean;
}

export const MOCK_FLIGHT_DETAILS: MockFlightDetail[] = [
  {
    id: 'flight-detail-1',
    type: 'arrival',
    airline: 'Air France',
    flightNumber: 'AF 007',
    originIata: 'JFK',
    originName: 'John F. Kennedy Intl',
    destIata: 'CDG',
    destName: 'Charles de Gaulle',
    departureTime: '8:30 PM',
    arrivalTime: '9:45 AM +1',
    departureTerminal: 'Terminal 1',
    arrivalTerminal: 'Terminal 2E',
    gate: 'B42',
    boardingTime: '7:45 PM',
    duration: '7h 15m',
    aircraft: 'Boeing 777-300ER',
    cabinClass: 'Economy',
    seats: '24A, 24B',
    baggage: '2 × 23kg checked + 1 carry-on each',
    meal: 'Dinner + Breakfast included',
    wifi: true,
    confirmation: 'AF-XK7M2P',
    status: 'On Time',
    pricePerTraveler: 485,
    totalPrice: 970,
    currency: 'USD',
    isBooked: true,
  },
  {
    id: 'flight-detail-2',
    type: 'return',
    airline: 'Air France',
    flightNumber: 'AF 008',
    originIata: 'CDG',
    originName: 'Charles de Gaulle',
    destIata: 'JFK',
    destName: 'John F. Kennedy Intl',
    departureTime: '11:00 AM',
    arrivalTime: '2:15 PM',
    departureTerminal: 'Terminal 2E',
    arrivalTerminal: 'Terminal 1',
    gate: 'E31',
    boardingTime: '10:15 AM',
    duration: '8h 15m',
    aircraft: 'Airbus A350-900',
    cabinClass: 'Economy',
    seats: '31C, 31D',
    baggage: '2 × 23kg checked + 1 carry-on each',
    meal: 'Lunch + Snack included',
    wifi: true,
    confirmation: 'AF-YN8R3Q',
    status: 'On Time',
    pricePerTraveler: 520,
    totalPrice: 1040,
    currency: 'USD',
    isBooked: true,
  },
];

// ─── Enhanced Hotel Data (for itinerary sections) ───────────

export interface MockHotelRoom {
  id: string;
  name: string;
  image: string;
  images?: string[];
  amenities: string[];
  pricePerNight: number;
  size?: string;
  beds?: string;
  maxGuests?: number;
  isSelected: boolean;
}

export interface MockHotelGuestRatings {
  overall: number;
  label: string;
  cleanliness: number;
  staff: number;
  location: number;
  comfort: number;
  value: number;
  totalRatings: number;
}

export interface MockHotelDetail {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  starRating: number;
  checkInTime: string;
  checkOutTime: string;
  checkInDate: string;
  checkOutDate: string;
  amenities: string[];
  images: string[];
  rooms: MockHotelRoom[];
  isBooked: boolean;
  totalPrice: number;
  currency: string;
  guestRatings: MockHotelGuestRatings;
  taxesAndFees: { cityTax: number; serviceFee: number; vat: number };
  phone: string;
  email: string;
  website: string;
  neighborhood: string;
  confirmationNumber: string;
}

export const MOCK_HOTEL_DETAIL: MockHotelDetail = {
  id: 'hotel-detail-1',
  name: 'Hôtel Le Marais',
  address: '12 Rue de Rivoli, 75004 Paris',
  lat: 48.8556,
  lng: 2.3522,
  rating: 4.6,
  starRating: 4,
  checkInTime: '3:00 PM',
  checkOutTime: '11:00 AM',
  checkInDate: '2026-03-10',
  checkOutDate: '2026-03-16',
  amenities: ['Wi-Fi', 'Coffee', 'AC', 'Concierge', 'Gym', 'Restaurant', 'Parking', 'Pool'],
  images: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
    'https://images.unsplash.com/photo-1590490360182-c33d955e4e48?w=800',
  ],
  rooms: [
    {
      id: 'room-1',
      name: 'Standard Room',
      image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600',
      images: [
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600',
        'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600',
      ],
      amenities: ['Queen Bed', 'Wi-Fi', 'Safe', 'Rain Shower'],
      pricePerNight: 120,
      size: '20m²',
      beds: '1 Queen',
      maxGuests: 2,
      isSelected: false,
    },
    {
      id: 'room-2',
      name: 'Deluxe Double Room',
      image: 'https://images.unsplash.com/photo-1590490360182-c33d955e4e48?w=600',
      images: [
        'https://images.unsplash.com/photo-1590490360182-c33d955e4e48?w=600',
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600',
      ],
      amenities: ['King Bed', 'City View', 'Mini Bar', 'Safe', 'Rain Shower'],
      pricePerNight: 180,
      size: '30m²',
      beds: '1 King',
      maxGuests: 2,
      isSelected: true,
    },
    {
      id: 'room-3',
      name: 'Junior Suite',
      image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600',
      images: [
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600',
        'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600',
      ],
      amenities: ['King Bed', 'Living Area', 'Balcony', 'Bathtub', 'Mini Bar', 'Espresso Machine'],
      pricePerNight: 280,
      size: '45m²',
      beds: '1 King + Sofa',
      maxGuests: 3,
      isSelected: false,
    },
    {
      id: 'room-4',
      name: 'Family Room',
      image: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600',
      amenities: ['2 Queen Beds', 'City View', 'Mini Bar', 'Safe', '2 Bathrooms'],
      pricePerNight: 220,
      size: '40m²',
      beds: '2 Queens',
      maxGuests: 4,
      isSelected: false,
    },
  ],
  isBooked: true,
  totalPrice: 1080,
  currency: 'USD',
  guestRatings: {
    overall: 8.4,
    label: 'Very Good',
    cleanliness: 8.7,
    staff: 9.1,
    location: 9.4,
    comfort: 8.2,
    value: 7.8,
    totalRatings: 328,
  },
  taxesAndFees: { cityTax: 3.50, serviceFee: 12.00, vat: 10 },
  phone: '+33 1 42 72 34 12',
  email: 'info@hotelmarais.fr',
  website: 'hotelmarais.fr',
  neighborhood: 'Le Marais - 4th Arrondissement',
  confirmationNumber: 'HLM-XK7M2P',
};

// ─── Calendar View Activities ─────────────────────────────

const CAL_COLORS: Record<string, string> = {
  sightseeing: '#3b82f6',
  tour: '#8b5cf6',
  dining: '#f59e0b',
  cultural: '#6366f1',
  shopping: '#ec4899',
  nightlife: '#a855f7',
  outdoor: '#10b981',
  museum: '#6366f1',
  event: '#ef4444',
};

export const MOCK_CALENDAR_ACTIVITIES: CalendarActivity[] = [
  // Day 0
  { id: 'cal-1', title: 'Visit the Eiffel Tower', type: 'sightseeing', day: 0, startHour: 9, duration: 2, startTime: '9:00 AM', endTime: '11:00 AM', location: 'Champ de Mars', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=400', rating: 4.9, price: '$25', color: CAL_COLORS.sightseeing, onCalendar: true },
  { id: 'cal-2', title: 'Seine River Cruise', type: 'tour', day: 0, startHour: 10.5, duration: 1.5, startTime: '10:30 AM', endTime: '12:00 PM', location: 'Port de la Bourdonnais', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400', rating: 4.7, price: '$18', color: CAL_COLORS.tour, onCalendar: true },
  { id: 'cal-3', title: 'Lunch at Le Comptoir', type: 'dining', day: 0, startHour: 12.5, duration: 1.5, startTime: '12:30 PM', endTime: '2:00 PM', location: 'Saint-Germain-des-Prés', rating: 4.6, price: '$45', color: CAL_COLORS.dining, onCalendar: true },
  { id: 'cal-4', title: 'Louvre Museum', type: 'cultural', day: 0, startHour: 14.5, duration: 2.5, startTime: '2:30 PM', endTime: '5:00 PM', location: 'Rue de Rivoli', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400', rating: 4.8, price: '$17', color: CAL_COLORS.cultural, onCalendar: true },
  { id: 'cal-5', title: 'Dinner at Le Jules Verne', type: 'dining', day: 0, startHour: 19.5, duration: 2, startTime: '7:30 PM', endTime: '9:30 PM', location: 'Eiffel Tower, 2nd Floor', rating: 4.9, price: '$120', color: CAL_COLORS.dining, onCalendar: true },
  { id: 'cal-6', title: 'Montmartre Night Walk', type: 'nightlife', day: 0, startHour: 21.5, duration: 1.5, startTime: '9:30 PM', endTime: '11:00 PM', location: 'Sacré-Cœur', color: CAL_COLORS.nightlife, onCalendar: true },
  // Day 1 — Disneyland day (parent + sub-activities are at the end of the array)
  // Day 2
  { id: 'cal-10', title: "Musée d'Orsay", type: 'museum', day: 2, startHour: 10, duration: 2.5, startTime: '10:00 AM', endTime: '12:30 PM', location: "Esplanade Valéry Giscard d'Estaing", image: 'https://images.unsplash.com/photo-1591289009723-aef0a1a8a211?w=400', rating: 4.8, price: '$16', color: CAL_COLORS.museum, onCalendar: true },
  { id: 'cal-11', title: 'Le Marais Food Tour', type: 'tour', day: 2, startHour: 13, duration: 3, startTime: '1:00 PM', endTime: '4:00 PM', location: 'Le Marais', rating: 4.8, price: '$89', color: CAL_COLORS.tour, onCalendar: true },
  { id: 'cal-12', title: 'Seine Jazz Cruise', type: 'event', day: 2, startHour: 19, duration: 2, startTime: '7:00 PM', endTime: '9:00 PM', location: 'Port de la Bourdonnais', rating: 4.7, price: '$55', color: CAL_COLORS.event, onCalendar: true },
  // Off-calendar (for explore sidebar)
  { id: 'cal-13', title: 'Catacombs Tour', type: 'sightseeing', day: -1, startHour: 10, duration: 1.5, startTime: '10:00 AM', endTime: '11:30 AM', location: 'Avenue du Colonel Henri', image: 'https://images.unsplash.com/photo-1536663060084-a0d9eeeaf44b?w=400', rating: 4.6, price: '$29', color: CAL_COLORS.sightseeing, onCalendar: false },
  { id: 'cal-14', title: 'Luxembourg Gardens Walk', type: 'outdoor', day: -1, startHour: 14, duration: 1.5, startTime: '2:00 PM', endTime: '3:30 PM', location: 'Jardin du Luxembourg', image: 'https://images.unsplash.com/photo-1555992457-b8fefdd09699?w=400', rating: 4.5, price: 'Free', color: CAL_COLORS.outdoor, onCalendar: false },
  { id: 'cal-15', title: 'Moulin Rouge Show', type: 'event', day: -1, startHour: 21, duration: 2.5, startTime: '9:00 PM', endTime: '11:30 PM', location: 'Boulevard de Clichy', image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=400', rating: 4.6, price: '$185', color: CAL_COLORS.event, onCalendar: false },
  { id: 'cal-16', title: 'Wine Tasting at Galeries Lafayette', type: 'event', day: -1, startHour: 17, duration: 1.5, startTime: '5:00 PM', endTime: '6:30 PM', location: 'Boulevard Haussmann', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400', rating: 4.8, price: '$45', color: CAL_COLORS.event, onCalendar: false },
  { id: 'cal-17', title: 'Montmartre Art Tour', type: 'tour', day: -1, startHour: 10, duration: 2, startTime: '10:00 AM', endTime: '12:00 PM', location: 'Sacré-Cœur, Montmartre', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400', rating: 4.7, price: '$25', color: CAL_COLORS.tour, onCalendar: false },
  { id: 'cal-18', title: 'Pastry Masterclass', type: 'dining', day: -1, startHour: 9, duration: 3, startTime: '9:00 AM', endTime: '12:00 PM', location: 'Le Cordon Bleu', image: 'https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?w=400', rating: 4.8, price: '$99', color: CAL_COLORS.dining, onCalendar: false },
  // ── Disneyland Paris (parent block, Day 1) ──
  { id: 'cal-disney', title: 'Disneyland Paris', type: 'event', day: 1, startHour: 9, duration: 12, startTime: '9:00 AM', endTime: '9:00 PM', location: 'Disneyland Paris, Marne-la-Vallée', image: 'https://images.unsplash.com/photo-1587162146766-e06b1189b907?w=800', rating: 4.8, price: '$110', color: CAL_COLORS.event, onCalendar: true },
  // ── Disneyland sub-activities ──
  { id: 'cal-disney-1', title: 'Space Mountain', type: 'sightseeing', day: 1, startHour: 9.5, duration: 1, startTime: '9:30 AM', endTime: '10:30 AM', location: 'Discoveryland', rating: 4.9, color: CAL_COLORS.sightseeing, onCalendar: true, parentId: 'cal-disney' },
  { id: 'cal-disney-2', title: 'Pirates of the Caribbean', type: 'sightseeing', day: 1, startHour: 11, duration: 0.75, startTime: '11:00 AM', endTime: '11:45 AM', location: 'Adventureland', rating: 4.7, color: CAL_COLORS.sightseeing, onCalendar: true, parentId: 'cal-disney' },
  { id: 'cal-disney-3', title: 'Lunch at Café Hyperion', type: 'dining', day: 1, startHour: 12.5, duration: 1, startTime: '12:30 PM', endTime: '1:30 PM', location: 'Discoveryland', rating: 4.3, price: '$25', color: CAL_COLORS.dining, onCalendar: true, parentId: 'cal-disney' },
  { id: 'cal-disney-4', title: 'Big Thunder Mountain', type: 'sightseeing', day: 1, startHour: 14, duration: 0.75, startTime: '2:00 PM', endTime: '2:45 PM', location: 'Frontierland', rating: 4.8, color: CAL_COLORS.sightseeing, onCalendar: true, parentId: 'cal-disney' },
  { id: 'cal-disney-5', title: 'Disney Illuminations', type: 'event', day: 1, startHour: 20, duration: 0.75, startTime: '8:00 PM', endTime: '8:45 PM', location: 'Main Street U.S.A.', rating: 4.9, color: CAL_COLORS.event, onCalendar: true, parentId: 'cal-disney' },

  // ── Day 4 — Hidden Gems ──
  { id: 'cal-20', title: 'Père Lachaise Cemetery', type: 'sightseeing', day: 3, startHour: 9, duration: 2, startTime: '9:00 AM', endTime: '11:00 AM', location: 'Boulevard de Ménilmontant', image: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?w=400', rating: 4.5, price: 'Free', color: CAL_COLORS.sightseeing, onCalendar: true },
  { id: 'cal-21', title: 'Canal Saint-Martin Stroll', type: 'outdoor', day: 3, startHour: 11.5, duration: 1.5, startTime: '11:30 AM', endTime: '1:00 PM', location: 'Canal Saint-Martin', image: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=400', rating: 4.4, price: 'Free', color: CAL_COLORS.outdoor, onCalendar: true },
  { id: 'cal-22', title: 'Lunch at Pink Mamma', type: 'dining', day: 3, startHour: 13, duration: 1.5, startTime: '1:00 PM', endTime: '2:30 PM', location: '20bis Rue de la Folie-Méricourt', rating: 4.6, price: '$35', color: CAL_COLORS.dining, onCalendar: true },
  { id: 'cal-23', title: 'Sainte-Chapelle Visit', type: 'cultural', day: 3, startHour: 15, duration: 1.5, startTime: '3:00 PM', endTime: '4:30 PM', location: 'Île de la Cité', image: 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=400', rating: 4.9, price: '$13', color: CAL_COLORS.cultural, onCalendar: true },
  { id: 'cal-24', title: 'Rooftop Drinks at Le Perchoir', type: 'nightlife', day: 3, startHour: 18, duration: 2, startTime: '6:00 PM', endTime: '8:00 PM', location: 'Le Perchoir Ménilmontant', rating: 4.3, price: '$20', color: CAL_COLORS.nightlife, onCalendar: true },

  // ── Day 5 — Departure ──
  { id: 'cal-25', title: 'Breakfast at Café de Flore', type: 'dining', day: 4, startHour: 8, duration: 1.5, startTime: '8:00 AM', endTime: '9:30 AM', location: 'Boulevard Saint-Germain', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', rating: 4.7, price: '$22', color: CAL_COLORS.dining, onCalendar: true },
  { id: 'cal-26', title: 'Hotel Checkout', type: 'hotel', day: 4, startHour: 10, duration: 1, startTime: '10:00 AM', endTime: '11:00 AM', location: 'Hôtel Le Marais', color: CAL_COLORS.hotel, onCalendar: true },
  { id: 'cal-27', title: 'Transfer to CDG Airport', type: 'transport', day: 4, startHour: 13, duration: 1.5, startTime: '1:00 PM', endTime: '2:30 PM', location: 'Charles de Gaulle Airport', color: CAL_COLORS.transport, onCalendar: true },
];

// ─── Mock Collaborators ─────────────────────────────────

export const MOCK_COLLABORATORS: CollaboratorPresence[] = [
  { userId: 'user-1', name: 'You', avatarInitial: 'Y', color: '#3b82f6', cursor: null, selectedBlockId: null, isOnline: true },
  { userId: 'user-2', name: 'Sarah', avatarInitial: 'S', color: '#a855f7', cursor: { day: 0, hour: 10 }, selectedBlockId: 'cal-2', isOnline: true },
  { userId: 'user-3', name: 'Marcus', avatarInitial: 'M', color: '#10b981', cursor: { day: 2, hour: 14 }, selectedBlockId: null, isOnline: true },
  { userId: 'user-4', name: 'Elena', avatarInitial: 'E', color: '#f59e0b', cursor: null, selectedBlockId: null, isOnline: false },
];

// ─── Weather Forecast ─────────────────────────────────────

export const MOCK_WEATHER_FORECAST: WeatherForecast[] = [
  { day: 'Mon', high: 12, low: 4, icon: '⛅', condition: 'Partly Cloudy' },
  { day: 'Tue', high: 14, low: 6, icon: '☀️', condition: 'Sunny' },
  { day: 'Wed', high: 11, low: 5, icon: '🌧️', condition: 'Light Rain' },
  { day: 'Thu', high: 13, low: 5, icon: '⛅', condition: 'Partly Cloudy' },
  { day: 'Fri', high: 15, low: 7, icon: '☀️', condition: 'Sunny' },
  { day: 'Sat', high: 10, low: 3, icon: '🌧️', condition: 'Showers' },
  { day: 'Sun', high: 12, low: 4, icon: '⛅', condition: 'Partly Cloudy' },
];
