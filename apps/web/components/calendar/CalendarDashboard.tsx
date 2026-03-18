'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'motion/react'
import {
  MOCK_FLIGHTS,
  MOCK_HOTELS,
} from '@travyl/shared/config/mockItineraryData'
import { computeTimeRange } from '@travyl/shared/viewmodels/calendarViewModel'
import { HOUR_HEIGHT } from './constants'
import { useCalendarDnd } from './hooks/useCalendarDnd'
import { useTripActivities } from './hooks/useTripActivities'
import { useYjsSync } from './hooks/useYjsSync'
import { useActivityMutations } from './hooks/useActivityMutations'
import { useCollaboratorPresence } from './hooks/useCollaboratorPresence'
import { useCalendarNavigation } from './hooks/useCalendarNavigation'
import { useInteractionTracking } from './hooks/useInteractionTracking'
import { TripSidebar } from './TripSidebar'
import { CalendarHeader } from './CalendarHeader'
import { AllDayRow } from './AllDayRow'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { DetailPanel } from './DetailPanel'
import { ForYouPanel } from './ForYouPanel'
import { CalendarSkeleton } from './CalendarSkeleton'
import { CalendarError } from './CalendarError'
import type { FlightBanner, HotelBanner } from './AllDayRow'
import type { CalendarActivity } from './types'
import { useCalendarTheme } from './hooks/useCalendarTheme'
import { CalendarThemeContext } from './CalendarThemeContext'

// ─── Component ───────────────────────────────────────────────

interface CalendarDashboardProps {
  tripId: string
  userId: string
  userName: string
}

