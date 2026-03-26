import type { ItineraryDayViewModel, TimeGroup, ActivityViewModel, FlightViewModel, HotelViewModel } from '../viewmodels/itineraryViewModel';
import type { BudgetSummary } from '../viewmodels/budgetViewModel';
import type { Trip, BudgetItem, PackingList, WeatherInfo, DiscoverItem, CalendarActivity, WeatherForecast, UserAwareness } from '../types';

// ─── Mock Activities ────────────────────────────────────────

const MOCK_ACTIVITIES: ActivityViewModel[] = [];
const MOCK_ACTIVITIES_DAY2: ActivityViewModel[] = [];

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

export const MOCK_DAYS: ItineraryDayViewModel[] = [];

// ─── Mock Flights ───────────────────────────────────────────

export const MOCK_FLIGHTS: FlightViewModel[] = [];

// ─── Mock Hotels ────────────────────────────────────────────

export const MOCK_HOTELS: HotelViewModel[] = [];

// ─── Mock Trip ──────────────────────────────────────────────

export const PARIS_TRIP_CONTEXT: import('../types').TripContextData = {
  hero_image_url: '',
  hero_images: [],
  lat: 0,
  lng: 0,
  lede_text: '',
  quick_facts: {},
  weather: {
    current: { high: 0, low: 0, condition: '' },
    forecast: [],
  },
  explore_items: [],
  news: [],
};

export const MOCK_TRIP: Trip = {
  id: 'empty-trip',
  user_id: '',
  title: '',
  destination: '',
  start_date: '',
  end_date: '',
  budget: 0,
  currency: 'USD',
  travelers: 1,
  status: 'planning',
  trip_context: PARIS_TRIP_CONTEXT,
  is_generated: false,
  visibility: 'private' as const,
  link_permission: 'viewer' as const,
  share_link_token: null,
  forked_from_trip_id: null,
  fork_count: 0,
  theme: 'navy',
  custom_theme_color: null,
  created_at: '',
  updated_at: '',
};

// ─── Mock Budget ────────────────────────────────────────────

export const MOCK_BUDGET: BudgetSummary = {
  total: 0,
  totalFormatted: '$0',
  categories: [],
  currency: 'USD',
};

// ─── Mock Budget Items (Interactive) ────────────────────────

export const MOCK_BUDGET_ITEMS: BudgetItem[] = [];

// ─── Mock Packing List ──────────────────────────────────────

export const MOCK_PACKING_LIST: PackingList = {};


// ─── Mock Discover Activities ───────────────────────────────

export const MOCK_DISCOVER_ACTIVITIES: DiscoverItem[] = [];

// ─── Mock Discover Restaurants ──────────────────────────────

export const MOCK_DISCOVER_RESTAURANTS: DiscoverItem[] = [];

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

export const MOCK_FLIGHT_DETAILS: MockFlightDetail[] = [];

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
  id: '',
  name: '',
  address: '',
  lat: 0,
  lng: 0,
  rating: 0,
  starRating: 0,
  checkInTime: '',
  checkOutTime: '',
  checkInDate: '',
  checkOutDate: '',
  amenities: [],
  images: [],
  rooms: [],
  isBooked: false,
  totalPrice: 0,
  currency: 'USD',
  guestRatings: {
    overall: 0,
    label: '',
    cleanliness: 0,
    staff: 0,
    location: 0,
    comfort: 0,
    value: 0,
    totalRatings: 0,
  },
  taxesAndFees: { cityTax: 0, serviceFee: 0, vat: 0 },
  phone: '',
  email: '',
  website: '',
  neighborhood: '',
  confirmationNumber: '',
};

// ─── Calendar View Activities ─────────────────────────────

export const MOCK_CALENDAR_ACTIVITIES: CalendarActivity[] = [];

// ─── Mock Collaborators ─────────────────────────────────

export const MOCK_COLLABORATORS: UserAwareness[] = [];



// ─── Glance Hero Images (shared by web + mobile) ─────────────

export const GLANCE_HERO_IMAGES: string[] = [];

// ─── UI Constants (not mock data — used by both web and mobile) ──
export const NEWS_COLORS: [string, string][] = [
  ['#1a1a2e', '#16213e'],
  ['#0f3460', '#1a1a2e'],
  ['#533483', '#0f3460'],
];
