import * as Y from 'yjs'
import type { CalendarActivity } from '../types'

export const CALENDAR_ACTIVITY_KEYS: (keyof CalendarActivity)[] = [
  'id',
  'title',
  'type',
  'day',
  'endDay',
  'startHour',
  'duration',
  'location',
  'image',
  'rating',
  'price',
  'notes',
  'color',
  'latitude',
  'longitude',
  'sortOrder',
  'pollResult',
  'unscheduled',
  'flightNumber',
  'airline',
  'checkIn',
  'checkOut',
  'bookingRef',
]

export function yMapToCalendarActivity(
  id: string,
  yMap: Y.Map<unknown>,
): CalendarActivity {
  const obj: Record<string, unknown> = { id }
  for (const key of CALENDAR_ACTIVITY_KEYS) {
    const val = yMap.get(key)
    if (val !== undefined) obj[key] = val
  }
  return obj as unknown as CalendarActivity
}