export function CalendarDashboard({ tripId, userId, userName }: CalendarDashboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeNav, setActiveNav] = useState('calendar')

  // Hooks
  const { trip, tripStartDate, loading: tripLoading, error: tripError } = useTripActivities(tripId)
  const { activities, connectionStatus, isLoading: syncLoading, error: syncError } = useYjsSync(tripId, tripStartDate, userId)
  const { addActivity, updateActivity, moveActivity, removeActivity } = useActivityMutations(tripId, tripStartDate, userId)
  const { collaborators, setSelectedEvent: setPresenceSelectedEvent, setCurrentView, setSelectedDay } = useCollaboratorPresence({ tripId, userId, userName })
  const isLoading = tripLoading || syncLoading
  const error = tripError || syncError

  const {
    viewMode,
    selectedDayIndex,
    selectedEventId,
    setViewMode,
    selectDay,
    selectEvent,
    goToDayView,
    goToWeekView,
  } = useCalendarNavigation()

  const { trackInteraction } = useInteractionTracking(tripId)

  // Computed (moved up so useCalendarDnd can reference timeRange)
  const timeRange = useMemo(() => computeTimeRange(activities), [activities])

  const [droppedSuggestionIds, setDroppedSuggestionIds] = useState<string[]>([])
  const [activityToSuggestion, setActivityToSuggestion] = useState<Map<string, string>>(new Map())

  const handleAddFromSuggestion = useCallback(async (activity: CalendarActivity, suggestionId: string) => {
    await addActivity(activity)
    selectEvent(activity.id)
    setDroppedSuggestionIds((prev) => [...prev, suggestionId])
    setActivityToSuggestion((prev) => new Map(prev).set(activity.id, suggestionId))
    trackInteraction(suggestionId, 'drag')
  }, [addActivity, selectEvent, trackInteraction])

  const { sensors, activeId, handleDragStart, handleDragEnd } = useCalendarDnd({
    onMoveActivity: moveActivity,
    onAddFromSuggestion: handleAddFromSuggestion,
    scrollRef,
    timeRangeStartHour: timeRange.startHour,
  })

  const { theme, toggleTheme } = useCalendarTheme()

  // Sync view mode to presence
  useEffect(() => {
    setCurrentView(viewMode)
  }, [viewMode, setCurrentView])

  // Sync selected day to presence
  useEffect(() => {
    setSelectedDay(selectedDayIndex)
  }, [selectedDayIndex, setSelectedDay])

  // ─── Derive trip structure from fetched trip ────────────────
  const parsedStartDate = trip ? new Date(trip.start_date + 'T00:00:00Z') : new Date()
  const parsedEndDate = trip ? new Date(trip.end_date + 'T00:00:00Z') : new Date()
  const tripTotalDays = trip ? Math.round((parsedEndDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

  const TRIP_DAYS = useMemo(() => Array.from({ length: tripTotalDays }, (_, i) => {
    const date = new Date(parsedStartDate.getTime() + i * 24 * 60 * 60 * 1000)
    return {
      dayIndex: i,
      label: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
    }
  }), [tripTotalDays, parsedStartDate.getTime()])

  // ─── Derive flight banners ────────────────────────────────────
  const FLIGHT_BANNERS: FlightBanner[] = useMemo(() => {
    if (!trip) return []
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    }
    return MOCK_FLIGHTS.map((flight, idx) => {
      const isArrival = flight.destIata !== flight.originIata && idx === 0
      const direction: 'arrival' | 'departure' = isArrival ? 'arrival' : 'departure'

      const displayParts = (flight.departureDisplay ?? '').split(',')
      let dayIndex = 0
      if (displayParts.length >= 2) {
        const datePart = displayParts[1].trim()
        const [monthStr, dayStr] = datePart.split(' ')
        const month = months[monthStr]
        const day = parseInt(dayStr, 10)
        if (month !== undefined && !isNaN(day)) {
          const year = parsedStartDate.getUTCFullYear()
          const flightDate = new Date(Date.UTC(year, month, day))
          const offset = Math.round((flightDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24))
          dayIndex = Math.max(0, Math.min(tripTotalDays - 1, offset))
        }
      }

      return {
        id: flight.id,
        label: `${flight.flightNumber} ${flight.route}`,
        dayIndex,
        direction,
      }
    })
  }, [trip, parsedStartDate.getTime(), tripTotalDays])

  // ─── Derive hotel banners ─────────────────────────────────────
  const HOTEL_BANNERS: HotelBanner[] = useMemo(() => {
    if (!trip) return []
    return MOCK_HOTELS.map((hotel) => {
      const checkInDate = new Date(hotel.checkIn + 'T00:00:00Z')
      const checkOutDate = new Date(hotel.checkOut + 'T00:00:00Z')
      const startDayIndex = Math.max(0, Math.round((checkInDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24)))
      const endDayIndex = Math.max(
        startDayIndex,
        Math.min(tripTotalDays - 1, Math.round((checkOutDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24)) - 1),
      )
      return {
        id: hotel.id,
        label: hotel.name,
        startDayIndex,
        endDayIndex,
      }
    })
  }, [trip, parsedStartDate.getTime(), tripTotalDays])

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedEventId) ?? null,
    [activities, selectedEventId],
  )

  // Auto-scroll to first event on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const firstEvent = activities.reduce(
      (earliest, a) => (a.startHour < earliest ? a.startHour : earliest),
      timeRange.startHour,
    )
    const scrollTop = Math.max(0, (firstEvent - timeRange.startHour - 0.5) * HOUR_HEIGHT)
    scrollRef.current.scrollTop = scrollTop
  }, []) // intentionally run once on mount

  const handleCreateActivity = useCallback((dayIndex: number, startHour: number) => {
    const newActivity: CalendarActivity = {
      id: crypto.randomUUID(),
      title: '',
      type: 'sightseeing',
      day: dayIndex,
      startHour,
      duration: 1,
    }
    addActivity(newActivity)
    selectEvent(newActivity.id)
  }, [addActivity, selectEvent])

  // Early returns for loading / error states (must come after all hooks)
  if (isLoading) return <CalendarSkeleton />
  if (error) return <CalendarError message={error} />

  // Event handlers
  const handleSelectEvent = (id: string) => {
    selectEvent(selectedEventId === id ? null : id)
  }

  const handleCloseDetail = () => selectEvent(null)

  const handleRemoveActivity = (id: string) => {
    removeActivity(id)
    if (selectedEventId === id) selectEvent(null)
    // Restore the suggestion card in the ForYou panel
    const suggestionId = activityToSuggestion.get(id)
    if (suggestionId) {
      setDroppedSuggestionIds((prev) => prev.filter((sid) => sid !== suggestionId))
      setActivityToSuggestion((prev) => { const next = new Map(prev); next.delete(id); return next })
    }
  }

  const handleViewModeChange = (mode: typeof viewMode) => {
    setViewMode(mode)
  }

  const handleBack = () => {
    if (viewMode === 'day') {
      goToWeekView()
    }
    // In week view, back could navigate to trip overview -- no-op for now
  }

  const handleAddEvent = () => {
    // TODO: open add-event modal
  }

  const handleClickDayHeader = (dayIndex: number) => {
    goToDayView(dayIndex)
  }

  /** Format a date range string like "Mar 10 - Mar 16, 2026". */
  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
    const start = startDate.toLocaleDateString('en-US', opts)
    const end = endDate.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
    return `${start} – ${end}`
  }

  const dateRange = formatDateRange(parsedStartDate, parsedEndDate)
  const currentDayLabel =
    viewMode === 'day' ? TRIP_DAYS[selectedDayIndex]?.label ?? '' : ''

  // Days to show (for DayView we pass a single day)
  const visibleDays = viewMode === 'week' ? TRIP_DAYS : [TRIP_DAYS[selectedDayIndex]]

  return (
    <CalendarThemeContext.Provider value={{ isDark: theme === 'dark' }}>
    <div className={'flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0a1520] text-gray-900 dark:text-[#f5efe8]' + (theme === 'dark' ? ' dark' : '')}>
      {/* Sidebar */}
      <TripSidebar
        activeNav={activeNav}
        tripStartDate={parsedStartDate}
        tripDays={tripTotalDays}
        currentDay={selectedDayIndex}
        onSelectDay={(dayIndex) => {
          selectDay(dayIndex)
          if (viewMode === 'day') goToDayView(dayIndex)
        }}
        onNavChange={setActiveNav}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <CalendarHeader
          tripName={trip?.title ?? 'Loading...'}
          dateRange={viewMode === 'day' ? currentDayLabel : dateRange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onBack={handleBack}
          onAddEvent={handleAddEvent}
          connectionStatus={connectionStatus}
          collaborators={collaborators}
          onShare={() => {}}
          theme={theme}
          onToggleTheme={toggleTheme}
          tripDays={TRIP_DAYS}
        />

        {/* All-day row: flight + hotel banners */}
        <AllDayRow
          days={visibleDays}
          flights={FLIGHT_BANNERS}
          hotels={HOTEL_BANNERS}
        />

        {/* Grid area */}
        {activeNav === 'calendar' ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Scrollable grid */}
            <div ref={scrollRef} className="flex flex-1 min-w-0 overflow-auto">
              <AnimatePresence mode="wait" initial={false}>
                {viewMode === 'week' ? (
                  <motion.div
                    key="week"
                    className="flex flex-1 min-w-0"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <WeekView
                      days={TRIP_DAYS}
                      activities={activities}
                      viewers={collaborators}
                      selectedEventId={selectedEventId}
                      timeRange={timeRange}
                      tripStartDate={parsedStartDate}
                      onSelectEvent={handleSelectEvent}
                      onClickDayHeader={handleClickDayHeader}
                      onCreateActivity={handleCreateActivity}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key={`day-${selectedDayIndex}`}
                    className="flex flex-1 min-w-0"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <DayView
                      dayIndex={selectedDayIndex}
                      label={TRIP_DAYS[selectedDayIndex]?.label ?? ''}
                      activities={activities}
                      viewers={collaborators}
                      selectedEventId={selectedEventId}
                      timeRange={timeRange}
                      tripStartDate={parsedStartDate}
                      onSelectEvent={handleSelectEvent}
                      onCreateActivity={handleCreateActivity}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right column: For You panel or Detail panel */}
            {selectedEventId ? (
              <DetailPanel
                activity={selectedActivity}
                viewers={collaborators}
                onClose={handleCloseDetail}
                onRemove={handleRemoveActivity}
                onUpdateActivity={updateActivity}
              />
            ) : (
              <ForYouPanel
                destination={trip?.destination ?? ''}
                scheduledActivityIds={droppedSuggestionIds}
              />
            )}
          </div>

          {/* Drag overlay — shows ghost of dragged item */}
          <DragOverlay dropAnimation={null}>
            {activeId ? (
              <div className="opacity-60 pointer-events-none rounded-lg shadow-2xl" />
            ) : null}
          </DragOverlay>

          {/* Empty state -- only when no activities exist */}
          {activities.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                className="text-gray-600"
                aria-hidden="true"
              >
                <rect
                  x="6"
                  y="8"
                  width="36"
                  height="34"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M16 6V10M32 6V10M6 18H42"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M24 26V34M20 30H28"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-sm text-gray-500">No activities yet — add one to get started</p>
            </div>
          )}
        </DndContext>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 text-sm capitalize">{activeNav} — coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </CalendarThemeContext.Provider>
  )
}
