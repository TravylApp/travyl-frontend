'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'motion/react'
import {
  MOCK_FLIGHTS,
  MOCK_HOTELS,
} from '@travyl/shared/config/mockItineraryData'
import {
  computeTimeRange,
  getActivityColor,
  getActivityColorDark,
  getActivityColorDarkBorder,
} from '@travyl/shared/viewmodels/calendarViewModel'
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
import { useCalendarCommands } from './hooks/useCalendarCommands'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useCalendarCommandsStore } from '@/stores/calendarCommandsStore'
import { useIndexTrip } from '@/hooks/useIndexTrip'
import { AllDayRow } from './AllDayRow'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { CardPopover } from './CardPopover'
import { ForYouPanel } from './ForYouPanel'
import { ResizeDivider } from './ResizeDivider'
import { useResizablePanel } from './hooks/useResizablePanel'
import { formatDuration, formatTimeRange } from './utils'
import { CalendarSkeleton } from './CalendarSkeleton'
import { CalendarError } from './CalendarError'
import { useMarqueeSelection } from './hooks/useMarqueeSelection'
import { MarqueeOverlay } from './MarqueeOverlay'
import type { FlightBanner, HotelBanner } from './AllDayRow'
import type { CalendarActivity } from './types'
import { useCalendarTheme } from './hooks/useCalendarTheme'
import { CalendarThemeContext } from './CalendarThemeContext'
import { ShareModal } from './sharing/ShareModal'
import { ForkAttribution } from '../trip/ForkAttribution'
import { inviteCollaborator, isTripOwner, canEditTrip } from '@travyl/shared'
import type { CollaboratorRole } from '@travyl/shared'
import { TripSettingsLayout } from '../trip/settings/TripSettingsLayout'
import { TripThemeProvider } from '../trip/TripThemeContext'
import { BudgetPanel } from '../budget/BudgetPanel'
import { PackingPanel } from '@/components/packing/PackingPanel'

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

  const weekGridRef = useRef<HTMLDivElement>(null)

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
    trackEvent(suggestionId, 'drag', activity.type)
  }, [addActivity, selectEvent, trackEvent])

  const handleInvite = useCallback(async (email: string, role: CollaboratorRole) => {
    if (!trip) return
    await inviteCollaborator(trip.id, email, role)
  }, [trip])

  const { theme, toggleTheme } = useCalendarTheme()

  const {
    width: forYouWidth,
    columnCount: forYouColumnCount,
    handleDragStart: handleResizeStart,
    handleDrag: handleResizeDrag,
    handleDragEnd: handleResizeEnd,
  } = useResizablePanel()

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

  const {
    selectedIds: marqueeSelectedIds,
    marqueeRect,
    startMarquee,
    updateMarquee,
    endMarquee,
    toggleActivityInSelection,
    clearSelection: clearMarqueeSelection,
  } = useMarqueeSelection({
    activities,
    timeRangeStartHour: timeRange.startHour,
    dayCount: TRIP_DAYS.length,
  })

  const handleGroupMove = useCallback((dayDelta: number, hourDelta: number) => {
    const selected = activities.filter((a) => marqueeSelectedIds.has(a.id))
    if (selected.length === 0) return

    let clampedDayDelta = dayDelta
    let clampedHourDelta = hourDelta
    for (const act of selected) {
      const newDay = act.day + clampedDayDelta
      const newHour = act.startHour + clampedHourDelta
      if (newDay < 0) clampedDayDelta = Math.max(clampedDayDelta, -act.day)
      if (newDay >= TRIP_DAYS.length) clampedDayDelta = Math.min(clampedDayDelta, TRIP_DAYS.length - 1 - act.day)
      if (newHour < 0) clampedHourDelta = Math.max(clampedHourDelta, -act.startHour)
      if (newHour + act.duration > 24) clampedHourDelta = Math.min(clampedHourDelta, 24 - act.duration - act.startHour)
    }

    for (const act of selected) {
      moveActivity(act.id, act.day + clampedDayDelta, act.startHour + clampedHourDelta)
    }
  }, [activities, marqueeSelectedIds, moveActivity, TRIP_DAYS.length])

  const { sensors, activeData, pendingDrop, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } = useCalendarDnd({
    onMoveActivity: moveActivity,
    onAddFromSuggestion: handleAddFromSuggestion,
    onGroupMove: handleGroupMove,
    marqueeSelectedIds,
    scrollRef,
    timeRangeStartHour: timeRange.startHour,
  })

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

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(marqueeSelectedIds)
    clearMarqueeSelection()
    await Promise.all(ids.map((id) => removeActivity(id)))
  }, [marqueeSelectedIds, clearMarqueeSelection, removeActivity])

  const handleBulkDuplicate = useCallback(async () => {
    const toDuplicate = activities.filter((a) => marqueeSelectedIds.has(a.id))
    clearMarqueeSelection()
    for (const act of toDuplicate) {
      await duplicateActivity(act)
    }
  }, [marqueeSelectedIds, clearMarqueeSelection, activities, duplicateActivity])

  const commands = useCalendarCommands({
    selectedActivity,
    moveActivity,
    removeActivity,
    updateActivity,
    duplicateActivity,
    onViewModeChange: setViewMode,
    selectDay,
    tripDays: TRIP_DAYS,
    tripStartDate: parsedStartDate,
    onAddEvent: () => handleCreateActivity(selectedDayIndex ?? 0, 12),
    marqueeSelectedIds,
    onBulkDelete: handleBulkDelete,
    onBulkDuplicate: handleBulkDuplicate,
  })

  // Publish commands to Zustand store for GlobalCommandPalette
  const setStoreCommands = useCalendarCommandsStore((s) => s.setCommands)
  const clearStoreCommands = useCalendarCommandsStore((s) => s.clearCommands)
  useEffect(() => { setStoreCommands(commands) }, [commands, setStoreCommands])
  useEffect(() => { return () => clearStoreCommands() }, [clearStoreCommands])

  // Index trip for semantic search
  const { indexTrip } = useIndexTrip()
  useEffect(() => {
    if (tripId && activities.length > 0) { indexTrip(tripId) }
  }, [tripId, activities.length, indexTrip])

  useKeyboardShortcuts(
    commands,
    () => selectEvent(null),
    marqueeSelectedIds.size > 0,
    clearMarqueeSelection,
  )

  // Early returns for loading / error states (must come after all hooks)
  if (isLoading) return <CalendarSkeleton />
  if (error) return <CalendarError message={error} />

  // Event handlers
  const handleClickEvent = (id: string, anchorEl: HTMLElement) => {
    if (marqueeSelectedIds.size > 0) {
      clearMarqueeSelection()
      return
    }
    if (popoverEventId === id) {
      setPopoverEventId(null)
      setPopoverAnchor(null)
    } else {
      setPopoverEventId(id)
      setPopoverAnchor(anchorEl)
    }
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
                      marqueeSelectedIds={marqueeSelectedIds}
                      gridRef={weekGridRef}
                      marqueeOverlay={
                        <MarqueeOverlay
                          gridRef={weekGridRef}
                          onStartMarquee={(x, y, rect) => {
                            selectEvent(null)
                            startMarquee(x, y, rect)
                          }}
                          onUpdateMarquee={updateMarquee}
                          onEndMarquee={endMarquee}
                          marqueeRect={marqueeRect}
                        />
                      }
                      onShiftClickEvent={toggleActivityInSelection}
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
            <ResizeDivider
              width={forYouWidth}
              onDragStart={handleResizeStart}
              onDrag={handleResizeDrag}
              onDragEnd={handleResizeEnd}
            />
            <ForYouPanel
              destination={trip?.destination ?? ''}
              tripId={trip?.id ?? ''}
              scheduledActivityIds={droppedSuggestionIds}
              width={forYouWidth}
              columnCount={forYouColumnCount}
            />
          </div>

          {/* Drag overlay — shows ghost of dragged item matching actual block size */}
          <DragOverlay dropAnimation={null} style={{ zIndex: 9999 }}>
            {activeData?.type === 'activity' ? (() => {
              const act = activeData.activity
              const h = Math.max(act.duration * HOUR_HEIGHT - 2, 20)
              const color = theme === 'dark' ? getActivityColorDark(act.type) : getActivityColor(act.type)
              const border = theme === 'dark' ? getActivityColorDarkBorder(act.type) : `${getActivityColor(act.type)}88`
              const hasImage = !!(act.image && act.duration >= 1)
              return (
                <div
                  className="relative rounded-md shadow-2xl overflow-hidden text-white text-xs pointer-events-none"
                  style={{
                    width: 160,
                    height: h,
                    borderLeft: `3px solid ${border}`,
                    backgroundColor: hasImage ? undefined : color,
                    opacity: 0.85,
                  }}
                >
                  {hasImage ? (
                    <>
                      <div
                        className="absolute inset-0 bg-cover bg-center rounded-md"
                        style={{ backgroundImage: `url(${act.image})` }}
                      />
                      <div
                        className="absolute inset-0 rounded-md"
                        style={{ background: `linear-gradient(135deg, ${getActivityColor(act.type)}4d, ${getActivityColor(act.type)}33)` }}
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-6"
                        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}
                      >
                        <div className="font-semibold truncate">{act.title || 'Untitled'}</div>
                        <div className="text-[10px] text-white/85 truncate">{formatTimeRange(act)}</div>
                      </div>
                    </>
                  ) : (
                    <div className="px-2 py-1 flex flex-col gap-0.5">
                      <span className="font-semibold truncate leading-tight">{act.title || 'Untitled'}</span>
                      <span className="opacity-80 truncate">{formatTimeRange(act)}</span>
                      {act.location && <span className="opacity-70 truncate text-[10px]">{act.location}</span>}
                    </div>
                  )}
                </div>
              )
            })() : activeData?.type === 'suggestion' ? (() => {
              const sug = activeData.suggestion
              const dur = sug.duration ?? 1
              const h = Math.max(dur * HOUR_HEIGHT - 2, 20)
              const color = theme === 'dark' ? getActivityColorDark(sug.category) : getActivityColor(sug.category)
              const border = theme === 'dark' ? getActivityColorDarkBorder(sug.category) : `${getActivityColor(sug.category)}88`
              return (
                <div
                  className="rounded-md shadow-2xl overflow-hidden text-white text-xs pointer-events-none"
                  style={{
                    width: 160,
                    height: h,
                    borderLeft: `3px solid ${border}`,
                    backgroundColor: color,
                    opacity: 0.85,
                  }}
                >
                  <div className="px-2 py-1 flex flex-col gap-0.5">
                    <span className="font-semibold truncate leading-tight">{sug.name}</span>
                    <span className="opacity-80 truncate">{formatDuration(dur)}</span>
                  </div>
                </div>
              )
            })() : null}
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
        ) : activeNav === 'settings' && trip ? (
          <div className="flex-1 overflow-auto p-4">
            <TripThemeProvider tripId={trip.id} initialThemeId={trip.theme} initialCustomColor={trip.custom_theme_color}>
              <TripSettingsLayout
                trip={trip}
                userId={userId}
                isOwner={isTripOwner(trip, userId)}
                canEdit={canEditTrip(trip, userId)}
                onRefetch={() => {}}
              />
            </TripThemeProvider>
          </div>
        ) : activeNav === 'budget' ? (
          <div className="flex-1 overflow-auto p-6">
            <BudgetPanel tripId={tripId} />
          </div>
        ) : activeNav === 'packing' ? (
          <div className="flex-1 overflow-auto p-4">
            <PackingPanel tripId={tripId} />
          </div>
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
    </CalendarThemeContext.Provider>
  )
}
