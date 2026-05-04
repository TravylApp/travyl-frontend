/**
 * @module calendarViewModel
 * Calendar presentation logic for the Travyl calendar UI.
 * Provides activity color schemes (light and dark variants), and conversion
 * functions between the DB `Activity` type and the `CalendarActivity` shape
 * used by the Yjs-backed calendar renderer.
 *
 * Also computes the visible time range for a day's set of activities so the
 * calendar scroll position can be initialized sensibly.
 *
 * Used by web CalendarDay, mobile CalendarScreen, and the Yjs sync layer.
 */

import type { Activity } from '../types'
import type { CalendarActivity } from '../types'

/**
 * Map from activity type to its primary fill color (for light backgrounds).
 * Used on calendar event blocks to visually distinguish activity categories.
 */
const ACTIVITY_COLORS: Record<string, string> = {
  sightseeing: '#003594',
  dining:      '#D97706',
  tour:        '#0d9488',
  cultural:    '#7C3AED',
  shopping:    '#dc2626',
  nightlife:   '#9333ea',
  outdoor:     '#059669',
  museum:      '#d97706',
  transport:   '#2563eb',
  hotel:       '#6b7280',
}

/** Fallback color for activity types not in ACTIVITY_COLORS */
const DEFAULT_ACTIVITY_COLOR = '#6b7280'

/**
 * Returns the primary fill color for a given activity type.
 * Defaults to a neutral gray for unknown types.
 *
 * @param type - Activity category string (e.g. "dining", "sightseeing")
 * @returns Hex color string
 * @example getActivityColor("dining") // → "#D97706"
 */
export function getActivityColor(type: string): string {
  return ACTIVITY_COLORS[type] ?? DEFAULT_ACTIVITY_COLOR
}

/**
 * Map from activity type to its dark-background fill color.
 * Used for calendar blocks rendered on dark-mode or dark-themed panels.
 */
const ACTIVITY_COLORS_DARK_BG: Record<string, string> = {
  sightseeing: '#1e3a5f',
  dining:      '#78350f',
  tour:        '#134e4a',
  cultural:    '#4c1d95',
  shopping:    '#7f1d1d',
  nightlife:   '#581c87',
  outdoor:     '#064e3b',
  museum:      '#78350f',
  transport:   '#1e3a5f',
  hotel:       '#374151',
}

/**
 * Map from activity type to its dark-mode border/accent color.
 * Paired with ACTIVITY_COLORS_DARK_BG to give dark blocks a visible outline.
 */
const ACTIVITY_COLORS_DARK_BORDER: Record<string, string> = {
  sightseeing: '#4a7ab5',
  dining:      '#F59E0B',
  tour:        '#14b8a6',
  cultural:    '#8b5cf6',
  shopping:    '#f87171',
  nightlife:   '#a78bfa',
  outdoor:     '#10b981',
  museum:      '#fbbf24',
  transport:   '#60a5fa',
  hotel:       '#9ca3af',
}

/** Fallback dark background color for unknown activity types */
const DEFAULT_ACTIVITY_COLOR_DARK_BG = '#374151'
/** Fallback dark border color for unknown activity types */
const DEFAULT_ACTIVITY_COLOR_DARK_BORDER = '#9ca3af'

/**
 * Returns the dark-background fill color for a given activity type.
 * @param type - Activity category string
 * @returns Hex color string suitable for dark backgrounds
 */
export function getActivityColorDark(type: string): string {
  return ACTIVITY_COLORS_DARK_BG[type] ?? DEFAULT_ACTIVITY_COLOR_DARK_BG
}

/**
 * Returns the dark-mode border/accent color for a given activity type.
 * @param type - Activity category string
 * @returns Hex color string for use as a border or accent on dark backgrounds
 */
export function getActivityColorDarkBorder(type: string): string {
  return ACTIVITY_COLORS_DARK_BORDER[type] ?? DEFAULT_ACTIVITY_COLOR_DARK_BORDER
}

/**
 * Parses a "HH:MM" time string into fractional hours.
 * @param time - Time string (e.g. "14:30")
 * @returns Fractional hours (e.g. 14.5)
 */
function parseTimeToHours(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

/**
 * Converts a fractional hour value back to a "HH:MM" string.
 * @param hours - Fractional hours (e.g. 14.5)
 * @returns "HH:MM" formatted string (e.g. "14:30")
 */
function hoursToTimeString(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Converts a DB `Activity` record into a `CalendarActivity` for the calendar UI.
 * Parses start/end times into fractional hours and computes the duration.
 *
 * @param activity - Raw activity record from the `itinerary_activity` table
 * @param dayIndex - Zero-based day index within the trip (0 = first day)
 * @returns A `CalendarActivity` ready for rendering in the calendar grid
 */
export function activityToCalendarActivity(
  activity: Activity,
  dayIndex: number,
): CalendarActivity {
  const startHour = parseTimeToHours(activity.start_time!)
  const endHour = parseTimeToHours(activity.end_time!)
  return {
    id: activity.id,
    title: activity.name,
    type: activity.category,
    day: dayIndex,
    startHour,
    duration: endHour - startHour,
    location: activity.location_name ?? undefined,
    price: activity.estimated_cost != null ? `$${activity.estimated_cost.toFixed(2)}` : undefined,
    notes: activity.notes ?? undefined,
  }
}

/**
 * Converts a subset of `CalendarActivity` fields back to a partial `Activity`
 * update payload for the Supabase `itinerary_activity` table.
 * Used when a user drags/resizes a calendar event.
 *
 * @param calActivity - The updated CalendarActivity (only timing/text fields are used)
 * @returns Partial Activity update with `name`, `start_time`, `end_time`, and `notes`
 */
export function calendarActivityToUpdate(
  calActivity: Pick<CalendarActivity, 'startHour' | 'duration' | 'title' | 'notes'>,
): Partial<Activity> {
  return {
    name: calActivity.title,
    start_time: hoursToTimeString(calActivity.startHour),
    end_time: hoursToTimeString(calActivity.startHour + calActivity.duration),
    notes: calActivity.notes ?? null,
  }
}

/**
 * The visible hour range for a calendar day, used to set the scroll position
 * and the total rendered height of the day column.
 */
export interface TimeRange {
  /** Earliest hour to render (inclusive), in fractional hours */
  startHour: number
  /** Latest hour to render (inclusive), in fractional hours */
  endHour: number
}

/**
 * Computes the minimum visible time range for a set of activities.
 * Expands outward by 1 hour on each side so activities are not flush against
 * the calendar edges. Falls back to 7 AM – 11 PM for empty days.
 *
 * @param activities - Activities to fit within the time range
 * @returns `TimeRange` with integer `startHour` and `endHour` values
 */
export function computeTimeRange(
  activities: Pick<CalendarActivity, 'startHour' | 'duration'>[],
): TimeRange {
  const DEFAULT_START = 7
  const DEFAULT_END = 23
  if (activities.length === 0) return { startHour: DEFAULT_START, endHour: DEFAULT_END }
  let min = DEFAULT_START
  let max = DEFAULT_END
  for (const a of activities) {
    if (a.startHour < min) min = a.startHour - 1
    const end = a.startHour + a.duration
    if (end > max) max = end + 1
  }
  return { startHour: Math.floor(min), endHour: Math.ceil(max) }
}
