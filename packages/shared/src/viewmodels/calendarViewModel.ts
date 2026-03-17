import type { Activity } from '../types'
import type { CalendarActivity } from '../types'

const ACTIVITY_COLORS: Record<string, string> = {
  sightseeing: '#4a7dff',
  dining:      '#e67e22',
  tour:        '#1abc9c',
  cultural:    '#9b59b6',
  shopping:    '#e74c3c',
  nightlife:   '#8e44ad',
  outdoor:     '#2ecc71',
  museum:      '#f39c12',
  transport:   '#3498db',
  hotel:       '#6c7b8a',
}

const DEFAULT_ACTIVITY_COLOR = '#6b7b9e'

export function getActivityColor(type: string): string {
  return ACTIVITY_COLORS[type] ?? DEFAULT_ACTIVITY_COLOR
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
