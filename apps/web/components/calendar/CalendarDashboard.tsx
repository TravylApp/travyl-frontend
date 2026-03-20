'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { TripNavbar } from './TripNavbar'
import { CommandPalette } from './CommandPalette'
import { useCalendarCommands } from './hooks/useCalendarCommands'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { AllDayRow } from './AllDayRow'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { CardPopover } from './CardPopover'
import { ForYouPanel } from './ForYouPanel'
import { formatDuration } from './utils'
import { CalendarSkeleton } from './CalendarSkeleton'
import { CalendarError } from './CalendarError'
import type { FlightBanner, HotelBanner } from './AllDayRow'
import type { CalendarActivity } from './types'
import { useCalendarTheme } from './hooks/useCalendarTheme'
import { CalendarThemeContext } from './CalendarThemeContext'
import { ShareModal } from './sharing/ShareModal'
import { ForkAttribution } from '../trip/ForkAttribution'
import { inviteCollaborator } from '@travyl/shared'
import type { CollaboratorRole } from '@travyl/shared'

// ─── Category icon mapping ─────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  sightseeing: '🏛️',
  dining: '🍽️',
  tour: '🗺️',
  cultural: '🎭',
  museum: '🖼️',
  shopping: '🛍️',
  nightlife: '🍸',
  outdoor: '🌿',
  default: '📍',
}

function getCategoryIcon(category: string): string {
  return CATEGORY_ICONS[category.toLowerCase()] ?? CATEGORY_ICONS.default
}

// ─── Component ───────────────────────────────────────────────

interface CalendarDashboardProps {
  tripId: string
  userId: string
  userName: string
}

