export interface Gap {
  startHour: number
  endHour: number
  durationHours: number
}

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
