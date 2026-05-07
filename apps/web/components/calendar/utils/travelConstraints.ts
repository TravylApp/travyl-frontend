/**
 * Travel constraint utilities — compute blocked time ranges for flight/transport
 * activities that consume buffer time (boarding, pickup, drop-off).
 */

export interface BlockedRange {
  startHour: number
  endHour: number
  type: 'flight-buffer' | 'flight' | 'transport-buffer' | 'transport'
  label: string
}

// Buffer in hours before an activity type becomes unavailable
const TRAVEL_BUFFERS: Record<string, { before: number; after: number }> = {
  flight:    { before: 2,  after: 0.5 },
  transport: { before: 0.5, after: 0.25 },
}

/**
 * Given a list of activities for a single day, compute all blocked time ranges.
 * Only flight and transport activities generate constraints.
 */
export function computeBlockedRanges(
  activities: { type: string; startHour: number; duration: number; title: string }[],
  timeRange: { startHour: number; endHour: number },
): BlockedRange[] {
  const ranges: BlockedRange[] = []

  for (const act of activities) {
    const actType = act.type.toLowerCase()
    const buffer = TRAVEL_BUFFERS[actType]
    if (!buffer) continue

    const actEnd = act.startHour + act.duration

    // Pre-activity buffer
    const bufferStart = Math.max(timeRange.startHour, act.startHour - buffer.before)
    const bufferEnd = act.startHour
    if (bufferEnd > bufferStart) {
      ranges.push({
        startHour: bufferStart,
        endHour: bufferEnd,
        type: actType === 'flight' ? 'flight-buffer' : 'transport-buffer',
        label: actType === 'flight'
          ? `Boarding prep${act.title ? ` — ${act.title}` : ''}`
          : `Pickup prep${act.title ? ` — ${act.title}` : ''}`,
      })
    }

    // Activity itself
    ranges.push({
      startHour: act.startHour,
      endHour: actEnd,
      type: actType === 'flight' ? 'flight' : 'transport',
      label: act.title,
    })

    // Post-activity buffer
    const postEnd = Math.min(timeRange.endHour, actEnd + buffer.after)
    if (postEnd > actEnd) {
      ranges.push({
        startHour: actEnd,
        endHour: postEnd,
        type: actType === 'flight' ? 'flight-buffer' : 'transport-buffer',
        label: actType === 'flight'
          ? 'Deplaning'
          : 'Drop-off',
      })
    }
  }

  return ranges
}
