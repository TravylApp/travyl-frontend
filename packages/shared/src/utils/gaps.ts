/**
 * Represents a free time slot (gap) in a day's schedule.
 */
export interface TimeGap {
  /** Start of the gap in fractional hours (e.g. 9.5 = 9:30 AM) */
  startHour: number
  /** Duration of the gap in fractional hours */
  durationHours: number
}

const DAY_START = 8   // 8 AM — earliest meaningful slot
const DAY_END = 22    // 10 PM — latest meaningful slot
const MIN_GAP = 0.75  // 45 minutes minimum to be worth suggesting

/**
 * Computes free time gaps in a day's schedule.
 *
 * @param activities - Scheduled activities for the day, each with startHour and duration.
 * @returns An array of free time slots that are at least MIN_GAP hours long,
 *          bounded to the window [DAY_START, DAY_END].
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
