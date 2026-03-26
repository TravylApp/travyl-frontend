import type { CalendarActivity } from './types'

export function formatHour12(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export function formatTimeRange(activity: Pick<CalendarActivity, 'startHour' | 'duration'>): string {
  return `${formatHour12(activity.startHour)} – ${formatHour12(activity.startHour + activity.duration)}`
}

export function formatHourGutter(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}
