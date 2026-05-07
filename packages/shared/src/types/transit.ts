export type VehicleType = 'train' | 'bus' | 'subway' | 'tram' | 'light_rail' | 'ferry' | 'cable_car' | 'funicular' | 'rideshare' | 'shuttle';

export interface TransitData {
  vehicleType: VehicleType;
  provider: string | null;
  routeName: string | null;
  originLabel: string;
  destinationLabel: string;
  departureAt: string;       // ISO datetime
  arrivalAt: string;         // ISO datetime
  price: number | null;
  currency: string;
  bookingRef: string | null;
  confirmationCode: string | null;
  notes: string | null;
  // New fields for direction search results
  route_data?: TransitDirectionResult;
}

export interface TransitSegment {
  id: string;
  trip_id: string;
  data: TransitData;
  created_at: string;
}

// --- New types below ---

export type TransitMode = VehicleType; // alias for backwards compat

export interface TransitDirectionStep {
  mode: TransitMode;
  line: string;
  line_color?: string;
  carrier: string;
  origin_stop: string;
  origin_stop_id?: string;
  destination_stop: string;
  destination_stop_id?: string;
  departure_at: string;
  arrival_at: string;
  duration_minutes: number;
  distance_meters?: number;
  num_stops?: number;
}

export interface TransitDirectionResult {
  id: string;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  departure_at: string;
  arrival_at: string;
  total_duration_minutes: number;
  total_distance_meters?: number;
  fare?: { amount: number; currency: string };
  steps: TransitDirectionStep[];
  leg_count: number;
  provider: 'otp';
}

// Input type for creating a booking (without server-generated fields)
export type CreateTransitInput = Omit<TransitData, 'confirmationCode'>;

// Input for CRUD mutations (links trip_id + data)
export interface CreateTransitBookingInput {
  trip_id: string;
  data: TransitData;
}