export function CalendarDashboard({ tripId, userId, userName }: CalendarDashboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeNav, setActiveNav] = useState('calendar')
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const router = useRouter()

  // Hooks
  const { trip, tripStartDate, loading: tripLoading, error: tripError } = useTripActivities(tripId)
  const { activities, connectionStatus, isLoading: syncLoading, error: syncError } = useYjsSync(tripId, tripStartDate, userId)
  const { addActivity, updateActivity, moveActivity, removeActivity, duplicateActivity } = useActivityMutations(tripId, tripStartDate, userId)
  const { collaborators, setCurrentView, setSelectedDay } = useCollaboratorPresence({ tripId, userId, userName })
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
  } = useCalendarNavigation()

  const { trackEvent } = useInteractionTracking(tripId)

  // Computed (moved up so useCalendarDnd can reference timeRange)
  const timeRange = useMemo(() => computeTimeRange(activities), [activities])

  const [droppedSuggestionIds, setDroppedSuggestionIds] = useState<string[]>([])
  const [activityToSuggestion, setActivityToSuggestion] = useState<Map<string, string>>(new Map())

  const [popoverEventId, setPopoverEventId] = useState<string | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)

  const handleAddFromSuggestion = useCallback(async (activity: CalendarActivity, suggestionId: string) => {
    await addActivity(activity)
    selectEvent(activity.id)
    setDroppedSuggestionIds((prev) => [...prev, suggestionId])
    setActivityToSuggestion((prev) => new Map(prev).set(activity.id, suggestionId))
    trackEvent(suggestionId, 'drag')
  }, [addActivity, selectEvent, trackEvent])

  const handleInvite = useCallback(async (email: string, role: CollaboratorRole) => {
    if (!trip) return
    await inviteCollaborator(trip.id, email, role)
  }, [trip])

  const { sensors, activeData, pendingDrop, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } = useCalendarDnd({
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
  const parsedStartMs = parsedStartDate.getTime()
  const tripTotalDays = trip ? Math.round((parsedEndDate.getTime() - parsedStartMs) / (1000 * 60 * 60 * 24)) : 0

  const TRIP_DAYS = useMemo(() => Array.from({ length: tripTotalDays }, (_, i) => {
    const date = new Date(parsedStartMs + i * 24 * 60 * 60 * 1000)
    return {
      dayIndex: i,
      label: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
    }
  }), [tripTotalDays, parsedStartMs])

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
          const year = new Date(parsedStartMs).getUTCFullYear()
          const flightDate = new Date(Date.UTC(year, month, day))
          const offset = Math.round((flightDate.getTime() - parsedStartMs) / (1000 * 60 * 60 * 24))
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
  }, [trip, parsedStartMs, tripTotalDays])

  // ─── Derive hotel banners ─────────────────────────────────────
  const HOTEL_BANNERS: HotelBanner[] = useMemo(() => {
    if (!trip) return []
    return MOCK_HOTELS.map((hotel) => {
      const checkInDate = new Date(hotel.checkIn + 'T00:00:00Z')
      const checkOutDate = new Date(hotel.checkOut + 'T00:00:00Z')
      const startDayIndex = Math.max(0, Math.round((checkInDate.getTime() - parsedStartMs) / (1000 * 60 * 60 * 24)))
      const endDayIndex = Math.max(
        startDayIndex,
        Math.min(tripTotalDays - 1, Math.round((checkOutDate.getTime() - parsedStartMs) / (1000 * 60 * 60 * 24)) - 1),
      )
      return {
        id: hotel.id,
        label: hotel.name,
        startDayIndex,
        endDayIndex,
      }
    })
  }, [trip, parsedStartMs, tripTotalDays])

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedEventId) ?? null,
    [activities, selectedEventId],
  )

  const popoverActivity = useMemo(
    () => activities.find((a) => a.id === popoverEventId) ?? null,
    [activities, popoverEventId],
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleResize = useCallback((id: string, newStartHour: number, newDuration: number) => {
    updateActivity(id, { startHour: newStartHour, duration: newDuration })
  }, [updateActivity])

  const commands = useCalendarCommands({
    selectedActivity,
    isPaletteOpen,
    moveActivity,
    removeActivity,
    updateActivity,
    duplicateActivity,
    onViewModeChange: setViewMode,
    selectDay,
    tripDays: TRIP_DAYS,
    tripStartDate: parsedStartDate,
    onAddEvent: () => handleCreateActivity(selectedDayIndex ?? 0, 12),
    onOpenPalette: () => setIsPaletteOpen(true),
  })

  useKeyboardShortcuts(
    commands,
    isPaletteOpen,
    () => setIsPaletteOpen(false),
    () => selectEvent(null),
  )

  // Early returns for loading / error states (must come after all hooks)
  if (isLoading) return <CalendarSkeleton />
  if (error) return <CalendarError message={error} />

  // Event handlers
  const handleClickEvent = (id: string, anchorEl: HTMLElement) => {
    if (popoverEventId === id) {
      // Toggle off
      setPopoverEventId(null)
      setPopoverAnchor(null)
    } else {
      setPopoverEventId(id)
      setPopoverAnchor(anchorEl)
    }
    // Don't call selectEvent here — it causes a layout shift
    // that triggers scroll-to-close on the popover.
  }

  const handlePopoverClose = () => {
    setPopoverEventId(null)
    setPopoverAnchor(null)
  }

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
    router.push('/trips')
  }

  const handleAddEvent = () => {
    handleCreateActivity(selectedDayIndex ?? 0, 12)
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
    <div className={theme === 'dark' ? 'dark' : ''}>
    <div className="flex h-screen overflow-hidden bg-[var(--cal-bg)] text-[var(--cal-text)]">
      {/* Sidebar */}
      <TripSidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <TripNavbar
          tripName={trip?.title ?? 'Loading...'}
          dateRange={viewMode === 'day' ? currentDayLabel : dateRange}
          commands={commands}
          onOpenPalette={() => setIsPaletteOpen(true)}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onAddEvent={handleAddEvent}
          onBack={handleBack}
          connectionStatus={connectionStatus}
          collaborators={collaborators}
          onShare={() => setShareModalOpen(true)}
          selectedActivity={selectedActivity}
          onDeselect={() => selectEvent(null)}
          theme={theme}
          onToggleTheme={toggleTheme}
          tripDays={TRIP_DAYS}
        />

        {trip && (
          <ShareModal
            trip={trip}
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            onInvite={handleInvite}
          />
        )}

        {trip?.forked_from_trip_id && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-[#1e3a5f]/30 bg-white dark:bg-[#0f1a28]">
            <ForkAttribution trip={trip} />
          </div>
        )}

        {/* Grid area */}
        {activeNav === 'calendar' ? (
        <DndContext
          sensors={sensors}
          onDragStart={(e) => { setPopoverEventId(null); setPopoverAnchor(null); handleDragStart(e); }}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
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
                      onClickEvent={handleClickEvent}
                      onClickDayHeader={handleClickDayHeader}
                      onCreateActivity={handleCreateActivity}
                      pendingDrop={pendingDrop}
                      onResize={handleResize}
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
                      onClickEvent={handleClickEvent}
                      onCreateActivity={handleCreateActivity}
                      pendingDrop={pendingDrop}
                      onResize={handleResize}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right column: For You panel */}
            <ForYouPanel
              destination={trip?.destination ?? ''}
              tripId={trip?.id ?? ''}
              scheduledActivityIds={droppedSuggestionIds}
            />
          </div>

          {/* Drag overlay — shows ghost of dragged item */}
          <DragOverlay dropAnimation={null} style={{ zIndex: 9999 }}>
            {activeData?.type === 'suggestion' ? (
              <div className="bg-[var(--cal-surface)] rounded-lg shadow-2xl px-3 py-2 flex items-center gap-2 border border-[var(--cal-border)]">
                <span className="text-lg">{getCategoryIcon(activeData.suggestion.category)}</span>
                <span className="font-medium text-sm text-[var(--cal-text)] truncate max-w-[150px]">
                  {activeData.suggestion.name}
                </span>
              </div>
            ) : activeData?.type === 'activity' ? (
              <div className="bg-[var(--cal-surface)] rounded-lg shadow-2xl px-3 py-2 flex items-center gap-2 border border-[var(--cal-border)]">
                <span className="text-lg">{getCategoryIcon(activeData.activity.type)}</span>
                <span className="font-medium text-sm text-[var(--cal-text)] truncate max-w-[150px]">
                  {activeData.activity.title || 'Untitled'}
                </span>
              </div>
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

          <CardPopover
            anchorEl={popoverAnchor}
            isOpen={!!popoverActivity}
            onClose={handlePopoverClose}
            position="right"
            image={popoverActivity?.image}
            title={popoverActivity?.title ?? ''}
            category={popoverActivity?.type ?? ''}
            rating={popoverActivity?.rating}
            price={popoverActivity?.price ?? undefined}
            duration={popoverActivity ? formatDuration(popoverActivity.duration) : undefined}
            actions={popoverActivity ? [
              {
                label: 'Delete',
                onClick: () => {
                  handleRemoveActivity(popoverActivity.id)
                  setPopoverEventId(null)
                  setPopoverAnchor(null)
                },
                variant: 'danger' as const,
              },
            ] : []}
          />
      </div>
    </div>
    </div>
    <CommandPalette
      isOpen={isPaletteOpen}
      onClose={() => setIsPaletteOpen(false)}
      commands={commands}
    />
    </CalendarThemeContext.Provider>
  )
}
