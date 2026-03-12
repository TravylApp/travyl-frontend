// Core entity types — mirrors the Supabase schema

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number | null;
  currency: string;
  travelers: number;
  status: 'planning' | 'booked' | 'active' | 'completed' | 'abandoned';
  trip_context: Record<string, unknown>;
  is_generated: boolean;
  is_shared: boolean;
  share_link_token: string | null;
  share_link_role: 'viewer' | 'editor';
  forked_from_trip_id: string | null;
  fork_count: number;
  is_public: boolean;
  theme: string;
  custom_theme_color: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Route / Map Types ─────────────────────────────────────

export interface RouteLocation {
  name: string;
  city?: string;
  iata?: string;
  lat: number;
  lng: number;
  country?: string;
  continent?: string;
}

export interface TripRoute {
  origin: RouteLocation;
  destinations: RouteLocation[];
  stops?: RouteLocation[];
}

export interface SavedItem {
  id: string;
  user_id: string;
  trip_id: string;
  item_type: 'activity' | 'flight' | 'hotel';
  item_id: string;
  created_at: string;
}

// ─── Home Page Data ──────────────────────────────────────────

export type TileCategory = 'destination' | 'attraction' | 'dining' | 'experience';

export interface MosaicTile {
  id: string;
  name: string;
  category: TileCategory;
  tagline: string;
  image_url: string | null;
  gridSpan: [number, number];
}

export interface InspirationCard {
  id: string;
  title: string;
  destination: string;
  image_url: string | null;
}

export interface ExploreItem {
  id: string;
  name: string;
  image_url: string | null;
}

export interface ExploreRow {
  title: string;
  items: ExploreItem[];
}

// ─── Hero Config ─────────────────────────────────────────────

export interface HeroSuggestion {
  id: string;
  label: string;
  short_label: string | null;
}

export interface HeroConfig {
  id: string;
  title: string;
  subtitle: string;
  search_placeholder: string;
  background_image_url: string | null;
  suggestions: HeroSuggestion[];
}

// ─── Itinerary Data ─────────────────────────────────────────

export type ActivityCategory = string; // slug from activity_categories table

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  theme: string | null;
  notes: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  itinerary_day_id: string;
  trip_id: string;
  name: string;
  category: ActivityCategory;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  start_time: string | null;
  end_time: string | null;
  estimated_cost: number | null;
  currency: string;
  sort_order: number | null;
  booking_url: string | null;
  notes: string | null;
  source: 'agent' | 'user' | 'search';
  created_at: string;
}

export interface FlightData {
  airline: string;
  flight_number: string | null;
  origin_iata: string;
  origin_name: string | null;
  dest_iata: string;
  dest_name: string | null;
  departure_at: string | null;
  arrival_at: string | null;
  price: number | null;
  currency: string | null;
  cabin_class: string | null;
  booking_ref: string | null;
  offer_id: string | null;
}

export interface Flight {
  id: string;
  trip_id: string;
  data: FlightData;
  created_at: string;
}

export interface HotelData {
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  check_in: string;
  check_out: string;
  price_per_night: number | null;
  total_price: number | null;
  currency: string | null;
  rating: number | null;
  star_rating: number | null;
  image_url: string | null;
  booking_ref: string | null;
  offer_id: string | null;
}

export interface Hotel {
  id: string;
  trip_id: string;
  data: HotelData;
  created_at: string;
}

export interface ItineraryDayWithActivities extends ItineraryDay {
  activities: Activity[];
}

// ─── Discover / Browse Items ────────────────────────────────

export interface DiscoverItem {
  id: string;
  name: string;
  location: string;
  description: string;
  images: string[];
  rating: number;
  reviewCount?: number;
  reviews?: number;
  tags: string[];
  price?: string;
  category?: string;
  cuisine?: string;
  isBooked?: boolean;
  bookedDay?: number;
  bookedTime?: string;
  mealType?: string;
  distance?: string;
  hours?: string;
  isOpen?: boolean;
  bookingUrl?: string;
  bookingLabel?: string;
  dealPrice?: string;
  originalPrice?: string;
  highlights?: string[];
  included?: string[];
  notIncluded?: string[];
  meetingPoint?: string;
  cancellationPolicy?: string;
  minParticipants?: number;
  maxParticipants?: number;
  languages?: string[];
  difficulty?: string;
  accessibility?: string;
  lat?: number;
  lng?: number;
  popularityScore?: number;
  duration?: string;
  phoneSteps?: Array<{
    title: string;
    description: string;
    screenshot: string;
  }>;
}

// ─── Budget Types ───────────────────────────────────────────

export interface BudgetExpense {
  id: string;
  description: string;
  amount: number;
}

export interface BudgetItem {
  id: string;
  category: string;
  budgeted: number;
  actual: number;
  fixed: boolean;
  expenses?: BudgetExpense[];
}

// ─── Packing Types ──────────────────────────────────────────

export interface PackingItem {
  item: string;
  packed: boolean;
}

export interface PackingList {
  [category: string]: PackingItem[];
}

export interface WeatherInfo {
  destination: string;
  high: number;
  low: number;
  unit: string;
  conditions: string;
}

