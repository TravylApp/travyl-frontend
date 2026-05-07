/**
 * @module itineraryViewModel
 * Transforms raw trip data into view-ready itinerary structures.
 * Groups activities by time-of-day (morning/afternoon/evening/latenight),
 * formats times and costs for display, and produces strongly-typed view models
 * for itinerary days, flights, and hotels.
 *
 * Used by the web ItineraryTab and the mobile trip overview screens.
 */

import type { ItineraryDayWithActivities, Activity, Flight, Hotel, Car } from '../types';
import { formatCurrency, upscaleGoogleImage } from '../utils';

// ─── Time helpers ──────────────────────────────────────────────

/**
 * Time-of-day bucket used to group activities within a calendar day.
 * - `morning`: before 12:00 PM
 * - `afternoon`: 12:00 PM – 4:59 PM
 * - `evening`: 5:00 PM – 8:59 PM
 * - `latenight`: 9:00 PM and later
 */
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'latenight';

/**
 * Classifies a "HH:MM" time string into a `TimeOfDay` bucket.
 * Returns `"morning"` for null/missing times.
 *
 * @param time - Time string in "HH:MM" format, or null
 * @returns TimeOfDay bucket
 */
function getTimeOfDay(time: string | null): TimeOfDay {
  if (!time) return 'morning';
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'latenight';
}

/**
 * Formats a "HH:MM" time string to 12-hour AM/PM format for display.
 * Returns null for null/missing times.
 *
 * @param time - "HH:MM" time string or null
 * @returns Formatted time string (e.g. "2:30 PM"), or null
 */
function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Formats an ISO date string to a short weekday + date label for the itinerary.
 * @param dateStr - ISO date string (e.g. "2024-06-01")
 * @returns Formatted label (e.g. "Sat, Jun 1")
 */
function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Activity view model ───────────────────────────────────────

/**
 * View-ready representation of a single itinerary activity.
 * All display strings are pre-formatted; raw cost values are also available
 * for budget aggregation.
 */
export interface ActivityViewModel {
  /** UUID of the activity */
  id: string;
  /** Display name */
  name: string;
  /** Activity category (e.g. "dining", "museum") */
  category: string;
  /** Venue or location name, or null */
  locationName: string | null;
  /** Formatted start time (e.g. "9:00 AM"), or null */
  startTime: string | null;
  /** Formatted end time (e.g. "10:30 AM"), or null */
  endTime: string | null;
  /** Combined time range string (e.g. "9:00 AM – 10:30 AM"), or null */
  timeDisplay: string | null;
  /** Formatted cost string (e.g. "$25"), or null if no cost */
  costDisplay: string | null;
  /** Raw estimated cost number for budget calculations, or null */
  cost: number | null;
  /** Raw currency code for the cost (e.g. "USD"), or null */
  costCurrency: string | null;
  /** External booking URL, or null */
  bookingUrl: string | null;
  /** Optional free-text notes */
  notes: string | null;
  /** Upscaled activity image URL, or null */
  image: string | null;
  /** Data source for the activity record */
  source: Activity['source'];
  /** Latitude coordinate, or null if unavailable */
  latitude: number | null;
  /** Longitude coordinate, or null if unavailable */
  longitude: number | null;
  /** Time-of-day bucket for grouping within the day */
  timeOfDay: TimeOfDay;
}

/**
 * Builds an `ActivityViewModel` from a raw `Activity` DB record.
 * Formats times, costs, and upscales the image URL.
 *
 * @param activity - Raw Activity from the DB
 * @returns View-ready ActivityViewModel
 */
function buildActivityViewModel(activity: Activity): ActivityViewModel {
  const start = formatTime(activity.start_time);
  const end = formatTime(activity.end_time);
  let timeDisplay: string | null = null;
  if (start && end) timeDisplay = `${start} – ${end}`;
  else if (start) timeDisplay = start;

  return {
    id: activity.id,
    name: activity.name,
    category: activity.category,
    locationName: activity.location_name,
    startTime: start,
    endTime: end,
    timeDisplay,
    costDisplay: activity.estimated_cost != null
      ? formatCurrency(activity.estimated_cost, activity.currency)
      : null,
    cost: activity.estimated_cost ?? null,
    costCurrency: activity.estimated_cost != null ? activity.currency : null,
    bookingUrl: activity.booking_url,
    notes: activity.notes,
    image: upscaleGoogleImage((activity as any).image) ?? null,
    source: activity.source,
    latitude: activity.latitude ?? null,
    longitude: activity.longitude ?? null,
    timeOfDay: getTimeOfDay(activity.start_time),
  };
}

// ─── Time group ────────────────────────────────────────────────

/**
 * A group of activities that share the same time-of-day bucket within a day.
 * Used to render section headers ("Morning", "Afternoon", etc.) in the itinerary.
 */
export interface TimeGroup {
  /** The time-of-day bucket for this group */
  timeOfDay: TimeOfDay;
  /** All activities in this time-of-day bucket, in schedule order */
  activities: ActivityViewModel[];
}

