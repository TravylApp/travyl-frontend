interface HoursEntry {
  day: string // e.g. 'Monday'
  opens: string // e.g. '09:00'
  closes: string
}

/** Returns true if the activity time falls outside any matching opening hours entry */
export function hasHoursConflict(
  openingHours: HoursEntry[] | null,
  dayOfWeek: string, // e.g. 'Monday'
  startTime: string, // e.g. '17:30' (HH:MM)
  endTime: string,
): boolean {
  if (!openingHours) return false
  const entry = openingHours.find((h) => h.day === dayOfWeek)
  if (!entry) return false
  return startTime < entry.opens || endTime > entry.closes
}

/** Returns true if gap < required travel time */
export function hasTravelTimeConflict(
  prevEndTime: string | null, // 'HH:MM'
  activityStartTime: string,
  travelTimeMinutes: number | null,
): boolean {
  if (!prevEndTime || travelTimeMinutes === null) return false
  const [ph, pm] = prevEndTime.split(':').map(Number)
  const [sh, sm] = activityStartTime.split(':').map(Number)
  const gapMinutes = (sh * 60 + sm) - (ph * 60 + pm)
  return gapMinutes < travelTimeMinutes
}
