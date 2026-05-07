export type VehicleType = 'train' | 'bus' | 'ferry' | 'rideshare' | 'shuttle';

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
}

export interface TransitSegment {
  id: string;
  trip_id: string;
  data: TransitData;
  created_at: string;
}
