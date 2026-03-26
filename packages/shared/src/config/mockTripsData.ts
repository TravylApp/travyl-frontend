import type { Trip } from '../types';
import { PARIS_TRIP_CONTEXT } from './mockItineraryData';

export interface TripMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
}

export interface MockTripCard extends Trip {
  image: string;
  images?: string[];
  route?: import('../types').TripRoute;
  members?: TripMember[];
}

export const MOCK_TRIPS: MockTripCard[] = [];
