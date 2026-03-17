import { useState, useCallback } from 'react'
import type { ViewMode } from '../types'

interface UseCalendarNavigationReturn {
  viewMode: ViewMode
  selectedDayIndex: number
  selectedEventId: string | null
  setViewMode: (mode: ViewMode) => void
  selectDay: (dayIndex: number) => void
  selectEvent: (eventId: string | null) => void
  /** Switch to day view for the given day index. */
  goToDayView: (dayIndex: number) => void
  /** Return to week view, keeping the current day selection. */
  goToWeekView: () => void
}

export function useCalendarNavigation(): UseCalendarNavigationReturn {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const selectDay = useCallback((dayIndex: number) => {
    setSelectedDayIndex(dayIndex)
  }, [])

  const selectEvent = useCallback((eventId: string | null) => {
    setSelectedEventId(eventId)
  }, [])

  const goToDayView = useCallback((dayIndex: number) => {
    setSelectedDayIndex(dayIndex)
    setViewMode('day')
  }, [])

  const goToWeekView = useCallback(() => {
    setViewMode('week')
  }, [])

  return {
    viewMode,
    selectedDayIndex,
    selectedEventId,
    setViewMode,
    selectDay,
    selectEvent,
    goToDayView,
    goToWeekView,
  }
}
