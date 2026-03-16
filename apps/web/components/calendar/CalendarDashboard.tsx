'use client'

import { useRef, useEffect, useMemo } from 'react'
import { DndContext } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'motion/react'
import {
  MOCK_TRIP,
  MOCK_FLIGHTS,
  MOCK_HOTELS,
} from '@travyl/shared/config/mockItineraryData'
import { computeTimeRange } from '@travyl/shared/viewmodels/calendarViewModel'
import { HOUR_HEIGHT } from './constants'
import { useCalendarDnd } from './hooks/useCalendarDnd'
import { useYjsSync } from './hooks/useYjsSync'
import { useCollaboratorPresence } from './hooks/useCollaboratorPresence'
import { useCalendarNavigation } from './hooks/useCalendarNavigation'
import { TripSidebar } from './TripSidebar'
import { CalendarHeader } from './CalendarHeader'
import { AllDayRow } from './AllDayRow'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { DetailPanel } from './DetailPanel'
import type { FlightBanner, HotelBanner } from './AllDayRow'

// ─── Date helpers ────────────────────────────────────────────

/** Parse a date string like "2026-03-10" into a UTC midnight Date. */
function parseISODate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z')
}

/** Difference in whole days between two UTC dates (b - a). */
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

/** Format a Date as "Mon, Mar 10" style label. */
function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** Format a date range string like "Mar 10 – Mar 16, 2026". */
function formatDateRange(startDate: Date, endDate: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  const start = startDate.toLocaleDateString('en-US', opts)
  const end = endDate.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${start} – ${end}`
}

// ─── Derive trip structure from MOCK_TRIP ────────────────────

const tripStartDate = parseISODate(MOCK_TRIP.start_date)
const tripEndDate = parseISODate(MOCK_TRIP.end_date)
const tripTotalDays = daysBetween(tripStartDate, tripEndDate) // e.g. 6

/** Array of { dayIndex, label } for WeekView. */
const TRIP_DAYS = Array.from({ length: tripTotalDays }, (_, i) => {
  const date = new Date(tripStartDate.getTime() + i * 24 * 60 * 60 * 1000)
  return { dayIndex: i, label: formatDayLabel(date) }
})

// ─── Derive flight banners ────────────────────────────────────
// MOCK_FLIGHTS is FlightViewModel[]. Fields: departureDisplay like "Mon, Mar 10, 8:30 PM",
// route, originIata, destIata.

const FLIGHT_BANNERS: FlightBanner[] = MOCK_FLIGHTS.map((flight, idx) => {
  // Determine dayIndex by checking if the flight arrives at the destination (arrival)
  // or departs from the destination (departure).
  // Flight 1: JFK→CDG = arrival on Mar 10 = day 0
  // Flight 2: CDG→JFK = departure on the last day
  const isArrival = flight.destIata !== flight.originIata && idx === 0
  const direction: 'arrival' | 'departure' = isArrival ? 'arrival' : 'departure'

  // Parse day from departureDisplay: "Mon, Mar 10, 8:30 PM"
  // Extract "Mar 10" portion and resolve to day offset from tripStartDate
  const displayParts = (flight.departureDisplay ?? '').split(',')
  // displayParts: ["Mon", " Mar 10", " 8:30 PM"]  or  ["Mon", " Mar 16", " 11:00 AM"]
  let dayIndex = 0
  if (displayParts.length >= 2) {
    const datePart = displayParts[1].trim() // "Mar 10"
    // Parse month and day
    const [monthStr, dayStr] = datePart.split(' ')
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    }
    const month = months[monthStr]
    const day = parseInt(dayStr, 10)
    if (month !== undefined && !isNaN(day)) {
      // Use trip start year
      const year = tripStartDate.getUTCFullYear()
      const flightDate = new Date(Date.UTC(year, month, day))
      const offset = daysBetween(tripStartDate, flightDate)
      // Clamp to valid range
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

// ─── Derive hotel banners ─────────────────────────────────────
// MOCK_HOTELS is HotelViewModel[]. Fields: id, name, checkIn, checkOut (ISO dates).

const HOTEL_BANNERS: HotelBanner[] = MOCK_HOTELS.map((hotel) => {
  const checkInDate = parseISODate(hotel.checkIn)
  const checkOutDate = parseISODate(hotel.checkOut)
  const startDayIndex = Math.max(0, daysBetween(tripStartDate, checkInDate))
  const endDayIndex = Math.max(
    startDayIndex,
    Math.min(tripTotalDays - 1, daysBetween(tripStartDate, checkOutDate) - 1),
  )
  return {
    id: hotel.id,
    label: hotel.name,
    startDayIndex,
    endDayIndex,
  }
})

// ─── Component ───────────────────────────────────────────────

export function CalendarDashboard() {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Hooks
  const {
    activities,
    collaborators,
    connectionStatus,
    moveActivity,
    removeActivity,
  } = useYjsSync()

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

  const { setCurrentView } = useCollaboratorPresence({ collaborators })

  const { sensors, handleDragStart, handleDragEnd } = useCalendarDnd({
    onMoveActivity: moveActivity,
  })

  // Sync view mode to presence
  useEffect(() => {
    setCurrentView(viewMode)
  }, [viewMode, setCurrentView])

  // Computed
  const timeRange = useMemo(() => computeTimeRange(activities), [activities])

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

  // Event handlers
  const handleSelectEvent = (id: string) => {
    selectEvent(selectedEventId === id ? null : id)
  }

  const handleCloseDetail = () => selectEvent(null)

  const handleRemoveActivity = (id: string) => {
    removeActivity(id)
    if (selectedEventId === id) selectEvent(null)
  }

  const handleViewModeChange = (mode: typeof viewMode) => {
    setViewMode(mode)
  }

  const handleBack = () => {
    if (viewMode === 'day') {
      goToWeekView()
    }
    // In week view, back could navigate to trip overview — no-op for now
  }

  const handleAddEvent = () => {
    // TODO: open add-event modal
  }

  const handleClickDayHeader = (dayIndex: number) => {
    goToDayView(dayIndex)
  }

  const dateRange = formatDateRange(tripStartDate, tripEndDate)
  const currentDayLabel =
    viewMode === 'day' ? TRIP_DAYS[selectedDayIndex]?.label ?? '' : ''

  // Days to show (for DayView we pass a single day)
  const visibleDays = viewMode === 'week' ? TRIP_DAYS : [TRIP_DAYS[selectedDayIndex]]

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117] text-white">
      {/* Sidebar */}
      <TripSidebar
        activeNav="calendar"
        collaborators={collaborators}
        activities={activities}
        tripStartDate={tripStartDate}
        tripDays={tripTotalDays}
        currentDay={selectedDayIndex}
        onSelectDay={(dayIndex) => {
          selectDay(dayIndex)
          if (viewMode === 'day') goToDayView(dayIndex)
        }}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <CalendarHeader
          tripName={MOCK_TRIP.title}
          dateRange={viewMode === 'day' ? currentDayLabel : dateRange}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onBack={handleBack}
          onAddEvent={handleAddEvent}
          connectionStatus={connectionStatus}
        />

        {/* All-day row: flight + hotel banners */}
        <AllDayRow
          days={visibleDays}
          flights={FLIGHT_BANNERS}
          hotels={HOTEL_BANNERS}
        />

        {/* Grid area */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Scrollable grid */}
          <div ref={scrollRef} className="flex flex-1 min-w-0 overflow-auto">
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
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
                      onSelectEvent={handleSelectEvent}
                      onClickDayHeader={handleClickDayHeader}
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
                      onSelectEvent={handleSelectEvent}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </DndContext>
          </div>

          {/* Detail panel (slides in from right) */}
          <DetailPanel
            activity={selectedActivity}
            viewers={collaborators}
            onClose={handleCloseDetail}
            onRemove={handleRemoveActivity}
          />
        </div>

        {/* Empty state — only when no activities exist */}
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
      </div>
    </div>
  )
}
