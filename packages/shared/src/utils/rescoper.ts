import { differenceInCalendarDays } from 'date-fns'
import type { CalendarActivity } from '../types'

export type RescoperOperation = 'metadata-only' | 'expand' | 'shift' | 'shrink'

/**
 * Number of calendar days in the trip (end exclusive of start).
 * Uses date-fns to handle DST transitions correctly.
 */
export function computeNewTotalDays(startDate: Date, endDate: Date): number {
  return differenceInCalendarDays(endDate, startDate)
}

/**
 * Determine which operation type applies when rescoping a trip.
 * Precedence: Shrink → Expand → Shift → Metadata-only.
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
 * Return activities that fall outside [0, newTotalDays).
 * Uses endDay when present (multi-day activities).
 */
export function getConflictingActivities(
  activities: CalendarActivity[],
  newTotalDays: number,
): CalendarActivity[] {
  return activities.filter(
    (a) => (a.endDay ?? a.day) >= newTotalDays,
  )
}