// ─── Places / Discovery ────────────────────────────────────

export interface PlaceItem {
  id: string;
  name: string;
  image: string;
  images?: string[];
  type: 'destination' | 'attraction' | 'restaurant' | 'experience' | 'event';
  rating: number;
  tagline: string;
  category: string;
  description?: string;
  tags?: string[];
  latitude?: number;
  longitude?: number;

  // Rich detail fields
  priceLevel?: 1 | 2 | 3 | 4;
  hours?: string;
  phone?: string;
  website?: string;
  reviewCount?: number;
  address?: string;
  bestTimeToVisit?: string;
  duration?: string;
  admissionFee?: string;
  tips?: string[];
  accessibility?: string[];
  nearbyPlaces?: string[];
}

// ─── Calendar / Weather ────────────────────────────────────

export interface CalendarActivity {
  id: string;
  title: string;
  type: string;
  day: number;
  startHour: number;
  duration: number;
  startTime: string;
  endTime: string;
  location?: string;
  image?: string;
  rating?: number;
  price?: string;
  color: string;
  onCalendar: boolean;
  parentId?: string;
}

export interface CollaboratorPresence {
  userId: string;
  name: string;
  avatarInitial: string;
  color: string;
  cursor: { day: number; hour: number } | null;
  selectedBlockId: string | null;
  isOnline: boolean;
}

export interface WeatherForecast {
  day: string;
  high: number;
  low: number;
  icon: string;
  condition: string;
}

// ─── News / Events ────────────────────────────────────────────

export interface NewsItem {
  id: string;
  title: string;
  snippet: string;
  category: 'event' | 'advisory' | 'news' | 'tip';
  source: string;
  date: string;
  url?: string;
}

// ─── Globe / Map Location ────────────────────────────────────

export interface GlobeLocation {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  type: 'place' | 'event';
  category: string;
  color: string;
  board?: string;
  rating?: number;
  date?: string;
  imageUrl?: string;
}

// ─── Profile Favorites ──────────────────────────────────────

export interface FavoriteItem {
  id: string;
  name: string;
  country: string;
  category: string;
  type: 'place' | 'event';
  rating: number;
  description: string;
  tags: string[];
  board: string;
  image: string;
  date?: string;
}

// ─── Postcard ───────────────────────────────────────────────

export interface PostcardData {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  category: string;
  type: 'place' | 'event';
  rating?: number;
  date?: string;
  note?: string;
  board?: string;
  color: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
}

// ─── Flight Search / Comparison ─────────────────────────────

export interface FlightOption {
  id: string;
  airline: string;
  airlineLogo: string;
  flightNumber: string;
  aircraft: string;
  departure: { time: string; airport: string; terminal: string };
  arrival: { time: string; airport: string; terminal: string; nextDay?: boolean };
  duration: string;
  stops: number;
  layover?: { airport: string; duration: string };
  fareClass: string;
  price: { base: number; taxes: number; total: number };
  baggage: { carryOn: boolean; checked: number; checkedFee: number };
  seatPitch: string;
  seatWidth: string;
  amenities: { wifi: boolean; power: boolean; meals: boolean; entertainment: boolean };
  cancellation: { refundable: boolean; changeFee: number; policy: string };
  onTime: number;
  co2: number;
  co2Avg: number;
  milesEarned: number;
  alliance: string;
  badge: string | null;
}

export interface FlightDetailsType {
  confirmationNumber: string;
  pnr: string;
  ticketNumbers: string[];
  fareClass: string;
  fareType: string;
  baggageAllowance: { carryOn: string; checked: string; fees: number };
  cancellationPolicy: string;
  changePolicy: string;
  refundPolicy: string;
  checkInUrl: string;
  checkInOpens: string;
}

export interface PopularAirport {
  code: string;
  name: string;
  city: string;
}

// ─── Hotel Search ───────────────────────────────────────────

export interface RoomType {
  type: string;
  beds: string;
  size: string;
  guests: number;
  price: number;
  features?: string[];
  image: string;
  images?: string[];
  amenities?: string[];
}

export interface DetailedAmenities {
  general: string[];
  room: string[];
  dining: string[];
  wellness?: string[];
  services: string[];
}

export interface HotelSearchResult {
  id: number;
  name: string;
  stars: number;
  rating: number;
  reviews: number;
  price: number;
  image: string;
  images: string[];
  address: string;
  neighborhood?: string;
  distance?: string;
  amenities: string[];
  detailedAmenities?: DetailedAmenities;
  topAmenities?: string[];
  propertyTags?: string[];
  hotelChain?: string;
  roomTypes: RoomType[];
  guestRatings?: {
    overall: number;
    categories: { label: string; score: number }[];
  };
  taxesAndFees?: {
    cityTax: number;
    serviceFee: number;
    vat: number;
  };
  freeCancellation: boolean;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
}

// ─── Travel Board ───────────────────────────────────────────

export interface TravelBoard {
  id: string;
  title: string;
  subtitle: string;
  saves: number;
  badge?: string;
  badgeColor?: string;
  icon: string;
  iconColor: string;
  images: string[];
}
