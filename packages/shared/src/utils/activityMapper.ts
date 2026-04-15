import { getActivityColor } from '../viewmodels/calendarViewModel'
import type { CalendarActivity, ActivityData } from '../types'

// ─── Time Constants ─────────────────────────────────────────
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MS_PER_SECOND = 1000
const MS_PER_MINUTE = MS_PER_SECOND * MINUTES_PER_HOUR
const MS_PER_HOUR = MS_PER_MINUTE * MINUTES_PER_HOUR
const MS_PER_DAY = MS_PER_HOUR * HOURS_PER_DAY
const ISO_DATE_LENGTH = 10
const TIME_PAD_LENGTH = 2

// ─── Time utilities ─────────────────────────────────────────

/** "14:30" → 14.5 */
export function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + m / MINUTES_PER_HOUR
}

/** 14.5 → "14:30" */
export function hourToTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * MINUTES_PER_HOUR)
  return `${String(h).padStart(TIME_PAD_LENGTH, '0')}:${String(m).padStart(TIME_PAD_LENGTH, '0')}`
}

/** Clamp a time string so it never exceeds "23:59" (DB constraint). */
export function clampTime(time: string): string {
  const [h] = time.split(':').map(Number)
  if (h >= HOURS_PER_DAY) return '23:59'
  return time
}

/** Hours between two time strings */
export function hoursBetween(start: string, end: string): number {
  return parseTime(end) - parseTime(start)
}

// ─── Date utilities ─────────────────────────────────────────

/** Days between two ISO date strings */
export function daysBetween(start: string, end: string): number {
  const a = new Date(start + 'T00:00:00Z')
  const b = new Date(end + 'T00:00:00Z')
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY)
}

/** Add days to an ISO date string */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, ISO_DATE_LENGTH)
}

// ─── DB type mapping ─────────────────────────────────────────

const DB_TYPE_MAP: Record<string, string> = {
  hotel: 'hotel', airport: 'airport', flight: 'airport', transport: 'airport',
  food: 'food', dining: 'food', cafe: 'food',
  nature: 'nature', hiking: 'nature', beach: 'nature',
  'amusement park': 'amusement park', 'theme park': 'amusement park',
}

export function mapToDbType(frontendType: string): string {
  return DB_TYPE_MAP[frontendType] ?? 'other'
}

// ─── Activity row type ───────────────────────────────────────

export interface ActivityRow {
  id: string
  trip_id: string
  user_id: string
  activity_name: string
  starting_date: string
  ending_date: string
  starting_time: string
  ending_time: string
  activity_type: string
  estimated_cost: number
  latitude: number
  longitude: number
  currency: string | null
  notes: string | null
  sort_order: number
  activity_data: ActivityData
  created_at: string
  updated_at: string
}

// ─── Mapper functions ────────────────────────────────────────

export function toCalendarActivity(row: ActivityRow, tripStartDate: string): CalendarActivity {
  const type = row.activity_data?.category ?? row.activity_type
  return {
    id: row.id,
    title: row.activity_name,
    type,
    day: daysBetween(tripStartDate, row.starting_date),
    endDay: daysBetween(tripStartDate, row.ending_date),
    startHour: parseTime(row.starting_time),
    duration: hoursBetween(row.starting_time, row.ending_time),
    location: row.activity_data?.location_name,
    image: row.activity_data?.image_url,
    rating: row.activity_data?.rating,
    price: row.estimated_cost?.toString(),
    notes: row.notes ?? undefined,
    color: getActivityColor(type),
    latitude: row.latitude,
    longitude: row.longitude,
    sortOrder: row.sort_order,
    pollResult: row.activity_data?.pollResult,
    unscheduled: row.activity_data?.unscheduled ?? false,
    flightNumber: row.activity_data?.flight_number,
    airline: row.activity_data?.airline,
    checkIn: row.activity_data?.check_in,
    checkOut: row.activity_data?.check_out,
    bookingRef: row.activity_data?.booking_ref,
  }
}

export function toActivityRow(
  cal: CalendarActivity, tripId: string, userId: string, tripStartDate: string,
): Omit<ActivityRow, 'created_at' | 'updated_at'> {
  return {
    id: cal.id,
    trip_id: tripId,
    user_id: userId,
    activity_name: cal.title,
    activity_type: mapToDbType(cal.type),
    starting_date: addDays(tripStartDate, cal.day),
    ending_date: addDays(tripStartDate, cal.endDay ?? cal.day),
    starting_time: clampTime(hourToTime(cal.startHour)),
    ending_time: clampTime(hourToTime(cal.startHour + cal.duration)),
    estimated_cost: parseFloat(cal.price ?? '0') || 0,
    latitude: cal.latitude ?? 0,
    longitude: cal.longitude ?? 0,
    currency: null,
    notes: cal.notes ?? null,
    sort_order: cal.sortOrder ?? 0,
    activity_data: {
      category: cal.type,
      location_name: cal.location,
      image_url: cal.image,
      rating: cal.rating,
      pollResult: cal.pollResult,
      flight_number: cal.flightNumber,
      airline: cal.airline,
      check_in: cal.checkIn,
      check_out: cal.checkOut,
      booking_ref: cal.bookingRef,
      ...(cal.unscheduled !== undefined && { unscheduled: cal.unscheduled }),
    },
  }
}
