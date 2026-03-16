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
