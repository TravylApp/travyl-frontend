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
  created_at: string;
  updated_at: string;
}

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
  category: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  start_time: string | null;
  end_time: string | null;
  estimated_cost: number | null;
  currency: string;
  sort_order: number;
  booking_url: string | null;
  notes: string | null;
  source: 'agent' | 'user' | 'search';
  created_at: string;
}

export interface Flight {
  id: string;
  trip_id: string;
  airline: string;
  flight_number: string | null;
  origin_iata: string;
  origin_name: string | null;
  dest_iata: string;
  dest_name: string | null;
  departure_at: string;
  arrival_at: string;
  price: number | null;
  currency: string;
  cabin_class: 'economy' | 'premium_economy' | 'business' | 'first';
  booking_ref: string | null;
  offer_id: string | null;
  created_at: string;
}

export interface Hotel {
  id: string;
  trip_id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  check_in: string;
  check_out: string;
  price_per_night: number | null;
  total_price: number | null;
  currency: string;
  rating: number | null;
  star_rating: number | null;
  image_url: string | null;
  booking_ref: string | null;
  offer_id: string | null;
  created_at: string;
}
