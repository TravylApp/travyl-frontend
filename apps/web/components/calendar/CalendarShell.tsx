'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core'
import { useQuery } from '@tanstack/react-query'
import { computeTimeRange, getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import { fetchCollaborators } from '@travyl/shared'
import { DEFAULT_TIME_RANGE } from './constants'
import { CalendarTopBar } from './CalendarTopBar'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import SidebarTabs from './SidebarTabs'
import { ForYouPanel } from './ForYouPanel'
import { EventsPanel } from './EventsPanel'
import DayMap from './DayMap'
import { CalendarSkeleton } from './CalendarSkeleton'
import { CalendarError } from './CalendarError'
import { useCalendarNavigation } from './hooks/useCalendarNavigation'
import { useTripActivities } from './hooks/useTripActivities'
import { useYjsSync } from './hooks/useYjsSync'
import { useActivityMutations } from './hooks/useActivityMutations'
import { useCalendarDnd } from './hooks/useCalendarDnd'
import { useCollaboratorPresence } from './hooks/useCollaboratorPresence'
import { useCalendarCommands } from './hooks/useCalendarCommands'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useResizablePanel } from './hooks/useResizablePanel'
import { useEvents } from './hooks/useEvents'
import { useUndoRedo } from './hooks/useUndoRedo'
import { usePollObserver } from './hooks/usePollObserver'
import { usePollSync } from './hooks/usePollSync'
import { usePollMutations } from './hooks/usePollMutations'
import { useBookingMatches } from './hooks/useBookingMatches'
import { useGapFiller } from './hooks/useGapFiller'
import { useInteractionTracking } from './hooks/useInteractionTracking'
import { useRegenerateActivity } from './hooks/useRegenerateActivity'
import { useRegenerateDay, type DaySlotAlternatives } from './hooks/useRegenerateDay'
import { useCalendarTheme } from './hooks/useCalendarTheme'
import { CalendarThemeContext } from './CalendarThemeContext'
import { ActivityContextMenu } from './ActivityContextMenu'
import { RegenerateOptionsModal } from './RegenerateOptionsModal'
import { RegenerateDayModal } from './RegenerateDayModal'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type { CalendarActivity, SuggestionCard } from './types'
import type { DragData } from './hooks/useCalendarDnd'
import { formatTimeRange } from './utils'

