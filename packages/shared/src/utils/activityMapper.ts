/**
 * @module activityMapper
 * Converts between CalendarActivity (Yjs/UI format) and the Supabase `activity`
 * table row format. Also provides time/date arithmetic helpers used throughout
 * the calendar system (useYjsSync, useActivityMutations, rescoper).
 */

import { getActivityColor } from '../viewmodels/calendarViewModel'
import type { CalendarActivity, ActivityData } from '../types'

// ─── Time utilities ─────────────────────────────────────────

/**
 * Parses a "HH:MM" time string into a fractional hour number.
 * @param time - Time string in "HH:MM" format (e.g. "14:30")
 * @returns Fractional hours (e.g. 14.5 for "14:30")
 * @example parseTime("14:30") // → 14.5
 */
export function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

/**
 * Converts a fractional hour number back to "HH:MM" format.
 * @param hours - Fractional hours (e.g. 14.5)
 * @returns Time string in "HH:MM" format (e.g. "14:30")
 * @example hourToTime(14.5) // → "14:30"
 */
export function hourToTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Clamps a time string so it never exceeds "23:59", satisfying the DB constraint.
 * @param time - Time string in "HH:MM" format
 * @returns The original time, or "23:59" if the hour is 24 or above
 * @example clampTime("24:00") // → "23:59"
 */
export function clampTime(time: string): string {
  const [h] = time.split(':').map(Number)
  if (h >= 24) return '23:59'
  return time
}

/**
 * Calculates the number of fractional hours between two time strings.
 * @param start - Start time in "HH:MM" format
 * @param end - End time in "HH:MM" format
 * @returns Duration in fractional hours
 * @example hoursBetween("09:00", "10:30") // → 1.5
 */
export function hoursBetween(start: string, end: string): number {
  return parseTime(end) - parseTime(start)
}

// ─── Date utilities ─────────────────────────────────────────

/**
 * Calculates the number of whole calendar days between two ISO date strings.
 * Uses UTC midnight to avoid DST issues.
 * @param start - ISO date string (e.g. "2024-06-01")
 * @param end - ISO date string (e.g. "2024-06-05")
 * @returns Number of days (positive if end is after start)
 * @example daysBetween("2024-06-01", "2024-06-05") // → 4
 */
export function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0
  const a = new Date(start + 'T00:00:00Z')
  const b = new Date(end + 'T00:00:00Z')
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Adds a number of days to an ISO date string, returning a new ISO date string.
 * Operates in UTC to avoid DST boundary issues.
 * @param dateStr - Base ISO date string (e.g. "2024-06-01")
 * @param days - Number of days to add (may be negative)
 * @returns New ISO date string (e.g. "2024-06-06")
 * @example addDays("2024-06-01", 5) // → "2024-06-06"
 */
export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '1970-01-01'
  const d = new Date(dateStr + 'T00:00:00Z')
  if (isNaN(d.getTime())) return dateStr || '1970-01-01'
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── DB type mapping ─────────────────────────────────────────

/**
 * Maps frontend activity type strings to the canonical DB enum values.
 * Handles synonyms (e.g. "flight" → "airport", "dining" → "food").
 */
const DB_TYPE_MAP: Record<string, string> = {
  hotel: 'hotel', airport: 'airport', flight: 'airport', transport: 'airport',
  food: 'food', dining: 'food', cafe: 'food',
  nature: 'nature', hiking: 'nature', beach: 'nature',
  'amusement park': 'amusement park', 'theme park': 'amusement park',
}

/**
 * Converts a frontend activity type string to its canonical Supabase DB type.
 * Falls back to `"other"` for unknown types.
 * @param frontendType - Frontend category string (e.g. "dining", "flight")
 * @returns Canonical DB activity type (e.g. "food", "airport", "other")
 * @example mapToDbType("dining") // → "food"
 * @example mapToDbType("hiking") // → "nature"
 */
export function mapToDbType(frontendType: string): string {
  return DB_TYPE_MAP[frontendType] ?? 'other'
}

// ─── Activity row type ───────────────────────────────────────

/**
 * Shape of a row in the Supabase `activity` table.
 * Used as the source/target format for all DB reads and writes.
 */
export interface ActivityRow {
  /** UUID primary key */
  id: string
  /** FK to the parent trip */
  trip_id: string
  /** FK to the owning user */
  user_id: string
  /** Human-readable name of the activity */
  activity_name: string
  /** ISO date the activity starts (e.g. "2024-06-01") */
  starting_date: string
  /** ISO date the activity ends — same as starting_date for single-day activities */
  ending_date: string
  /** Wall-clock start time in "HH:MM" format */
  starting_time: string
  /** Wall-clock end time in "HH:MM" format */
  ending_time: string
  /** Canonical DB activity type (see DB_TYPE_MAP) */
  activity_type: string
  /** Estimated cost in the trip's currency */
  estimated_cost: number
  /** WGS-84 latitude */
  latitude: number
  /** WGS-84 longitude */
  longitude: number
  /** Currency code override (null = use trip currency) */
  currency: string | null
  /** Optional free-text notes */
  notes: string | null
  /** Integer used for manual reordering within a day */
  sort_order: number
  /** Semi-structured JSONB blob for extra activity metadata */
  activity_data: ActivityData
  /** ISO timestamp of creation */
  created_at: string
  /** ISO timestamp of last update */
  updated_at: string
}

// ─── Mapper functions ────────────────────────────────────────

/**
 * Converts a Supabase `activity` row into a `CalendarActivity` for the calendar UI.
 * Computes `day` and `endDay` as offsets from `tripStartDate`, and parses time
 * strings into fractional hours.
 *
 * @param row - Raw row from the Supabase `activity` table
 * @param tripStartDate - ISO date of the trip's first day (e.g. "2024-06-01")
 * @returns CalendarActivity ready for Yjs/calendar rendering
 */
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

/**
 * Converts a `CalendarActivity` back into a Supabase `activity` row shape
 * (excluding `created_at` / `updated_at` which the DB manages).
 * Converts fractional hours → "HH:MM" strings, and day offsets → ISO dates.
 *
 * @param cal - CalendarActivity from the Yjs/UI layer
 * @param tripId - UUID of the parent trip
 * @param userId - UUID of the owning user
 * @param tripStartDate - ISO date of the trip's first day (e.g. "2024-06-01")
 * @returns Partial ActivityRow ready for Supabase insert/upsert
 */
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
