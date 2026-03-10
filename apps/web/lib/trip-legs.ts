import type { TripLeg } from '@/components/itinerary/MultiLegSelector';

// Interface for trip data that can have multiple destinations
export interface TripDestination {
  id: string;
  name: string;
  code?: string;
  lat?: number;
  lng?: number;
  startDate: string | Date;
  endDate: string | Date;
  order: number;
}

// Derive legs from trip destinations
export function deriveLegsFromDestinations(
  destinations: TripDestination[]
): TripLeg[] {
  if (!destinations || destinations.length === 0) {
    return [];
  }

  // Sort by order
  const sorted = [...destinations].sort((a, b) => a.order - b.order);

  return sorted.map((dest, index) => {
    const prevDest = index > 0 ? sorted[index - 1] : null;
    const startDate = new Date(dest.startDate);
    const endDate = new Date(dest.endDate);
    const dayCount = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    return {
      id: dest.id,
      origin: prevDest?.name || 'Home',
      originCode: prevDest?.code,
      originLat: prevDest?.lat,
      originLng: prevDest?.lng,
      destination: dest.name,
      destinationCode: dest.code,
      destinationLat: dest.lat,
      destinationLng: dest.lng,
      startDate,
      endDate,
      dayCount,
    };
  });
}

// Generate mock legs for demo/testing
export function generateMockLegs(tripId: string): TripLeg[] {
  // For now, return mock data based on trip ID
  // In production, this would come from the trip's destinations

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 7); // Start a week from now

  return [
    {
      id: `${tripId}-leg-1`,
      origin: 'New York',
      originCode: 'JFK',
      originLat: 40.6413,
      originLng: -73.7781,
      destination: 'Paris',
      destinationCode: 'CDG',
      destinationLat: 49.0097,
      destinationLng: 2.5479,
      startDate: new Date(baseDate.getTime()),
      endDate: new Date(baseDate.getTime() + 4 * 24 * 60 * 60 * 1000),
      dayCount: 5,
    },
    {
      id: `${tripId}-leg-2`,
      origin: 'Paris',
      originCode: 'CDG',
      originLat: 49.0097,
      originLng: 2.5479,
      destination: 'Rome',
      destinationCode: 'FCO',
      destinationLat: 41.8003,
      destinationLng: 12.2389,
      startDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(baseDate.getTime() + 9 * 24 * 60 * 60 * 1000),
      dayCount: 4,
    },
    {
      id: `${tripId}-leg-3`,
      origin: 'Rome',
      originCode: 'FCO',
      originLat: 41.8003,
      originLng: 12.2389,
      destination: 'Los Angeles',
      destinationCode: 'LAX',
      destinationLat: 33.9416,
      destinationLng: -118.4085,
      startDate: new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000),
      dayCount: 4,
    },
  ];
}

// Check if trip has multiple legs
export function isMultiLegTrip(legs: TripLeg[]): boolean {
  return legs.length > 1;
}

// Get leg display name (e.g., "Paris → Rome")
export function getLegDisplayName(leg: TripLeg): string {
  const from = leg.originCode || leg.origin;
  const to = leg.destinationCode || leg.destination;
  return `${from} → ${to}`;
}

// Get leg short name (just destination)
export function getLegShortName(leg: TripLeg): string {
  return leg.destinationCode || leg.destination;
}
