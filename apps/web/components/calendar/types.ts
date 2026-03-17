export type ViewMode = 'week' | 'day'

export interface CalendarActivity {
  id: string
  title: string
  type: string
  day: number
  startHour: number
  duration: number
  location?: string
  image?: string
  rating?: number
  price?: string
  notes?: string
  /** Formatted time string e.g. "9:00 AM" — used by itinerary view */
  startTime?: string
  /** Formatted time string e.g. "10:00 AM" — used by itinerary view */
  endTime?: string
  /** Whether this activity appears on the calendar grid */
  onCalendar?: boolean
  /** Parent activity id for nested/grouped activities */
  parentId?: string
  /** Optional hex color override */
  color?: string
}

export interface UserAwareness {
  userId: string
  name: string
  avatarInitial: string
  color: string
  isOnline: boolean
  selectedEventId: string | null
  currentView: ViewMode
}

export interface TimeRange {
  startHour: number
  endHour: number
}
