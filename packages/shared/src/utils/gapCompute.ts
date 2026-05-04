/**
 * @module gapCompute
 * Computes free time gaps in a day's activity schedule for the Day Planner feature.
 * A "gap" is a contiguous window of at least 1 hour between scheduled activities,
 * bounded by the configurable day window (default 8 AM–10 PM).
 *
 * This module is distinct from `gaps.ts`: it accepts explicit dayStart/dayEnd
 * parameters and uses a simpler gap-detection algorithm without overlap merging.
 * Used by the AI suggestion sidebar to find available time slots.
 */

/**
 * A free time slot between scheduled activities in a day plan.
 */
export interface Gap {
  /** Start of the gap in fractional hours (e.g. 9.5 = 9:30 AM) */
  startHour: number
  /** End of the gap in fractional hours */
  endHour: number
  /** Length of the gap in fractional hours (endHour - startHour) */
  durationHours: number
}

/**
 * Computes all free time gaps in a day's schedule, bounded by a configurable
 * day window. Gaps shorter than 1 hour are filtered out.
 *
 * Activities are sorted by start time; overlapping activities are treated
 * conservatively — the cursor advances to the end of each activity in sequence.
 *
 * @param activities - Array of scheduled activities, each with a start hour and duration
 * @param dayStart - Earliest hour considered part of the day (default: 8)
 * @param dayEnd - Latest hour considered part of the day (default: 22)
 * @returns Array of free {@link Gap} slots, each at least 1 hour long
 * @example
 * computeGaps([{ startHour: 10, duration: 2 }], 8, 22)
 * // → [{ startHour: 8, endHour: 10, durationHours: 2 },
 * //    { startHour: 12, endHour: 22, durationHours: 10 }]
 */
export function computeGaps(
  activities: Array<{ startHour: number; duration: number }>,
  dayStart = 8,
  dayEnd = 22,
): Gap[] {
  const sorted = [...activities].sort((a, b) => a.startHour - b.startHour)
  const gaps: Gap[] = []
  let cursor = dayStart

  for (const act of sorted) {
    if (act.startHour > cursor) {
      const duration = act.startHour - cursor
      gaps.push({ startHour: cursor, endHour: act.startHour, durationHours: duration })
    }
    cursor = Math.max(cursor, act.startHour + act.duration)
  }

  if (cursor < dayEnd) {
    gaps.push({ startHour: cursor, endHour: dayEnd, durationHours: dayEnd - cursor })
  }

  return gaps.filter((g) => g.durationHours >= 1)
}
