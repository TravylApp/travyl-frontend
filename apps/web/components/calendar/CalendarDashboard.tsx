'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'motion/react'
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
import { useCalendarCommands } from './hooks/useCalendarCommands'
import { useCalendarCommandsStore } from '@/stores/calendarCommandsStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMarqueeSelection } from './hooks/useMarqueeSelection'
import { useResizablePanel } from './hooks/useResizablePanel'
import { MarqueeOverlay } from './MarqueeOverlay'
import { AllDayRow } from './AllDayRow'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { CardPopover } from './CardPopover'
import { ForYouPanel } from './ForYouPanel'
import { CalendarSkeleton } from './CalendarSkeleton'
import { CalendarError } from './CalendarError'
import type { FlightBanner, HotelBanner } from './AllDayRow'
import type { CalendarActivity } from './types'
import { useCalendarTheme } from './hooks/useCalendarTheme'
import { CalendarThemeContext } from './CalendarThemeContext'
import { ShareModal } from './sharing/ShareModal'
import { ActivityContextMenu } from './ActivityContextMenu'
import { ActivityEditModal } from './ActivityEditModal'
import { useUndoRedo } from './hooks/useUndoRedo'

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

function formatDurationLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours % 1 === 0) return `${hours}h`
  return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const isPaletteOpen = useCalendarCommandsStore((s) => s.paletteOpen)
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)
  const [contextMenu, setContextMenu] = useState<{ activityId: string; x: number; y: number } | null>(null)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const router = useRouter()

  // Hooks
  const { trip, tripStartDate, loading: tripLoading, error: tripError, refetchTrip } = useTripActivities(tripId)
  const { activities, connectionStatus, isLoading: syncLoading, error: syncError } = useYjsSync(tripId, tripStartDate, userId)
  const rawMutations = useActivityMutations(tripId, tripStartDate, userId)
  const {
    addActivity, updateActivity, moveActivity, removeActivity, duplicateActivity,
    undo, redo, canUndo, canRedo,
  } = useUndoRedo({
    ...rawMutations,
    getActivity: (id) => activities.find((a) => a.id === id),
  })
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

  const weekGridRef = useRef<HTMLDivElement>(null)

  // Computed (moved up so useCalendarDnd can reference timeRange)
  const timeRange = useMemo(() => computeTimeRange(activities), [activities])

  const [droppedSuggestionIds, setDroppedSuggestionIds] = useState<string[]>([])
  const [activityToSuggestion, setActivityToSuggestion] = useState<Map<string, string>>(new Map())

  const handleAddFromSuggestion = useCallback(async (activity: CalendarActivity, suggestionId: string) => {
    await addActivity(activity)
    selectEvent(activity.id)
    setDroppedSuggestionIds((prev) => [...prev, suggestionId])
    setActivityToSuggestion((prev) => new Map(prev).set(activity.id, suggestionId))
    trackEvent(suggestionId, 'drag', activity.type)
  }, [addActivity, selectEvent, trackEvent])

  // useCalendarDnd is called below after marquee selection hook is instantiated

  const { theme, toggleTheme } = useCalendarTheme()
  const {
    width: forYouWidth,
    isDragging: isResizingPanel,
    handleDragStart: handlePanelDragStart,
    handleDrag: handlePanelDrag,
    handleDragEnd: handlePanelDragEnd,
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
    setSelectedIds: setMarqueeSelectedIds,
  } = useMarqueeSelection({
    activities,
    timeRangeStartHour: timeRange.startHour,
    dayCount: TRIP_DAYS.length,
  })

  const handleGroupMove = useCallback((dayDelta: number, hourDelta: number) => {
    const selected = activities.filter((a) => marqueeSelectedIds.has(a.id))
    if (selected.length === 0) return

    // Clamp delta so ALL activities stay in bounds
    let clampedDayDelta = dayDelta
    let clampedHourDelta = hourDelta
    for (const act of selected) {
      const newDay = act.day + clampedDayDelta
      const newHour = act.startHour + clampedHourDelta
      if (newDay < 0) clampedDayDelta = Math.max(clampedDayDelta, -act.day)
      if (newDay >= tripTotalDays) clampedDayDelta = Math.min(clampedDayDelta, tripTotalDays - 1 - act.day)
      if (newHour < 0) clampedHourDelta = Math.max(clampedHourDelta, -act.startHour)
      if (newHour + act.duration > 24) clampedHourDelta = Math.min(clampedHourDelta, 24 - act.duration - act.startHour)
    }

    for (const act of selected) {
      moveActivity(act.id, act.day + clampedDayDelta, act.startHour + clampedHourDelta)
    }
  }, [activities, marqueeSelectedIds, moveActivity, tripTotalDays])

  const { sensors, activeData, pendingDrop, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } = useCalendarDnd({
    onMoveActivity: moveActivity,
    onAddFromSuggestion: handleAddFromSuggestion,
    onGroupMove: handleGroupMove,
    marqueeSelectedIds,
    scrollRef,
    timeRangeStartHour: timeRange.startHour,
  })

  // ─── Derive flight banners ────────────────────────────────────
  const FLIGHT_BANNERS: FlightBanner[] = []

  // ─── Derive hotel banners ─────────────────────────────────────
  const HOTEL_BANNERS: HotelBanner[] = []

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
    onOpenPalette: () => {},  // Global palette handles Ctrl+K
    marqueeSelectedIds,
    onBulkDelete: handleBulkDelete,
    onBulkDuplicate: handleBulkDuplicate,
    undo,
    redo,
    canUndo,
    canRedo,
  })

  // Publish commands to global store so GlobalCommandPalette can show them
  const setCommands = useCalendarCommandsStore((s) => s.setCommands)
  const clearCommands = useCalendarCommandsStore((s) => s.clearCommands)
  useEffect(() => {
    setCommands(commands)
    return () => clearCommands()
  }, [commands, setCommands, clearCommands])

  useKeyboardShortcuts(
    commands,
    isPaletteOpen,
    () => {},  // Global palette handles its own close
    () => selectEvent(null),
    marqueeSelectedIds.size > 0,
    clearMarqueeSelection,
  )

  const handleEditSave = useCallback((id: string, patch: Partial<CalendarActivity>) => {
    if (patch.day !== undefined) {
      const startHour = patch.startHour ?? 0
      moveActivity(id, patch.day, startHour)
      const { day: _day, startHour: _sh, ...rest } = patch
      if (Object.keys(rest).length > 0) {
        updateActivity(id, rest)
      }
    } else {
      updateActivity(id, patch)
    }
    setEditingActivityId(null)
  }, [moveActivity, updateActivity])

  // Early returns for loading / error states (must come after all hooks)
  if (isLoading) return <CalendarSkeleton />
  if (error) return <CalendarError message={error} />

  // Event handlers
  const handleSelectEvent = (id: string, anchorEl?: HTMLElement) => {
    // If marquee selection is active, clear it on click without Shift
    if (marqueeSelectedIds.size > 0) {
      clearMarqueeSelection()
      return // consume the click
    }
    // Close context menu when selecting via click
    setContextMenu(null)
    if (selectedEventId === id) {
      selectEvent(null)
      setPopoverAnchor(null)
    } else {
      selectEvent(id)
      setPopoverAnchor(anchorEl ?? null)
    }
  }

  const handleContextMenu = (activityId: string, x: number, y: number) => {
    // Close popover when opening context menu (overlay exclusivity)
    selectEvent(null)
    setPopoverAnchor(null)
    setContextMenu({ activityId, x, y })
  }

  const handleContextMenuAction = (actionId: string) => {
    if (!contextMenu) return
    const { activityId } = contextMenu
    setContextMenu(null)

    if (actionId === 'edit') {
      setEditingActivityId(activityId)
    } else if (actionId === 'duplicate') {
      const act = activities.find((a) => a.id === activityId)
      if (act) duplicateActivity(act)
    } else if (actionId === 'delete') {
      handleRemoveActivity(activityId)
    }
  }

  const handleClosePopover = () => {
    selectEvent(null)
    setPopoverAnchor(null)
  }

  const handleRemoveActivity = (id: string) => {
    removeActivity(id)
    if (selectedEventId === id) {
      selectEvent(null)
      setPopoverAnchor(null)
    }
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

  const handleResizeEvent = (id: string, newStartHour: number, newDuration: number) => {
    updateActivity(id, { startHour: newStartHour, duration: newDuration })
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

  const marqueeOverlayElement = (
    <MarqueeOverlay
      gridRef={weekGridRef}
      onStartMarquee={(x, y, rect) => {
        selectEvent(null) // clear single-select
        startMarquee(x, y, rect)
      }}
      onUpdateMarquee={updateMarquee}
      onEndMarquee={endMarquee}
      marqueeRect={marqueeRect}
    />
  )

  return (
    <CalendarThemeContext.Provider value={{ isDark: theme === 'dark' }}>
    <div className={theme === 'dark' ? 'dark' : ''}>
    <div className={`flex h-screen overflow-hidden bg-[var(--cal-bg)] text-[var(--cal-text)]${isResizingPanel ? ' select-none' : ''}`}>
      {/* Sidebar */}
      <TripSidebar
        tripId={tripId}
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
          onShare={() => setIsShareModalOpen(true)}
          selectedActivity={selectedActivity}
          onDeselect={() => selectEvent(null)}
          theme={theme}
          onToggleTheme={toggleTheme}
          tripDays={TRIP_DAYS}
        />

        {/* Grid area */}
        {activeNav === 'calendar' ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Calendar grid column (AllDayRow + scrollable time grid) */}
            <div className="flex flex-col flex-1 min-w-0">
              {/* All-day row: flight + hotel banners — only spans the grid, not the right panel */}
              <AllDayRow
                days={visibleDays}
                flights={FLIGHT_BANNERS}
                hotels={HOTEL_BANNERS}
              />
              {/* Scrollable time grid */}
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
                        onDeselect={() => selectEvent(null)}
                        pendingDrop={pendingDrop}
                        marqueeSelectedIds={marqueeSelectedIds}
                        gridRef={weekGridRef}
                        marqueeOverlay={marqueeOverlayElement}
                        onShiftClickEvent={toggleActivityInSelection}
                        onResizeEvent={handleResizeEvent}
                        onContextMenu={handleContextMenu}
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
                        onDeselect={() => selectEvent(null)}
                        pendingDrop={pendingDrop}
                        onResizeEvent={handleResizeEvent}
                        onContextMenu={handleContextMenu}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Resize handle */}
            <div
              className="shrink-0 w-1 cursor-col-resize hover:bg-[var(--cal-accent)]/30 active:bg-[var(--cal-accent)]/50 transition-colors relative group"
              onPointerDown={(e) => {
                e.preventDefault()
                handlePanelDragStart()
                let lastX = e.clientX
                const onMove = (ev: PointerEvent) => {
                  handlePanelDrag(ev.clientX - lastX)
                  lastX = ev.clientX
                }
                const onUp = () => {
                  handlePanelDragEnd()
                  window.removeEventListener('pointermove', onMove)
                  window.removeEventListener('pointerup', onUp)
                }
                window.addEventListener('pointermove', onMove)
                window.addEventListener('pointerup', onUp)
              }}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
              <div className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-8 rounded-full bg-[var(--cal-text-tertiary)] opacity-0 group-hover:opacity-40 transition-opacity" />
            </div>

            {/* Right column: For You panel (always visible) */}
            <ForYouPanel
              destination={trip?.destination ?? ''}
              tripId={trip?.id ?? ''}
              scheduledActivityIds={droppedSuggestionIds}
              width={forYouWidth}
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
      </div>
    </div>
    </div>
    <CardPopover
      anchorEl={popoverAnchor}
      isOpen={!!selectedActivity && !!popoverAnchor}
      onClose={handleClosePopover}
      position="right"
      image={selectedActivity?.image}
      title={selectedActivity?.title ?? ''}
      category={selectedActivity?.type ?? ''}
      rating={selectedActivity?.rating ?? undefined}
      price={selectedActivity?.price ?? undefined}
      duration={selectedActivity ? formatDurationLabel(selectedActivity.duration) : undefined}
      actions={selectedActivity ? [
        {
          label: 'Edit',
          onClick: () => {
            setEditingActivityId(selectedActivity.id)
            handleClosePopover()
          },
          variant: 'ghost' as const,
        },
        {
          label: 'Delete',
          onClick: () => handleRemoveActivity(selectedActivity.id),
          variant: 'danger' as const,
        },
      ] : []}
    />
    {trip && (
      <ShareModal
        trip={trip}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onSettingsChange={refetchTrip}
      />
    )}
    {contextMenu && (
      <ActivityContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        actions={[
          { id: 'edit', label: 'Edit' },
          { id: 'duplicate', label: 'Duplicate' },
          { id: 'separator', label: '', separator: true },
          { id: 'delete', label: 'Delete', danger: true },
        ]}
        onAction={handleContextMenuAction}
        onClose={() => setContextMenu(null)}
      />
    )}
    {editingActivityId && (() => {
      const editActivity = activities.find((a) => a.id === editingActivityId)
      if (!editActivity) return null
      return (
        <ActivityEditModal
          activity={editActivity}
          tripDays={TRIP_DAYS}
          onSave={handleEditSave}
          onClose={() => setEditingActivityId(null)}
        />
      )
    })()}
    </CalendarThemeContext.Provider>
  )
}
