export type { CalendarActivity, ViewMode, UserAwareness } from '@travyl/shared/types'
export type { SuggestionCard } from '@travyl/shared/types'
export type { RecommendationSection } from '@travyl/shared/types'
export type { TimeRange } from '@travyl/shared/viewmodels/calendarViewModel'

export interface Command {
  id: string
  label: string
  group: 'edit' | 'activity' | 'view' | 'insert'
  shortcut?: {
    key: string
    meta?: boolean   // Ctrl / Cmd
    shift?: boolean
    display: string  // e.g. "Ctrl D", "↑", "Del"
  }
  isEnabled: boolean
  execute: () => void
}

export interface LocalEvent {
  id: string
  name: string
  category: 'music' | 'sports' | 'arts' | 'family' | 'festival' | 'other'
  date: string
  startTime: string
  endTime?: string
  venueName: string
  venueAddress?: string
  imageUrl?: string
  ticketUrl?: string
  priceMin?: number
  priceMax?: number
  currency?: string
}
