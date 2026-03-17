import type { ItineraryDayWithActivities, Activity, Flight, Hotel } from '../types';
import { formatCurrency } from '../utils';

// ─── Time helpers ──────────────────────────────────────────────

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'latenight';

function getTimeOfDay(time: string | null): TimeOfDay {
  if (!time) return 'morning';
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'latenight';
}

function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Activity view model ───────────────────────────────────────

export interface ActivityViewModel {
  id: string;
  name: string;
  category: string;
  locationName: string | null;
  startTime: string | null;
  endTime: string | null;
  timeDisplay: string | null;
  costDisplay: string | null;
  bookingUrl: string | null;
  notes: string | null;
  source: Activity['source'];
  timeOfDay: TimeOfDay;
}

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
    bookingUrl: activity.booking_url,
    notes: activity.notes,
    source: activity.source,
    timeOfDay: getTimeOfDay(activity.start_time),
  };
}

// ─── Time group ────────────────────────────────────────────────

export interface TimeGroup {
  timeOfDay: TimeOfDay;
  activities: ActivityViewModel[];
}

// ─── Day view model ────────────────────────────────────────────

export interface ItineraryDayViewModel {
  id: string;
  dayNumber: number;
  dayLabel: string;
  dateLabel: string;
  theme: string | null;
  notes: string | null;
  timeGroups: TimeGroup[];
  activityCount: number;
}

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

export interface FlightViewModel {
  id: string;
  airline: string;
  flightNumber: string | null;
  route: string;
  originIata: string;
  destIata: string;
  originName: string | null;
  destName: string | null;
  departureDisplay: string | null;
  arrivalDisplay: string | null;
  priceDisplay: string | null;
  cabinClass: string | null;
  bookingRef: string | null;
}

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

export function buildFlightViewModel(flight: Flight): FlightViewModel {
  const d = flight.data;
  return {
    id: flight.id,
    airline: d.airline,
    flightNumber: d.flight_number,
    route: `${d.origin_iata} → ${d.dest_iata}`,
    originIata: d.origin_iata,
    destIata: d.dest_iata,
    originName: d.origin_name,
    destName: d.dest_name,
    departureDisplay: formatDatetime(d.departure_at),
    arrivalDisplay: formatDatetime(d.arrival_at),
    priceDisplay: d.price != null && d.currency ? formatCurrency(d.price, d.currency) : null,
    cabinClass: d.cabin_class,
    bookingRef: d.booking_ref,
  };
}

// ─── Hotel view model ──────────────────────────────────────────

export interface HotelViewModel {
  id: string;
  name: string;
  address: string | null;
  checkIn: string;
  checkOut: string;
  checkInDisplay: string;
  checkOutDisplay: string;
  nights: number;
  nightsLabel: string;
  priceDisplay: string | null;
  rating: number | null;
  starRating: number | null;
  imageUrl: string | null;
  bookingRef: string | null;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
    rating: d.rating,
    starRating: d.star_rating,
    imageUrl: d.image_url,
    bookingRef: d.booking_ref,
  };
}
