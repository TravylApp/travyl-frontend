/**
 * @module gaps
 * Gap detection helpers for the calendar's free-time suggestion system.
 * Detects free time slots by merging overlapping activity blocks and finding
 * windows ≥ 45 minutes within the meaningful day window (8 AM – 10 PM).
 *
 * This module is distinct from `gapCompute.ts`: it merges overlapping activities
 * before gap detection and uses a minimum threshold of 45 minutes. Used by the
 * AI suggestion engine to identify slots worth recommending.
 */

/**
 * Represents a free time slot (gap) in a day's schedule.
 */
export interface TimeGap {
  /** Start of the gap in fractional hours (e.g. 9.5 = 9:30 AM) */
  startHour: number
  /** Duration of the gap in fractional hours */
  durationHours: number
}

/** Earliest hour considered part of the meaningful day (8 AM) */
const DAY_START = 8
/** Latest hour considered part of the meaningful day (10 PM) */
const DAY_END = 22
/** Minimum gap duration in hours to be worth suggesting (45 minutes) */
const MIN_GAP = 0.75

/**
 * Computes free time gaps in a day's schedule by merging overlapping activity
 * blocks and finding windows within [DAY_START, DAY_END].
 *
 * Algorithm:
 * 1. Sort activities by start time.
 * 2. Merge overlapping or adjacent blocks into contiguous spans.
 * 3. Enumerate gaps between merged spans (clipped to the day window).
 * 4. Return only gaps ≥ MIN_GAP (45 minutes).
 *
 * If there are no activities, the entire day window is returned as one gap.
 *
 * @param activities - Scheduled activities for the day, each with `startHour` and `duration`
 * @returns Array of free {@link TimeGap} slots that are at least 45 minutes long,
 *          bounded to the window [DAY_START, DAY_END]
 * @example
 * computeGaps([{ startHour: 9, duration: 2 }, { startHour: 10, duration: 3 }])
 * // overlapping blocks merged → busy 9–12, gap 8–9 and 12–22
 */
export function computeGaps(
  activities: Array<{ startHour: number; duration: number }>,
): TimeGap[] {
  if (activities.length === 0) {
    return [{ startHour: DAY_START, durationHours: DAY_END - DAY_START }]
  }

  // Sort by start time
  const sorted = [...activities].sort((a, b) => a.startHour - b.startHour)

  // Merge overlapping/adjacent blocks
  const merged: Array<{ start: number; end: number }> = []
  for (const act of sorted) {
    const start = act.startHour
    const end = act.startHour + act.duration
    if (merged.length === 0 || start > merged[merged.length - 1].end) {
      merged.push({ start, end })
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, end)
    }
  }

  // Find gaps between DAY_START and DAY_END
  const gaps: TimeGap[] = []
  let cursor = DAY_START

  for (const block of merged) {
    const blockStart = Math.max(block.start, DAY_START)
    const blockEnd = Math.min(block.end, DAY_END)

    if (blockStart > cursor) {
      const duration = blockStart - cursor
      if (duration >= MIN_GAP) {
        gaps.push({ startHour: cursor, durationHours: duration })
      }
    }
    if (blockEnd > cursor) cursor = blockEnd
  }

  // Gap after last block
  if (cursor < DAY_END) {
    const duration = DAY_END - cursor
    if (duration >= MIN_GAP) {
      gaps.push({ startHour: cursor, durationHours: duration })
    }
  }

  return gaps
}
