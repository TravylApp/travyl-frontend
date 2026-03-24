import type { Activity } from '../types'
import type { CalendarActivity } from '../types'

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

const DEFAULT_ACTIVITY_COLOR = '#6b7280'

export function getActivityColor(type: string): string {
  return ACTIVITY_COLORS[type] ?? DEFAULT_ACTIVITY_COLOR
}

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

const DEFAULT_ACTIVITY_COLOR_DARK_BG = '#374151'
const DEFAULT_ACTIVITY_COLOR_DARK_BORDER = '#9ca3af'

export function getActivityColorDark(type: string): string {
  return ACTIVITY_COLORS_DARK_BG[type] ?? DEFAULT_ACTIVITY_COLOR_DARK_BG
}

export function getActivityColorDarkBorder(type: string): string {
  return ACTIVITY_COLORS_DARK_BORDER[type] ?? DEFAULT_ACTIVITY_COLOR_DARK_BORDER
}

function parseTimeToHours(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

function hoursToTimeString(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

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

export interface TimeRange {
  startHour: number
  endHour: number
}

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