// ─── Day view model ────────────────────────────────────────────

/**
 * View-ready representation of a single itinerary day.
 * Activities are grouped by time-of-day for section rendering.
 */
export interface ItineraryDayViewModel {
  /** UUID of the itinerary day record */
  id: string;
  /** 1-based day number within the trip */
  dayNumber: number;
  /** Short label (e.g. "Day 1") */
  dayLabel: string;
  /** Formatted date label (e.g. "Sat, Jun 1") */
  dateLabel: string;
  /** Optional AI-generated day theme (e.g. "Art & Architecture") */
  theme: string | null;
  /** Optional free-text notes for the day */
  notes: string | null;
  /** Activities grouped into time-of-day sections, in chronological order */
  timeGroups: TimeGroup[];
  /** Total count of activities for the day */
  activityCount: number;
}

/**
 * Transforms an `ItineraryDayWithActivities` DB record into an
 * `ItineraryDayViewModel` for the UI.
 * Groups activities by time-of-day and orders groups morning → afternoon → evening → latenight.
 *
 * @param day - Itinerary day record with its associated activities
 * @returns View-ready ItineraryDayViewModel
 */
export function buildItineraryDayViewModel(day: ItineraryDayWithActivities): ItineraryDayViewModel {
  const activityVMs = day.activities.map(buildActivityViewModel);

  const groupMap = new Map<TimeOfDay, ActivityViewModel[]>();
  for (const vm of activityVMs) {
    const list = groupMap.get(vm.timeOfDay) ?? [];
    list.push(vm);
    groupMap.set(vm.timeOfDay, list);
  }

  const order: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'latenight'];
  const timeGroups: TimeGroup[] = order
    .filter((tod) => groupMap.has(tod))
    .map((tod) => ({ timeOfDay: tod, activities: groupMap.get(tod)! }));

  return {
    id: day.id,
    dayNumber: day.day_number,
    dayLabel: `Day ${day.day_number}`,
    dateLabel: formatDayDate(day.date),
    theme: day.theme,
    notes: day.notes,
    timeGroups,
    activityCount: activityVMs.length,
  };
}

// ─── Flight view model ─────────────────────────────────────────

/**
 * View-ready representation of a flight booking.
 * All display strings are pre-formatted. Raw numeric price fields are available
 * for budget aggregation.
 */
export interface FlightViewModel {
  /** UUID of the flight record */
  id: string;
  /** Airline name (e.g. "Delta") */
  airline: string;
  /** Airline carrier logo URL (e.g. SerpAPI Google Flights image), or null */
  airlineLogo: string | null;
  /** Flight number (e.g. "DL 123"), or null */
  flightNumber: string | null;
  /** Route string (e.g. "JFK → CDG") */
  route: string;
  /** Origin IATA code (e.g. "JFK") */
  originIata: string;
  /** Destination IATA code (e.g. "CDG") */
  destIata: string;
  /** Full origin airport name, or null */
  originName: string | null;
  /** Full destination airport name, or null */
  destName: string | null;
  /** Formatted departure datetime (e.g. "Fri, Jun 1, 8:30 AM"), or null */
  departureDisplay: string | null;
  /** Formatted arrival datetime, or null */
  arrivalDisplay: string | null;
  /** Raw ISO departure timestamp from the DB record, or null. Used for sorting. */
  departureAt: string | null;
  /** Raw ISO arrival timestamp from the DB record, or null. */
  arrivalAt: string | null;
  /** Formatted price string (e.g. "$450"), or null if no price */
  priceDisplay: string | null;
  /** Raw price number for budget calculations, or null */
  price: number | null;
  /** Raw currency code for the price, or null */
  priceCurrency: string | null;
  /** Cabin class (e.g. "economy", "business"), or null */
  cabinClass: string | null;
  /** Booking confirmation reference, or null */
  bookingRef: string | null;
}

/**
 * Formats an ISO datetime string to a short weekday + date + time label.
 * Returns null for null/missing values.
 *
 * @param dt - ISO datetime string or null
 * @returns Formatted label (e.g. "Fri, Jun 1, 8:30 AM"), or null
 */