interface CalendarShellProps {
  tripId: string
  userId: string
  userName: string
  userAvatarUrl: string | null
  isSharedView?: boolean
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildDays(startDate: Date, tripDays: number) {
  const days: { dayIndex: number; label: string }[] = []
  for (let i = 0; i < tripDays; i++) {
    const d = new Date(startDate.getTime() + i * 86400000)
    const label = `${WEEKDAY_LABELS[d.getDay()]} ${d.getDate()}`
    days.push({ dayIndex: i, label })
  }
  return days
}

/**
 * Drag overlay card — follows the cursor while dragging.
 * Shows a compact version of the event with type color, title, and time.
 */
function DragOverlayContent({ data }: { data: DragData | null }) {
  if (!data) return null

  if (data.type === 'activity') {
    const a = data.activity
    const color = getActivityColor(a.type)
    return (
      <div
        className="rounded-lg shadow-2xl border border-white/20 overflow-hidden pointer-events-none"
        style={{
          width: 180,
          backgroundColor: color,
          opacity: 0.92,
        }}
      >
        {a.image && a.duration >= 1 && (
          <div className="h-12 bg-black/20 relative overflow-hidden">
            <img
              src={a.image}
              alt=""
              className="w-full h-full object-cover opacity-60"
              draggable={false}
            />
          </div>
        )}
        <div className="px-3 py-2">
          <div className="text-white font-semibold text-sm truncate">{a.title}</div>
          <div className="text-white/80 text-xs mt-0.5">{formatTimeRange(a)}</div>
          {a.location && (
            <div className="text-white/60 text-[10px] truncate mt-0.5">{a.location}</div>
          )}
        </div>
      </div>
    )
  }

  if (data.type === 'suggestion') {
    const s = data.suggestion
    return (
      <div
        className="rounded-lg shadow-2xl border border-white/20 overflow-hidden pointer-events-none"
        style={{ width: 180, backgroundColor: '#1e3a5f', opacity: 0.92 }}
      >
        {s.imageUrl && (
          <div className="h-12 relative overflow-hidden">
            <img
              src={s.imageUrl}
              alt=""
              className="w-full h-full object-cover opacity-60"
              draggable={false}
            />
          </div>
        )}
        <div className="px-3 py-2">
          <div className="text-white font-semibold text-sm truncate">{s.name}</div>
          <div className="text-white/60 text-[10px] mt-0.5 truncate">{s.category}</div>
        </div>
      </div>
    )
  }

  return null
}

export function CalendarShell({
  tripId,
  userId,
  userName,
  userAvatarUrl,
  isSharedView = false,
}: CalendarShellProps) {
  // ── Trip data ─────────────────────────────────────────────
  const { trip, tripStartDate, loading: tripLoading, error: tripError, refetchTrip } = useTripActivities(tripId)
  const { activities, isLoading: syncLoading, error: syncError } = useYjsSync(tripId, tripStartDate, userId)
  const rawMutations = useActivityMutations(tripId, tripStartDate, userId)
  const {
    addActivity, updateActivity, moveActivity, removeActivity, duplicateActivity,
    undo, redo, canUndo, canRedo,
  } = useUndoRedo({
    ...rawMutations,
    getActivity: (id) => activities.find((a) => a.id === id),
  })
  const isLoading = tripLoading || syncLoading
  const errorMsg = tripError || syncError

  // ── Navigation ────────────────────────────────────────────
  const { viewMode, selectedDayIndex, selectedEventId, setViewMode, selectDay, selectEvent } = useCalendarNavigation()

  // ── Mini month calendar state ────────────────────────────
  const today = useMemo(() => new Date(), [])
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [miniCalendarSynced, setMiniCalendarSynced] = useState(false)

  useEffect(() => {
    if (trip?.start_date && !miniCalendarSynced) {
      const startDate = new Date(trip.start_date + 'T00:00:00Z')
      setViewMonth(startDate.getMonth())
      setViewYear(startDate.getFullYear())
      setMiniCalendarSynced(true)
    }
  }, [trip?.start_date, miniCalendarSynced])

  // ── Computed dates ────────────────────────────────────────
  const parsedStartDate = trip ? new Date(trip.start_date + 'T00:00:00Z') : new Date()
  const parsedEndDate = trip ? new Date(trip.end_date + 'T00:00:00Z') : new Date()
  const tripTotalDays = trip ? Math.ceil((parsedEndDate.getTime() - parsedStartDate.getTime()) / 86400000) + 1 : 0
  const allDays = useMemo(() => buildDays(parsedStartDate, tripTotalDays), [parsedStartDate, tripTotalDays])
  const scheduledActivities = useMemo(() => activities.filter((a) => !a.unscheduled), [activities])
  const unscheduledActivities = useMemo(() => activities.filter((a) => a.unscheduled), [activities])
  const timeRange = useMemo(() => computeTimeRange(scheduledActivities) ?? DEFAULT_TIME_RANGE, [scheduledActivities])

  // ── Activity counts for mini calendar ────────────────────
  const activityCounts = useMemo(() => {
    const map = new Map<number, number>()
    for (const a of scheduledActivities) {
      map.set(a.day, (map.get(a.day) ?? 0) + 1)
    }
    return map
  }, [scheduledActivities])

  // ── Collaborators ────────────────────────────────────────
  const { collaborators } = useCollaboratorPresence({
    tripId, userId, userName, userAvatarUrl, disabled: isSharedView,
  })
  const { data: tripCollaborators = [] } = useQuery({
    queryKey: ['collaborators', tripId],
    queryFn: () => fetchCollaborators(tripId),
    enabled: !!tripId && !isSharedView,
  })
  const collaboratorsWithProfiles = useMemo(
    () => collaborators.map((collaborator) => {
      const profileMatch = tripCollaborators.find(
        (tc) => tc.user_id === collaborator.userId && tc.invite_status === 'accepted',
      )
      return {
        ...collaborator,
        name: profileMatch?.display_name ?? collaborator.name,
        avatarUrl: profileMatch?.avatar_url ?? collaborator.avatarUrl ?? null,
      }
    }),
    [collaborators, tripCollaborators],
  )

  // ── Polls ─────────────────────────────────────────────────
  const editorCollaborators = useMemo(
    () => tripCollaborators.filter((c) => c.role_type === 'editor' && c.invite_status === 'accepted'),
    [tripCollaborators],
  )
  const editorIds = useMemo(() => {
    const ids = editorCollaborators.map((c) => c.user_id).filter(Boolean) as string[]
    if (trip?.user_id && !ids.includes(trip.user_id)) ids.push(trip.user_id)
    return ids
  }, [editorCollaborators, trip?.user_id])
  usePollObserver({ editorCount: editorIds.length, editorIds })
  usePollSync(tripId)
  usePollMutations()

  // ── Gap filler ────────────────────────────────────────────
  const [, setGhostActivities] = useState<CalendarActivity[]>([])
  const { fill: fillGaps, isPending: isGapFilling } = useGapFiller({
    tripId,
    destination: trip?.destination ?? '',
    onSuccess: (suggestions) => {
      if (suggestions.length === 0) return
      setGhostActivities(suggestions)
    },
    onError: () => console.error('[fill-gaps] Failed to fetch gap suggestions'),
  })

  // ── Events ────────────────────────────────────────────────
  const { events, isLoading: eventsLoading, error: eventsError, refetch: refetchEvents } = useEvents({
    destination: trip?.destination ?? '',
    startDate: trip?.start_date ?? '',
    endDate: trip?.end_date ?? '',
  })

  // ── Session / Booking matches ────────────────────────────
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await getSupabaseBrowser().auth.getSession()
      return data.session
    },
    staleTime: 5 * 60 * 1000,
  })
  useBookingMatches({
    tripId,
    authToken: session?.access_token ?? '',
  })

  // ── Interaction tracking ─────────────────────────────────
  useInteractionTracking(tripId)

  // ── Context menu ─────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ activityId: string; x: number; y: number } | null>(null)
  const [dayContextMenu, setDayContextMenu] = useState<{ dayIndex: number; x: number; y: number } | null>(null)

  const handleContextMenu = useCallback((activityId: string, x: number, y: number) => {
    setContextMenu({ activityId, x, y })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
    setDayContextMenu(null)
  }, [])

  // ── Regenerate activity ─────────────────────────────────
  const [regeneratingActivityId, setRegeneratingActivityId] = useState<string | null>(null)
  const [regenerateAlternatives, setRegenerateAlternatives] = useState<SuggestionCard[]>([])
  const regenerateMutation = useRegenerateActivity()

  const handleRegenerate = useCallback((activityId: string) => {
    const activity = activities.find((a) => a.id === activityId)
    if (!activity) return

    setRegeneratingActivityId(activityId)
    setRegenerateAlternatives([])
    regenerateMutation.mutate(
      {
        destination: trip?.destination ?? '',
        excludeNames: [activity.title],
        category: activity.type,
      },
      {
        onSuccess: (alternatives) => {
          setRegenerateAlternatives(alternatives)
        },
      },
    )
  }, [activities, trip?.destination, regenerateMutation])

  const handleRegenerateSelect = useCallback(
    (alternative: SuggestionCard) => {
      if (!regeneratingActivityId) return
      const activity = activities.find((a) => a.id === regeneratingActivityId)
      if (!activity) return

      updateActivity(activity.id, {
        title: alternative.name,
        type: alternative.category,
        image: alternative.imageUrl,
        rating: alternative.rating ?? undefined,
        price: alternative.price != null ? `$${alternative.price}` : undefined,
        location: alternative.location,
        latitude: alternative.latitude,
        longitude: alternative.longitude,
      })
      setRegeneratingActivityId(null)
      setRegenerateAlternatives([])
    },
    [regeneratingActivityId, activities, updateActivity],
  )

  const handleCloseRegenerateModal = useCallback(() => {
    setRegeneratingActivityId(null)
    setRegenerateAlternatives([])
  }, [])

  // ── Regenerate day ──────────────────────────────────────
  const [regeneratingDayIndex, setRegeneratingDayIndex] = useState<number | null>(null)
  const [regenerateDaySlots, setRegenerateDaySlots] = useState<DaySlotAlternatives[]>([])
  const regenerateDayMutation = useRegenerateDay()

  const handleRegenerateDay = useCallback((dayIndex: number) => {
    const dayActivities = activities.filter((a) => a.day === dayIndex && !a.unscheduled)
    if (dayActivities.length === 0) return

    setRegeneratingDayIndex(dayIndex)
    setRegenerateDaySlots([])
    regenerateDayMutation.mutate(
      {
        destination: trip?.destination ?? '',
        activities: dayActivities.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          startHour: a.startHour,
          duration: a.duration,
        })),
      },
      {
        onSuccess: (data) => {
          setRegenerateDaySlots(data.slots)
        },
      },
    )
  }, [activities, trip?.destination, regenerateDayMutation])

  const handleRegenerateDayApply = useCallback(
    (selections: Map<string, SuggestionCard>) => {
      selections.forEach((alternative, activityId) => {
        const activity = activities.find((a) => a.id === activityId)
        if (!activity) return

        updateActivity(activityId, {
          title: alternative.name,
          type: alternative.category,
          image: alternative.imageUrl,
          rating: alternative.rating ?? undefined,
          price: alternative.price != null ? `$${alternative.price}` : undefined,
          location: alternative.location,
          latitude: alternative.latitude,
          longitude: alternative.longitude,
        })
      })
      setRegeneratingDayIndex(null)
      setRegenerateDaySlots([])
    },
    [activities, updateActivity],
  )

  const handleCloseRegenerateDayModal = useCallback(() => {
    setRegeneratingDayIndex(null)
    setRegenerateDaySlots([])
  }, [])

  // ── Right panel resize ───────────────────────────────────
  const { width: panelWidth, handleDragStart: panelDragStart, handleDrag: panelDrag, handleDragEnd: panelDragEnd, isDragging } = useResizablePanel()

  // Prevent text selection while resizing panel
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
    } else {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging])

  // ── Command palette state ────────────────────────────────
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  // ── Week navigation ──────────────────────────────────────
  const handleWeekChange = useCallback((direction: -1 | 1) => {
    selectDay(selectedDayIndex + direction * 7)
  }, [selectedDayIndex, selectDay])

  const handleToday = useCallback(() => {
    const diffDays = Math.floor((Date.now() - parsedStartDate.getTime()) / 86400000)
    selectDay(Math.max(0, diffDays))
  }, [parsedStartDate, selectDay])

  // ── Drag-and-drop ────────────────────────────────────────
  const weekGridRef = useRef<HTMLDivElement>(null)
  const { sensors, activeId, activeData, pendingDrop, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel } = useCalendarDnd({
    onMoveActivity: moveActivity,
    onAddFromSuggestion: (activity) => addActivity(activity),
    scrollRef: weekGridRef,
    timeRangeStartHour: timeRange.startHour,
  })

  const handleSelectEvent = useCallback((id: string) => {
    selectEvent(id)
  }, [selectEvent])

  // ── Keyboard commands ────────────────────────────────────
  const selectedActivity = useMemo(
    () => scheduledActivities.find((a) => a.id === selectedEventId) ?? null,
    [scheduledActivities, selectedEventId],
  )

  const commands = useCalendarCommands({
    selectedActivity,
    isPaletteOpen,
    moveActivity,
    removeActivity,
    updateActivity,
    duplicateActivity,
    onViewModeChange: setViewMode,
    selectDay,
    tripDays: allDays,
    tripStartDate: parsedStartDate,
    onAddEvent: () => {},
    onOpenPalette: () => setIsPaletteOpen(true),
    undo,
    redo,
    canUndo,
    canRedo,
  })
  useKeyboardShortcuts(
    commands,
    isPaletteOpen,
    () => setIsPaletteOpen(false),
    () => selectEvent(null),
  )

  // ── Theme ─────────────────────────────────────────────────
  const { theme } = useCalendarTheme()
  const darkClass = theme === 'dark' ? 'dark' : ''

  // ── Computed map activities ──────────────────────────────
  const currentDayMapActivities = useMemo(
    () => scheduledActivities
      .filter((a) => a.day === selectedDayIndex && a.latitude != null && a.longitude != null)
      .sort((a, b) => a.startHour - b.startHour)
      .map((a) => ({ id: a.id, title: a.title, latitude: a.latitude!, longitude: a.longitude!, startHour: a.startHour })),
    [scheduledActivities, selectedDayIndex],
  )

  // ── Loading / error states ───────────────────────────────
  if (isLoading) return <CalendarSkeleton />
  if (errorMsg || !trip) return <CalendarError message={errorMsg ?? 'Failed to load trip'} />

  // ── Render ────────────────────────────────────────────────
  const days = allDays
  const selectedDayLabel = days[selectedDayIndex]?.label ?? ''

  return (
    <CalendarThemeContext.Provider value={{ isDark: theme === 'dark' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`flex flex-col h-full bg-[var(--cal-bg)] ${darkClass}`}>
          {/* Top Bar */}
          <CalendarTopBar
            tripName={trip.title ?? 'Untitled Trip'}
            dateRange={`${trip.start_date} – ${trip.end_date}`}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onWeekChange={handleWeekChange}
            onToday={handleToday}
            onNewActivity={() => {}}
            onShare={() => {}}
          />

          {/* Two-column layout (left date nav hidden) */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* Center: Calendar Grid */}
            <div ref={weekGridRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
              {viewMode === 'week' ? (
                <WeekView
                  days={days}
                  activities={scheduledActivities}
                  viewers={collaboratorsWithProfiles}
                  selectedEventId={selectedEventId}
                  timeRange={timeRange}
                  tripStartDate={parsedStartDate}
                  onSelectEvent={handleSelectEvent}
                  onClickDayHeader={(dayIndex) => {
                    selectDay(dayIndex)
                    setViewMode('day')
                  }}
                  onDeselect={() => selectEvent(null)}
                  pendingDrop={pendingDrop}
                  tripId={tripId}
                  onContextMenu={handleContextMenu}
                  onRegenerateDay={handleRegenerateDay}
                />
              ) : (
                <DayView
                  dayIndex={selectedDayIndex}
                  label={selectedDayLabel}
                  activities={scheduledActivities}
                  viewers={collaboratorsWithProfiles}
                  selectedEventId={selectedEventId}
                  timeRange={timeRange}
                  tripStartDate={parsedStartDate}
                  onSelectEvent={handleSelectEvent}
                  onDeselect={() => selectEvent(null)}
                  pendingDrop={pendingDrop}
                  tripId={tripId}
                  onContextMenu={handleContextMenu}
                  onRegenerateDay={handleRegenerateDay}
                />
              )}
            </div>

            {/* Right: Context Panel */}
            <div
              className="flex-shrink-0 border-l border-[var(--cal-border)] bg-[var(--cal-bg)] relative"
              style={{ width: panelWidth }}
            >
              {/* Resize handle */}
              <div
                className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-[var(--cal-accent)]/50 transition-colors"
                style={{ marginLeft: -2 }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  panelDragStart()
                  const startX = e.clientX
                  let currentX = startX

                  const onMouseMove = (ev: MouseEvent) => {
                    const deltaX = ev.clientX - currentX
                    currentX = ev.clientX
                    panelDrag(deltaX)
                  }

                  const onMouseUp = () => {
                    window.removeEventListener('mousemove', onMouseMove)
                    window.removeEventListener('mouseup', onMouseUp)
                    panelDragEnd()
                  }

                  window.addEventListener('mousemove', onMouseMove)
                  window.addEventListener('mouseup', onMouseUp)
                }}
              />
              {regeneratingDayIndex !== null ? (
                <RegenerateDayModal
                  dayIndex={regeneratingDayIndex}
                  dayLabel={days[regeneratingDayIndex]?.label ?? ''}
                  slots={regenerateDaySlots}
                  originalActivities={activities.filter((a) => a.day === regeneratingDayIndex && !a.unscheduled)}
                  onApply={handleRegenerateDayApply}
                  onClose={handleCloseRegenerateDayModal}
                  isLoading={regenerateDayMutation.isPending}
                />
              ) : (
                <SidebarTabs
                  width={panelWidth}
                  forYouContent={
                    <ForYouPanel
                      destination={trip?.destination ?? ''}
                      tripId={trip?.id ?? ''}
                      width={panelWidth}
                    />
                  }
                  eventsContent={
                    <EventsPanel
                      events={events}
                      isLoading={eventsLoading}
                      destination={trip?.destination ?? ''}
                      startDate={trip?.start_date ?? ''}
                      endDate={trip?.end_date ?? ''}
                      onRetry={eventsError ? refetchEvents : undefined}
                    />
                  }
                  mapContent={
                    <DayMap
                      activities={currentDayMapActivities}
                      selectedActivityId={selectedEventId}
                      onSelectActivity={(id) => handleSelectEvent(id)}
                      className="h-full"
                    />
                  }
                />
              )}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          <DragOverlayContent data={activeData} />
        </DragOverlay>

        {/* Activity context menu */}
        {contextMenu && (() => {
          const activity = scheduledActivities.find((a) => a.id === contextMenu.activityId)
          if (!activity) return null
          return (
            <ActivityContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              actions={[
                { id: 'edit', label: 'Edit' },
                { id: 'duplicate', label: 'Duplicate' },
                { id: 'regenerate', label: 'Regenerate' },
                { id: 'separator1', label: '', separator: true },
                { id: 'delete', label: 'Delete', danger: true },
              ]}
              onAction={(actionId) => {
                switch (actionId) {
                  case 'edit':
                    handleSelectEvent(activity.id)
                    break
                  case 'duplicate':
                    duplicateActivity(activity)
                    break
                  case 'regenerate':
                    handleRegenerate(activity.id)
                    break
                  case 'delete':
                    removeActivity(activity.id)
                    break
                }
              }}
              onClose={handleCloseContextMenu}
            />
          )
        })()}

        {/* Regenerate activity modal */}
        {regeneratingActivityId && (
          <RegenerateOptionsModal
            alternatives={regenerateAlternatives}
            onSelect={handleRegenerateSelect}
            onClose={handleCloseRegenerateModal}
            isLoading={regenerateMutation.isPending}
          />
        )}
      </DndContext>
    </CalendarThemeContext.Provider>
  )
}
