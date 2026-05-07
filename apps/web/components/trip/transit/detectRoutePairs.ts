import type { ItineraryDayViewModel, HotelViewModel, TransitSegment } from '@travyl/shared';

// ─── Public types ─────────────────────────────────────────────

export interface RoutePair {
  /** String key: `${dayIndex}:${lat.toFixed(4)},${lng.toFixed(4)}>${lat.toFixed(4)},${lng.toFixed(4)}` */
  id: string;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  /** Origin day's index (0-based). For within-day pairs this is the day; for cross-day pairs this is the departing day. */
  dayIndex: number;
  type: 'within-day' | 'cross-day';
  /** ISO datetime computed as `${dayDate}T12:00:00` */
  departureTime: string;
}

// ─── Internal helpers ─────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Check whether two lat/lng coordinates are within ~100 metres of each other
 * using the Haversine formula.
 */
export function coordsEqual(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): boolean {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  const distance = 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
  return distance < 100;
}

/**
 * Build a reproducible string key for a route pair, including the day index.
 */
export function pairId(
  dayIndex: number,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): string {
  return `${dayIndex}:${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}>${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
}

/**
 * Compute an ISO date string (YYYY-MM-DD) from a trip start date and a 0-based day index.
 */
export function isoDateFromDayIndex(tripStartDate: string, dayIndex: number): string {
  const date = new Date(tripStartDate + 'T00:00:00');
  date.setDate(date.getDate() + dayIndex);
  return date.toISOString().split('T')[0];
}

// ─── Internal types ───────────────────────────────────────────

/** A location that has valid coordinate data. */
interface CoordinateLocation {
  lat: number;
  lng: number;
  label: string;
}

// ─── Detection logic ──────────────────────────────────────────

/**
 * Check whether an existing transit booking matches a route pair by comparing
 * origin/destination label text (case-insensitive substring match).
 */
function isBookedPair(
  origin: { label: string },
  destination: { label: string },
  bookings: TransitSegment[],
): boolean {
  return bookings.some((b) => {
    const ol = b.data.originLabel.toLowerCase();
    const dl = b.data.destinationLabel.toLowerCase();
    const olPair = origin.label.toLowerCase();
    const dlPair = destination.label.toLowerCase();
    const originMatch = ol.includes(olPair) || olPair.includes(ol);
    const destMatch = dl.includes(dlPair) || dlPair.includes(dl);
    return originMatch && destMatch;
  });
}

/**
 * Collect all coordinate-locations for a single itinerary day.
 *
 * If a hotel with coordinates covers this day (checkIn <= dayDate < checkOut),
 * it is prepended as the first origin and appended as the final destination.
 * Activities without coordinates are skipped.
 */
function collectDayLocations(
  day: ItineraryDayViewModel,
  dayDate: string,
  hotels: HotelViewModel[],
): CoordinateLocation[] {
  // Find hotels whose stay covers this day
  const matchingHotels = hotels.filter((h) => {
    if (h.latitude == null || h.longitude == null) return false;
    return dayDate >= h.checkIn && dayDate < h.checkOut;
  });

  const locations: CoordinateLocation[] = [];

  // Prepend hotel as origin endpoint (use the first matching hotel)
  if (matchingHotels.length > 0) {
    const hotel = matchingHotels[0];
    locations.push({
      lat: hotel.latitude!,
      lng: hotel.longitude!,
      label: hotel.name,
    });
  }

  // Collect activities that have coordinate data, preserving order
  for (const timeGroup of day.timeGroups) {
    for (const activity of timeGroup.activities) {
      if (activity.latitude != null && activity.longitude != null) {
        locations.push({
          lat: activity.latitude,
          lng: activity.longitude,
          label: activity.locationName ?? activity.name,
        });
      }
    }
  }

  // Append hotel as destination endpoint
  if (matchingHotels.length > 0) {
    const hotel = matchingHotels[0];
    locations.push({
      lat: hotel.latitude!,
      lng: hotel.longitude!,
      label: hotel.name,
    });
  }

  return locations;
}

/**
 * Detect consecutive route pairs from itinerary days for transit auto-suggest.
 *
 * Algorithm:
 * 1. Groups activities by day using `ItineraryDayViewModel[]`
 * 2. Includes hotels with coordinates as route endpoints (prepended/appended per day)
 * 3. Filters to items with lat/lng — skips items without coordinate data
 * 4. Builds consecutive pairs within each day
 * 5. Builds cross-day pairs (last location of day N → first location of day N+1)
 * 6. Skips pairs that are already booked (label text proximity)
 * 7. Deduplicates identical coordinate pairs across days (shown once, in first day)
 * 8. Skips same-location pairs (origin/destination within ~100m)
 */
export function detectRoutePairs(
  tripStartDate: string,
  days: ItineraryDayViewModel[],
  hotels: HotelViewModel[],
  transitBookings: TransitSegment[],
): RoutePair[] {
  // Track coordinate-only keys (without dayIndex) for cross-day dedup (rule 7)
  const seenCoordOnlyKeys = new Set<string>();
  const result: RoutePair[] = [];

  // Pre-compute locations for every day
  const dayLocations: { dayIndex: number; dayDate: string; locations: CoordinateLocation[] }[] =
    [];

  for (let i = 0; i < days.length; i++) {
    const dayDate = isoDateFromDayIndex(tripStartDate, i);
    const locations = collectDayLocations(days[i], dayDate, hotels);
    dayLocations.push({ dayIndex: i, dayDate, locations });
  }

  for (let i = 0; i < dayLocations.length; i++) {
    const { dayIndex, dayDate, locations } = dayLocations[i];

    // ── Within-day pairs ──────────────────────────────────
    for (let j = 0; j < locations.length - 1; j++) {
      const origin = locations[j];
      const destination = locations[j + 1];

      // Skip same-location pairs (rule 8)
      if (coordsEqual(origin, destination)) continue;

      // Coordinate-only key for dedup (rule 7)
      const coordOnlyKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}>${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
      if (seenCoordOnlyKeys.has(coordOnlyKey)) continue;

      // Skip if already booked (rule 6)
      if (isBookedPair(origin, destination, transitBookings)) continue;

      seenCoordOnlyKeys.add(coordOnlyKey);

      result.push({
        id: pairId(dayIndex, origin, destination),
        origin: { lat: origin.lat, lng: origin.lng, label: origin.label },
        destination: { lat: destination.lat, lng: destination.lng, label: destination.label },
        dayIndex,
        type: 'within-day',
        departureTime: `${dayDate}T12:00:00`,
      });
    }

    // ── Cross-day pairs ───────────────────────────────────
    if (i < dayLocations.length - 1) {
      const nextLocations = dayLocations[i + 1].locations;
      if (locations.length > 0 && nextLocations.length > 0) {
        const origin = locations[locations.length - 1];
        const destination = nextLocations[0];

        // Skip same-location pairs (rule 8)
        if (coordsEqual(origin, destination)) continue;

        const coordOnlyKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}>${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
        if (seenCoordOnlyKeys.has(coordOnlyKey)) continue;

        if (isBookedPair(origin, destination, transitBookings)) continue;

        seenCoordOnlyKeys.add(coordOnlyKey);

        result.push({
          id: pairId(dayIndex, origin, destination),
          origin: { lat: origin.lat, lng: origin.lng, label: origin.label },
          destination: { lat: destination.lat, lng: destination.lng, label: destination.label },
          dayIndex,
          type: 'cross-day',
          departureTime: `${dayDate}T12:00:00`,
        });
      }
    }
  }

  return result;
}
