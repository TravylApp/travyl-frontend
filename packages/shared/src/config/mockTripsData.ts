import type { Trip } from '../types';

export interface RouteLocation {
  city: string;
  country: string;
  countryCode: string;
  continent: string;
  iata?: string; // Airport code if applicable
  lat: number;
  lng: number;
}

export interface TripRoute {
  origin: RouteLocation;
  destinations: RouteLocation[];
  stops?: RouteLocation[]; // Layovers or intermediate stops
}

export interface MockTripCard extends Trip {
  image: string;
  route?: TripRoute;
}

export const MOCK_TRIPS: MockTripCard[] = [
  {
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
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
    route: {
      origin: { city: 'New York', country: 'United States', countryCode: 'US', continent: 'North America', iata: 'JFK', lat: 40.7128, lng: -74.0060 },
      destinations: [
        { city: 'Paris', country: 'France', countryCode: 'FR', continent: 'Europe', iata: 'CDG', lat: 48.8566, lng: 2.3522 },
      ],
    },
  },
  {
    id: 'mock-trip-2',
    user_id: 'mock-user',
    title: 'Tokyo Discovery',
    destination: 'Tokyo, Japan',
    start_date: '2026-04-05',
    end_date: '2026-04-14',
    budget: 4500,
    currency: 'USD',
    travelers: 2,
    status: 'booked',
    trip_context: {},
    is_generated: true,
    is_shared: false,
    share_link_token: null,
    share_link_role: 'viewer',
    forked_from_trip_id: null,
    fork_count: 3,
    is_public: true,
    created_at: '2026-02-15T00:00:00Z',
    updated_at: '2026-02-20T00:00:00Z',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    route: {
      origin: { city: 'Los Angeles', country: 'United States', countryCode: 'US', continent: 'North America', iata: 'LAX', lat: 34.0522, lng: -118.2437 },
      stops: [{ city: 'Tokyo', country: 'Japan', countryCode: 'JP', continent: 'Asia', iata: 'NRT', lat: 35.6762, lng: 139.6503 }],
      destinations: [
        { city: 'Kyoto', country: 'Japan', countryCode: 'JP', continent: 'Asia', lat: 35.0116, lng: 135.7681 },
        { city: 'Osaka', country: 'Japan', countryCode: 'JP', continent: 'Asia', lat: 34.6937, lng: 135.5023 },
      ],
    },
  },
  {
    id: 'mock-trip-3',
    user_id: 'mock-user',
    title: 'Santorini Getaway',
    destination: 'Santorini, Greece',
    start_date: '2026-06-20',
    end_date: '2026-06-27',
    budget: 3500,
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
    created_at: '2026-03-02T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800',
    route: {
      origin: { city: 'London', country: 'United Kingdom', countryCode: 'GB', continent: 'Europe', iata: 'LHR', lat: 51.5074, lng: -0.1278 },
      stops: [{ city: 'Athens', country: 'Greece', countryCode: 'GR', continent: 'Europe', iata: 'ATH', lat: 37.9838, lng: 23.7275 }],
      destinations: [
        { city: 'Santorini', country: 'Greece', countryCode: 'GR', continent: 'Europe', lat: 36.3932, lng: 25.4615 },
      ],
    },
  },
  {
    id: 'mock-trip-4',
    user_id: 'mock-user',
    title: 'Bali Retreat',
    destination: 'Bali, Indonesia',
    start_date: '2026-08-01',
    end_date: '2026-08-10',
    budget: 2800,
    currency: 'USD',
    travelers: 4,
    status: 'planning',
    trip_context: {},
    is_generated: true,
    is_shared: false,
    share_link_token: null,
    share_link_role: 'viewer',
    forked_from_trip_id: null,
    fork_count: 0,
    is_public: false,
    created_at: '2026-02-28T00:00:00Z',
    updated_at: '2026-02-28T00:00:00Z',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
    route: {
      origin: { city: 'Sydney', country: 'Australia', countryCode: 'AU', continent: 'Oceania', iata: 'SYD', lat: -33.8688, lng: 151.2093 },
      destinations: [
        { city: 'Bali', country: 'Indonesia', countryCode: 'ID', continent: 'Asia', iata: 'DPS', lat: -8.3405, lng: 115.0920 },
      ],
    },
  },
  {
    id: 'mock-trip-5',
    user_id: 'mock-user',
    title: 'Barcelona & Costa Brava',
    destination: 'Barcelona, Spain',
    start_date: '2026-05-15',
    end_date: '2026-05-22',
    budget: 2500,
    currency: 'USD',
    travelers: 3,
    status: 'active',
    trip_context: {},
    is_generated: true,
    is_shared: true,
    share_link_token: 'share-token-123',
    share_link_role: 'editor',
    forked_from_trip_id: null,
    fork_count: 5,
    is_public: true,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800',
    route: {
      origin: { city: 'Berlin', country: 'Germany', countryCode: 'DE', continent: 'Europe', iata: 'BER', lat: 52.5200, lng: 13.4050 },
      destinations: [
        { city: 'Barcelona', country: 'Spain', countryCode: 'ES', continent: 'Europe', iata: 'BCN', lat: 41.3851, lng: 2.1734 },
        { city: 'Girona', country: 'Spain', countryCode: 'ES', continent: 'Europe', lat: 41.9794, lng: 2.8214 },
      ],
    },
  },
  {
    id: 'mock-trip-6',
    user_id: 'mock-user',
    title: 'Swiss Alps Winter',
    destination: 'Zermatt, Switzerland',
    start_date: '2025-12-20',
    end_date: '2025-12-28',
    budget: 5000,
    currency: 'USD',
    travelers: 2,
    status: 'completed',
    trip_context: {},
    is_generated: false,
    is_shared: false,
    share_link_token: null,
    share_link_role: 'viewer',
    forked_from_trip_id: null,
    fork_count: 0,
    is_public: false,
    created_at: '2025-11-01T00:00:00Z',
    updated_at: '2025-12-29T00:00:00Z',
    image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=800',
    route: {
      origin: { city: 'Chicago', country: 'United States', countryCode: 'US', continent: 'North America', iata: 'ORD', lat: 41.8781, lng: -87.6298 },
      stops: [{ city: 'Zurich', country: 'Switzerland', countryCode: 'CH', continent: 'Europe', iata: 'ZRH', lat: 47.3769, lng: 8.5417 }],
      destinations: [
        { city: 'Zermatt', country: 'Switzerland', countryCode: 'CH', continent: 'Europe', lat: 46.0207, lng: 7.7491 },
      ],
    },
  },
];