function formatDatetime(dt: string | null): string | null {
  if (!dt) return null;
  const d = new Date(dt);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Transforms a raw `Flight` DB record into a `FlightViewModel` for the UI.
 *
 * @param flight - Flight record from the DB
 * @returns View-ready FlightViewModel
 */
export function buildFlightViewModel(flight: Flight): FlightViewModel {
  const d = flight.data;
  return {
    id: flight.id,
    airline: d.airline,
    airlineLogo: d.airline_logo ?? null,
    flightNumber: d.flight_number,
    route: `${d.origin_iata} → ${d.dest_iata}`,
    originIata: d.origin_iata,
    destIata: d.dest_iata,
    originName: d.origin_name,
    destName: d.dest_name,
    departureDisplay: formatDatetime(d.departure_at),
    arrivalDisplay: formatDatetime(d.arrival_at),
    departureAt: d.departure_at,
    arrivalAt: d.arrival_at,
    priceDisplay: d.price != null && d.currency ? formatCurrency(d.price, d.currency) : null,
    price: d.price ?? null,
    priceCurrency: d.price != null ? d.currency ?? null : null,
    cabinClass: d.cabin_class,
    bookingRef: d.booking_ref,
  };
}

// ─── Hotel view model ──────────────────────────────────────────

/**
 * View-ready representation of a hotel booking.
 * Includes computed stay duration, formatted dates, and pre-formatted price strings.
 * Raw price fields are also available for budget aggregation.
 */
export interface HotelViewModel {
  /** UUID of the hotel record */
  id: string;
  /** Hotel name */
  name: string;
  /** Street address, or null */
  address: string | null;
  /** ISO check-in date string (e.g. "2024-06-01") */
  checkIn: string;
  /** ISO check-out date string */
  checkOut: string;
  /** Formatted check-in date (e.g. "Jun 1") */
  checkInDisplay: string;
  /** Formatted check-out date */
  checkOutDisplay: string;
  /** Number of nights (minimum 1) */
  nights: number;
  /** Human-readable nights label (e.g. "3 nights", "1 night") */
  nightsLabel: string;
  /**
   * Formatted price string. Shows total price if available, otherwise
   * nightly rate formatted as "$X/night". Null if no price data.
   */
  priceDisplay: string | null;
  /**
   * Raw price for budget calculations. Equals `total_price` if available,
   * otherwise equals `price_per_night`. Null if no price data.
   */
  price: number | null;
  /** Raw currency code for the price, or null */
  priceCurrency: string | null;
  /** Guest review rating (typically 0–10 or 0–5 depending on source), or null */
  rating: number | null;
  /** Star rating category (e.g. 4 for 4-star), or null */
  starRating: number | null;
  /** Hotel hero image URL, or null */
  imageUrl: string | null;
  /** Booking confirmation reference, or null */
  bookingRef: string | null;
  /** Latitude coordinate, or null if unavailable */
  latitude: number | null;
  /** Longitude coordinate, or null if unavailable */
  longitude: number | null;
}

/**
 * Formats an ISO date string to a short "Mon DD" label.
 * @param dateStr - ISO date string (e.g. "2024-06-01")
 * @returns Formatted string (e.g. "Jun 1")
 */
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Transforms a raw `Hotel` DB record into a `HotelViewModel` for the UI.
 * Computes the number of nights, builds the price display, and formats dates.
 *
 * @param hotel - Hotel record from the DB
 * @returns View-ready HotelViewModel
 */
export function buildHotelViewModel(hotel: Hotel): HotelViewModel {
  const d = hotel.data;
  const checkInDate = new Date(d.check_in + 'T00:00:00');
  const checkOutDate = new Date(d.check_out + 'T00:00:00');
  const ms = checkOutDate.getTime() - checkInDate.getTime();
  const nights = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));

  let priceDisplay: string | null = null;
  if (d.total_price != null && d.currency) {
    priceDisplay = formatCurrency(d.total_price, d.currency);
  } else if (d.price_per_night != null && d.currency) {
    priceDisplay = `${formatCurrency(d.price_per_night, d.currency)}/night`;
  }

  return {
    id: hotel.id,
    name: d.name,
    address: d.address,
    checkIn: d.check_in,
    checkOut: d.check_out,
    checkInDisplay: formatShortDate(d.check_in),
    checkOutDisplay: formatShortDate(d.check_out),
    nights,
    nightsLabel: nights === 1 ? '1 night' : `${nights} nights`,
    priceDisplay,
    price: d.total_price ?? (d.price_per_night != null ? d.price_per_night : null),
    priceCurrency: (d.total_price != null || d.price_per_night != null) ? d.currency ?? null : null,
    rating: d.rating,
    starRating: d.star_rating,
    imageUrl: d.image_url,
    bookingRef: d.booking_ref,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
  };
}

// ─── Car rental view model ──────────────────────────────────────

export interface CarViewModel {
  id: string;
  company: string;
  model: string | null;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  pickupDisplay: string | null;
  dropoffDisplay: string | null;
  pickupAt: string | null;
  dropoffAt: string | null;
  priceDisplay: string | null;
  price: number | null;
  priceCurrency: string | null;
  bookingRef: string | null;
  imageUrl: string | null;
}

export function buildCarViewModel(car: Car): CarViewModel {
  const d = car.data;
  return {
    id: car.id,
    company: d.company,
    model: d.model,
    pickupLocation: d.pickup_location,
    dropoffLocation: d.dropoff_location,
    pickupDisplay: formatDatetime(d.pickup_at),
    dropoffDisplay: formatDatetime(d.dropoff_at),
    pickupAt: d.pickup_at,
    dropoffAt: d.dropoff_at,
    priceDisplay: d.price != null && d.currency ? formatCurrency(d.price, d.currency) : null,
    price: d.price ?? null,
    priceCurrency: d.price != null ? d.currency ?? null : null,
    bookingRef: d.booking_ref,
    imageUrl: d.image_url,
  };
}
