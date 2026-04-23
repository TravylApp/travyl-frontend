// Core entity types — mirrors the Supabase schema

export type Visibility = 'private' | 'link' | 'public'
export type LinkPermission = 'viewer' | 'editor'
export type CollaboratorRole = 'viewer' | 'editor'

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  onboarding_completed: boolean;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TripContextData {
  hero_image_url?: string;
  hero_images?: string[];
  lat?: number;
  lng?: number;
  lede_text?: string;
  travelers?: TravelerMetadata;
  quick_facts?: {
    currency?: string;
    language?: string;
    timezone?: string;
    power?: string;
    transport?: string;
    taxi?: string;
    tipping?: string;
    water?: string;
    emergency?: string;
  };
  weather?: {
    current?: { high: number; low: number; condition: string; temp?: number; feelslike?: number; conditions?: string };
    forecast?: { day: string; date?: string; high: number; low: number; icon: string; condition: string }[];
  };
  explore_items?: {
    id: string;
    title: string;
    subtitle?: string;
    category: string;
    description: string;
    image?: string;
    tags?: string[];
  }[];
  news?: {
    id: string;
    title: string;
    snippet: string;
    category: 'event' | 'advisory' | 'news' | 'tip';
    source: string;
    date: string;
    url?: string;
    image?: string;
  }[];
  hotels?: any[];
  foursquare_venues?: any[];
  events?: any[];
  cuisine?: any[];
  phrases?: any[];
  cost_of_living?: any;
  nearby_cities?: any[];
  safety?: any;
  timezone_info?: any;
  sunrise?: any;
  aqi?: any;
  wiki?: string | { extract?: string };
  country?: any;
  holidays?: any[];
  restaurants?: any[];
  flights?: any[];
  itinerary?: any[];
  all_hotels?: any[];
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
  trip_context: TripContextData;
  is_generated: boolean;
  visibility: Visibility;
  link_permission: LinkPermission;
  share_link_token: string | null;
  forked_from_trip_id: string | null;
  fork_count: number;
  theme: string;
  custom_theme_color: string | null;
  tab_color_overrides?: Record<string, string>;
  itinerary_color_overrides?: Record<string, string>;
  hidden_tabs?: Record<string, boolean>;
  cover_image_url?: string | null;
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

export interface ExplorePlaceRow {
  title: string;
  items: PlaceItem[];
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

export interface TripBudgetCategory {
  id: string
  trip_id: string
  category: string
  budgeted: number
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface TripManualExpense {
  id: string
  trip_id: string
  category_id: string
  description: string
  amount: number
  currency: string
  created_by: string
  created_at: string
}

export interface BudgetCategoryData {
  id: string
  name: string
  budgeted: number
  actual: number
  calendarItems: Array<{
    id: string
    name: string
    day: number
    time?: string
    cost: number
    originalCurrency?: string
  }>
  manualExpenses: TripManualExpense[]
  percentUsed: number
}

// ─── Packing Types ──────────────────────────────────────────

export const PACKING_CATEGORIES = ['clothing', 'toiletries', 'electronics', 'documents', 'accessories', 'essentials'] as const
export type StaticPackingCategory = (typeof PACKING_CATEGORIES)[number]
/** @deprecated Use StaticPackingCategory for static categories, or string for freeform */
export type PackingCategory = StaticPackingCategory

export interface DbPackingItem {
  id: string
  trip_id: string
  user_id: string
  name: string
  category: string
  is_packed: boolean
  packed_by: string | null
  packed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
  owner_id: string | null
  group_tag: string | null
  quantity: number
  packed_count: number
  user_display_name?: string
  user_avatar_url?: string
  owner_display_name?: string
}

export interface PackingAuditEntry {
  id: string
  trip_id: string
  user_id: string
  item_id: string | null
  action: 'added' | 'packed' | 'unpacked' | 'removed' | 'claimed' | 'released' | 'transferred'
  item_name: string
  created_at: string
  target_user_id: string | null
  user_display_name?: string
  user_avatar_url?: string
  target_display_name?: string
}

export interface CatalogItem {
  name: string
  category: PackingCategory
  tags: string[]
}

export interface PackingSuggestion {
  id: string
  trip_id: string
  user_id: string
  name: string
  category: string
  reason: string
  status: 'pending' | 'accepted' | 'dismissed'
  created_at: string
}

export interface TravelerMetadata {
  adults: number
  children: number
  infants: number
  child_ages: number[]
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
  type: 'destination' | 'attraction' | 'restaurant' | 'experience' | 'event' | 'hotel';
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

export type ViewMode = 'week' | 'day'

export interface ActivityData {
  category?: string
  location_name?: string
  image_url?: string
  rating?: number
  flight_number?: string
  airline?: string
  check_in?: string
  check_out?: string
  booking_ref?: string
  pollResult?: 'remove'
  unscheduled?: boolean
}

export interface CalendarActivity {
  id: string;
  title: string;
  type: string;
  day: number;
  startHour: number;
  duration: number;
  location?: string;
  image?: string;
  rating?: number;
  price?: string;
  notes?: string;
  /** Formatted time string e.g. "9:00 AM" */
  startTime?: string;
  /** Formatted time string e.g. "10:00 AM" */
  endTime?: string;
  /** Whether this activity appears on the calendar grid */
  onCalendar?: boolean;
  /** Parent activity id for nested/grouped activities */
  parentId?: string;
  /** Optional hex color override */
  color?: string;
  /** For multi-day activities (hotels). Same as day if omitted. */
  endDay?: number;
  /** For map integration */
  latitude?: number;
  /** For map integration */
  longitude?: number;
  /** DB sort_order */
  sortOrder?: number;
  pollResult?: 'remove'
  /** True when removed from calendar by a rescope but not deleted. */
  unscheduled?: boolean
  /** Flight number for flight/transport activities */
  flightNumber?: string
  /** Airline name for flight/transport activities */
  airline?: string
  /** Check-in date/time for hotel activities */
  checkIn?: string
  /** Check-out date/time for hotel activities */
  checkOut?: string
  /** Booking confirmation reference */
  bookingRef?: string
}

export interface Poll {
  activityId: string
  startedBy: string
  startedAt: string
  status: 'active' | 'resolved'
  result: 'keep' | 'remove' | ''
  votes: Record<string, 'yes' | 'no'>
}

// ─── Suggestion / For You Panel ─────────────────────────────

export interface SuggestionCard {
  id: string
  name: string
  category: ActivityCategory
  imageUrl: string
  imageUrls?: string[]
  duration: number        // hours
  price: number | null
  currency: string
  rating: number | null
  location: string
  latitude: number
  longitude: number
  description: string
  source: 'ai' | 'search'
  relevanceScore: number
  reason?: string
}

export interface RecommendationSection {
  sectionType: 'destination' | 'category' | 'affinity' | 'schedule' | 'social'
  sectionTitle: string
  sectionSubtitle?: string
  suggestions: SuggestionCard[]
}

export interface ActivityDetail {
  id: string
  name: string
  category: ActivityCategory
  imageUrl: string
  imageUrls?: string[]
  duration: number
  price: number | null
  currency: string
  rating: number | null
  location: string
  latitude: number
  longitude: number
  description: string
  source: 'ai' | 'search'
  relevanceScore: number
  reason?: string
  meetingPoint?: string
  availableTimes?: string[]
  groupSize?: number
  languages?: string[]
  included?: string[]
  notIncluded?: string[]
  tips?: string[]
  accessibility?: string[]
  address?: string
  phone?: string
  website?: string
}

export interface DestinationDetail {
  name: string
  country: string
  description: string
  language: string
  currency: string
  timezone: string
  bestTimeToVisit: string
  budgetLevel: 1 | 2 | 3 | 4
  tags: string[]
  image: string
  images?: string[]
  latitude: number
  longitude: number
  population?: string
}

export interface UserAwareness {
  userId: string;
  name: string;
  avatarInitial: string;
  color: string;
  isOnline: boolean;
  selectedEventId: string | null;
  currentView: ViewMode;
  selectedDayIndex?: number;
  /** Legacy itinerary view — selected block id */
  selectedBlockId?: string;
  cursor?: { day: number; hour: number };
}

/** Alias for UserAwareness — used by legacy itinerary components */
export type CollaboratorPresence = UserAwareness;

export interface WeatherForecast {
  day: string;
  high: number;
  low: number;
  icon: string;
  condition: string;
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

// ─── Weather ────────────────────────────────────────────────

export interface WeatherCurrent {
  temp: number;
  feelslike: number;
  conditions: string;
  icon: string;
  humidity: number;
  windspeed: number;
}

export interface WeatherDay {
  date: string;
  high: number;
  low: number;
  conditions: string;
  icon: string;
  precipprob: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherForecastResponse {
  location: string;
  timezone: string;
  current: WeatherCurrent;
  forecast: WeatherDay[];
}

// ─── Events ─────────────────────────────────────────────────

export interface TravylEvent {
  id: string;
  name: string;
  date: string;
  time: string | null;
  venue: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  price: string | null;
  category: string | null;
  photo_url: string | null;
  link: string | null;
}

// ─── Place Detail (from /api/places/{id}) ───────────────────

export interface PlaceDetailResponse {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  images: string[];
  image_url: string | null;
  categories: string[];
  hours: string | null;
  price: number | null;
  reviewCount: number | null;
}

// ─── Menu ───────────────────────────────────────────────────

export interface MenuItem {
  name: string;
  price: string | null;
  description: string | null;
}

export interface MenuResponse {
  restaurant_name: string;
  menu_url: string | null;
  items: MenuItem[];
  source: string;
}

// ─── Suggest ────────────────────────────────────────────────

export interface SuggestResponse {
  suggestions: PlaceItem[];
  hasMore: boolean;
  nextPage: number | null;
}

// ─── Server Favorites ───────────────────────────────────────

export interface ServerFavorite {
  id: string;
  place_id: string;
  user_id: string;
  created_at: string;
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

// ─── Trip Sharing ────────────────────────────────────────────

// TripVisibility is an alias for Visibility (exported at top of file)
export type TripVisibility = Visibility

export interface TripNote {
  id: string
  trip_id: string
  user_id: string
  day: number
  hour: number
  text: string
  color: string
  created_at: string
  updated_at: string
}

export interface TripCollaborator {
  id: string
  trip_id: string
  user_id: string | null
  invited_email: string | null
  invite_token: string | null
  role_type: CollaboratorRole
  invite_status: 'pending' | 'accepted' | 'declined'
  invited_by: string
  accepted_at: string | null
  created_at: string
  display_name?: string | null
  avatar_url?: string | null
}

export interface EffectivePermission {
  role: 'owner' | 'editor' | 'viewer'
  canEdit: boolean
  canDelete: boolean
  canInvite: boolean
  canCreateNotes: boolean
}

// ─── Trip Card / Member Types ──────────────────────────────

export interface TripMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface TripCard extends Trip {
  image: string;
  images?: string[];
  route?: TripRoute;
  members?: TripMember[];
}

// ─── Flight / Hotel Detail Types ────────────────────────────

export interface FlightDetail {
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

export interface HotelRoom {
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

export interface HotelGuestRatings {
  overall: number;
  label: string;
  cleanliness: number;
  staff: number;
  location: number;
  comfort: number;
  value: number;
  totalRatings: number;
}

export interface HotelDetail {
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
  rooms: HotelRoom[];
  isBooked: boolean;
  totalPrice: number;
  currency: string;
  guestRatings: HotelGuestRatings;
  taxesAndFees: { cityTax: number; serviceFee: number; vat: number };
  phone: string;
  email: string;
  website: string;
  neighborhood: string;
  confirmationNumber: string;
}

// ─── Packing ────────────────────────────────────────────────

export interface PackingItem {
  item: string;
  packed: boolean;
}

export type PackingList = Record<string, PackingItem[]>;

// ─── Budget ─────────────────────────────────────────────────

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
  expenses: BudgetExpense[];
}
