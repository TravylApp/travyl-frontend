/**
 * @module rescoper
 * Calendar rescoping utilities — logic for moving activities between days when
 * a trip's start date, end date, or duration changes.
 *
 * Rescoping can produce four operation types:
 * - `"shrink"` — the trip is getting shorter; some activities may fall outside the new range
 * - `"expand"` — the trip is getting longer; no conflicts, but the calendar needs more columns
 * - `"shift"` — same duration, different start date; all day-offsets remain valid
 * - `"metadata-only"` — no date changes; no activity mutations needed
 *
 * Used by the trip date-edit modal and the `useRescoper` hook.
 */

import { differenceInCalendarDays } from 'date-fns'
import type { CalendarActivity } from '../types'

/**
 * The type of rescope operation inferred from comparing old and new trip dates.
 * Determines which mutation strategy the rescoper applies.
 */
export type RescoperOperation = 'metadata-only' | 'expand' | 'shift' | 'shrink'

/**
 * Computes the number of calendar days covered by a trip date range (exclusive of start).
 * Uses `date-fns` `differenceInCalendarDays` to correctly handle DST transitions.
 *
 * @param startDate - Trip start date (inclusive)
 * @param endDate - Trip end date (exclusive)
 * @returns Number of calendar days in the trip
 * @example computeNewTotalDays(new Date("2024-06-01"), new Date("2024-06-05")) // → 4
 */
export function computeNewTotalDays(startDate: Date, endDate: Date): number {
  return differenceInCalendarDays(endDate, startDate)
}

/**
 * Determines which rescope operation type applies when a trip's dates change.
 * Precedence: Shrink → Expand → Shift → Metadata-only.
 *
 * @param oldStart - Previous trip start date
 * @param oldEnd - Previous trip end date
 * @param newStart - New trip start date
 * @param newEnd - New trip end date
 * @returns The {@link RescoperOperation} that best describes the change
 * @example
 * detectOperation(
 *   new Date("2024-06-01"), new Date("2024-06-05"),
 *   new Date("2024-06-01"), new Date("2024-06-03"),
 * ) // → "shrink"
 */
export function detectOperation(
  oldStart: Date,
  oldEnd: Date,
  newStart: Date,
  newEnd: Date,
): RescoperOperation {
  const oldDays = computeNewTotalDays(oldStart, oldEnd)
  const newDays = computeNewTotalDays(newStart, newEnd)

  if (newDays < oldDays) return 'shrink'
  if (newDays > oldDays) return 'expand'
  if (newStart.getTime() !== oldStart.getTime()) return 'shift'
  return 'metadata-only'
}

/**
 * Returns all activities that fall outside the new trip length after a shrink.
 * An activity conflicts if its end day (or start day for single-day activities)
 * is ≥ `newTotalDays`.
 *
 * @param activities - All activities currently on the calendar
 * @param newTotalDays - The new trip length in days
 * @returns Array of activities that will fall outside the new date range
 * @example
 * getConflictingActivities(
 *   [{ day: 3, endDay: 4, ... }],
 *   4
 * ) // → [{ day: 3, endDay: 4, ... }]  (endDay 4 is not in [0, 4))
 */
export function getConflictingActivities(
  activities: CalendarActivity[],
  newTotalDays: number,
): CalendarActivity[] {
  return activities.filter(
    (a) => (a.endDay ?? a.day) >= newTotalDays,
  )
}
