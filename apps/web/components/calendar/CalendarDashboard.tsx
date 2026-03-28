'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, DragOverlay, pointerWithin, closestCenter, type CollisionDetection } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'motion/react'
import { computeTimeRange } from '@travyl/shared/viewmodels/calendarViewModel'
import { fetchCollaborators, computeGaps } from '@travyl/shared'
import { useGapFiller } from './hooks/useGapFiller'
import { HOUR_HEIGHT } from './constants'
import { useCalendarDnd } from './hooks/useCalendarDnd'
import { useTripActivities } from './hooks/useTripActivities'
import { useYjsSync } from './hooks/useYjsSync'
import { useActivityMutations } from './hooks/useActivityMutations'
import { useCollaboratorPresence } from './hooks/useCollaboratorPresence'
import { useCalendarNavigation } from './hooks/useCalendarNavigation'
import { useInteractionTracking } from './hooks/useInteractionTracking'
import { CalendarToolbar } from './CalendarToolbar'
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
import SidebarTabs from './SidebarTabs'
import { EventsPanel } from './EventsPanel'
import { useEvents } from './hooks/useEvents'
import DayMap from './DayMap'
import { CalendarSkeleton } from './CalendarSkeleton'
import { CalendarError } from './CalendarError'
import type { CalendarActivity } from './types'
import { useCalendarTheme } from './hooks/useCalendarTheme'
import { CalendarThemeContext } from './CalendarThemeContext'
import { TripPermissionProvider } from './providers/TripPermissionContext'
import { ShareModal } from './sharing/ShareModal'
import { HistoryDrawer } from './HistoryDrawer'
import { useBookingMatches } from './hooks/useBookingMatches'
import { BookingPanel, type BookingPanelMode } from './BookingPanel'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { ActivityContextMenu } from './ActivityContextMenu'
import { ActivityEditModal } from './ActivityEditModal'
import { useUndoRedo } from './hooks/useUndoRedo'
import { usePollMutations } from './hooks/usePollMutations'
import { usePollObserver } from './hooks/usePollObserver'
import { usePollSync } from './hooks/usePollSync'
import { fetchActivityIntelligence } from './hooks/useActivityIntelligence'

// ─── Module-level constants ────────────────────────────────────

const EMPTY_COMMANDS: Parameters<typeof useKeyboardShortcuts>[0] = []

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

// Pointer-based collision detection with closest-center fallback.
// `pointerWithin` alone has dead zones (e.g. 5px ResizeDivider gaps between
// columns) where no droppable contains the pointer → `over` becomes null and
// the ghost flickers. The fallback ensures we always resolve to the nearest
// column.
const calendarCollision: CollisionDetection = (args) => {
  const collisions = pointerWithin(args)
  return collisions.length > 0 ? collisions : closestCenter(args)
}

// ─── Component ───────────────────────────────────────────────

interface CalendarDashboardProps {
  tripId: string
  userId: string
  userName: string
  /** When true: read-only shared view */
  isSharedView?: boolean
}

export function CalendarDashboard({ tripId, userId, userName, isSharedView = false }: CalendarDashboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const isPaletteOpen = useCalendarCommandsStore((s) => s.paletteOpen)
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)
  const [contextMenu, setContextMenu] = useState<{ activityId: string; x: number; y: number } | null>(null)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [ghostActivities, setGhostActivities] = useState<CalendarActivity[]>([])
  const [isBookingPanelOpen, setIsBookingPanelOpen] = useState(false)
  const [bookingPanelMode, setBookingPanelMode] = useState<BookingPanelMode>('loading')
  const [bookingTotal, setBookingTotal] = useState(0)
  const [bookingReceived, setBookingReceived] = useState(0)
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const [failedToOpenIds, setFailedToOpenIds] = useState<string[]>([])
  const bookingFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // Hooks
  const { trip, tripStartDate, loading: tripLoading, error: tripError, refetchTrip } = useTripActivities(tripId)
  const { activities, connectionStatus, isLoading: syncLoading, error: syncError } = useYjsSync(tripId, tripStartDate, userId)
  const rawMutations = useActivityMutations(tripId, tripStartDate, userId)
  const {
    addActivity, updateActivity, moveActivity, removeActivity, removeActivities, duplicateActivity,
    undo, redo, canUndo, canRedo,
  } = useUndoRedo({
    ...rawMutations,
    getActivity: (id) => activities.find((a) => a.id === id),
  })
  const { collaborators, setSelectedEvent, setCurrentView, setSelectedDay } = useCollaboratorPresence({ tripId, userId, userName, disabled: isSharedView })
  const isLoading = tripLoading || syncLoading
  const error = tripError || syncError

  const { data: tripCollaborators = [] } = useQuery({
    queryKey: ['collaborators', tripId],
    queryFn: () => fetchCollaborators(tripId),
    enabled: !!tripId && !isSharedView,
  })

  // Poll hooks
  const { startPoll, vote, closePoll, restoreActivity } = usePollMutations()
  const editorCollaborators = useMemo(
    () => tripCollaborators.filter((c) => c.role_type === 'editor' && c.invite_status === 'accepted'),
    [tripCollaborators],
  )
  const editorIds = useMemo(() => {
    const ids = editorCollaborators.map((c) => c.user_id).filter(Boolean) as string[]
    // Include trip owner
    if (trip?.user_id && !ids.includes(trip.user_id)) ids.push(trip.user_id)
    return ids
  }, [editorCollaborators, trip?.user_id])
  const { polls } = usePollObserver({ editorCount: editorIds.length, editorIds })
  usePollSync(tripId)

  const { fill: fillGaps, isPending: isGapFilling } = useGapFiller({
    tripId,
    destination: trip?.destination ?? '',
    onSuccess: (suggestions) => {
      if (suggestions.length === 0) {
        return
      }
      setGhostActivities(suggestions)
    },
    onError: () => {
      console.error('[fill-gaps] Failed to fetch gap suggestions')
    },
  })

  const scheduledActivities = useMemo(
    () => activities.filter((a) => !a.unscheduled),
    [activities],
  )
  const unscheduledActivities = useMemo(
    () => activities.filter((a) => a.unscheduled),
    [activities],
  )

  const {
    viewMode,
    selectedDayIndex,
    selectedEventId,
    setViewMode,
    selectDay,
    selectEvent,
    goToDayView,
  } = useCalendarNavigation()

  const currentDayMapActivities = useMemo(
    () => scheduledActivities
      .filter((a) => a.day === selectedDayIndex && a.latitude != null && a.longitude != null)
      .sort((a, b) => a.startHour - b.startHour)
      .map((a) => ({ id: a.id, title: a.title, latitude: a.latitude!, longitude: a.longitude!, startHour: a.startHour })),
    [scheduledActivities, selectedDayIndex],
  )

  const { trackEvent } = useInteractionTracking(tripId)

  const { events, eventsByDate, isLoading: eventsLoading, error: eventsError, refetch: refetchEvents } = useEvents({
    destination: trip?.destination ?? '',
    startDate: trip?.start_date ?? '',
    endDate: trip?.end_date ?? '',
  })
  const [showEvents, setShowEvents] = useState(true)

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await getSupabaseBrowser().auth.getSession()
      return data.session
    },
    staleTime: 5 * 60 * 1000,
  })

  const { matches: bookingMatches, hasMatches: hasBookingMatches, startRealtimeAndMatch, markOpened } = useBookingMatches({
    tripId,
    apiUrl: process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL ?? '',
    authToken: session?.access_token ?? '',
  })

  const weekGridRef = useRef<HTMLDivElement>(null)

  // Computed (moved up so useCalendarDnd can reference timeRange)
  const selectedDayGhosts = useMemo(
    () => ghostActivities.filter((g) => g.day === selectedDayIndex),
    [ghostActivities, selectedDayIndex],
  )

  const timeRange = useMemo(
    () => computeTimeRange([...activities, ...selectedDayGhosts]),
    [activities, selectedDayGhosts],
  )

  const hasGaps = useMemo(
    () =>
      computeGaps(
        scheduledActivities
          .filter((a) => a.day === selectedDayIndex)
          .map((a) => ({ startHour: a.startHour, duration: a.duration })),
      ).length > 0,
    [scheduledActivities, selectedDayIndex],
  )

  const bookingStatuses = useMemo(() => {
    const m = new Map<string, 'matched' | 'opened'>()
    for (const [id, match] of bookingMatches) {
      if (match.status === 'matched' || match.status === 'opened') {
        m.set(id, match.status)
      }
    }
    return m
  }, [bookingMatches])

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

  const queryClient = useQueryClient()

  // Background-prefetch intelligence for all visible activities
  useEffect(() => {
    if (!scheduledActivities.length) return
    for (const a of scheduledActivities) {
      queryClient.prefetchQuery({
        queryKey: ['activity-intelligence', a.id, tripId],
        queryFn: () => fetchActivityIntelligence(a.id, tripId),
        staleTime: 60 * 60 * 1000,
      })
    }
  }, [scheduledActivities, tripId, queryClient])

  const { theme, toggleTheme } = useCalendarTheme()
  const {
    width: forYouWidth,
    isDragging: isResizingPanel,
    handleDragStart: handlePanelDragStart,
    handleDrag: handlePanelDrag,
    handleDragEnd: handlePanelDragEnd,
  } = useResizablePanel()

  // Navigate to today's position in the trip on first load.
  useEffect(() => {
    if (!trip) return
    const today = new Date()
    const tripStart = new Date(trip.start_date + 'T00:00:00Z')
    const diffDays = Math.floor((today.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24))
    const dayIndex = Math.max(0, Math.min(diffDays, tripTotalDays - 1))
    selectDay(dayIndex)
  // Run once when the trip first loads (trip?.id changes from undefined → id).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id])

  // Sync view mode to presence
  useEffect(() => {
    setCurrentView(viewMode)
  }, [viewMode, setCurrentView])

  // Sync selected activity to presence
  useEffect(() => {
    setSelectedEvent(selectedEventId ?? null)
  }, [selectedEventId, setSelectedEvent])

  // Sync selected day to presence
  useEffect(() => {
    setSelectedDay(selectedDayIndex)
  }, [selectedDayIndex, setSelectedDay])

  // Clear ghost suggestions when the user navigates to a different day
  useEffect(() => {
    setGhostActivities([])
  }, [selectedDayIndex])

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
      isoDate: date.toISOString().slice(0, 10),
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
    activities: scheduledActivities,
    timeRangeStartHour: timeRange.startHour,
    dayCount: TRIP_DAYS.length,
  })

  const handleGroupMove = useCallback((dayDelta: number, hourDelta: number) => {
    const selected = scheduledActivities.filter((a) => marqueeSelectedIds.has(a.id))
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
      queryClient.invalidateQueries({ queryKey: ['activity-intelligence', act.id] })
    }
  }, [scheduledActivities, marqueeSelectedIds, moveActivity, tripTotalDays, queryClient])

  const handleMoveActivity = useCallback((id: string, day: number, startHour: number) => {
    moveActivity(id, day, startHour)
    queryClient.invalidateQueries({ queryKey: ['activity-intelligence', id] })
  }, [moveActivity, queryClient])

  const { sensors, activeData, pendingDrop, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel } = useCalendarDnd({
    onMoveActivity: handleMoveActivity,
    onAddFromSuggestion: handleAddFromSuggestion,
    onGroupMove: handleGroupMove,
    marqueeSelectedIds,
    scrollRef,
    timeRangeStartHour: timeRange.startHour,
  })

  const selectedActivity = useMemo(
    () => scheduledActivities.find((a) => a.id === selectedEventId) ?? null,
    [scheduledActivities, selectedEventId],
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
    await removeActivities(ids)
  }, [marqueeSelectedIds, clearMarqueeSelection, removeActivities])

  const handleBulkDuplicate = useCallback(async () => {
    const toDuplicate = scheduledActivities.filter((a) => marqueeSelectedIds.has(a.id))
    clearMarqueeSelection()
    for (const act of toDuplicate) {
      await duplicateActivity(act)
    }
  }, [marqueeSelectedIds, clearMarqueeSelection, scheduledActivities, duplicateActivity])

  const handleBookTrip = useCallback(async () => {
    if (bookingInProgress) return
    setBookingInProgress(true)
    setBookingPanelMode('loading')
    setIsBookingPanelOpen(true)
    setBookingReceived(0)
    setFailedToOpenIds([])

    try {
      const activitiesToMatch = scheduledActivities.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        latitude: a.latitude ?? null,
        longitude: a.longitude ?? null,
      }))
      setBookingTotal(activitiesToMatch.length)

      const result = await startRealtimeAndMatch(activitiesToMatch)
      setBookingTotal(result.total)

      if (bookingFallbackTimerRef.current) clearTimeout(bookingFallbackTimerRef.current)
      bookingFallbackTimerRef.current = setTimeout(() => {
        setBookingReceived(result.total)
        setBookingPanelMode('summary')
        setBookingInProgress(false)
      }, 2000)
    } catch {
      setBookingPanelMode('summary')
      setBookingInProgress(false)
    }
  }, [bookingInProgress, scheduledActivities, startRealtimeAndMatch])

  useEffect(() => {
    if (bookingPanelMode !== 'loading' || bookingTotal === 0) return
    setBookingReceived(Math.min(bookingMatches.size, bookingTotal))
  }, [bookingMatches.size, bookingTotal, bookingPanelMode])

  const handleBookAll = useCallback(() => {
    const toBook = scheduledActivities.filter((a) => bookingMatches.get(a.id)?.status === 'matched')
    const failed: string[] = []

    for (const a of toBook) {
      const m = bookingMatches.get(a.id)
      if (!m?.affiliateUrl) continue
      const win = window.open(m.affiliateUrl, '_blank')
      if (!win) failed.push(a.id)
    }

    setFailedToOpenIds(failed)
    const successIds = toBook.map((a) => a.id).filter((id) => !failed.includes(id))
    if (successIds.length > 0) markOpened(successIds)
    setBookingPanelMode('done')
  }, [scheduledActivities, bookingMatches, markOpened])

  const handleBookOne = useCallback((activityId: string) => {
    const m = bookingMatches.get(activityId)
    if (!m?.affiliateUrl) return
    const win = window.open(m.affiliateUrl, '_blank')
    if (win) {
      markOpened([activityId])
    } else {
      setFailedToOpenIds((prev) => [...prev, activityId])
    }
  }, [bookingMatches, markOpened])

  useEffect(() => {
    return () => {
      if (bookingFallbackTimerRef.current) clearTimeout(bookingFallbackTimerRef.current)
    }
  }, [])

  const handleConfirmGhost = useCallback((ghost: CalendarActivity) => {
    addActivity({ ...ghost, id: crypto.randomUUID() })
    setGhostActivities((prev) => prev.filter((g) => g.id !== ghost.id))
  }, [addActivity])

  const handleDismissGhost = useCallback((id: string) => {
    setGhostActivities((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const handleFillGaps = useCallback(() => {
    if (ghostActivities.length > 0) {
      setGhostActivities([])
      return
    }
    if (!trip) return
    const date = new Date(parsedStartMs + selectedDayIndex * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const dayActivities = scheduledActivities.filter((a) => a.day === selectedDayIndex)
    fillGaps({ date, dayIndex: selectedDayIndex, activities: dayActivities })
  }, [ghostActivities, trip, parsedStartMs, selectedDayIndex, scheduledActivities, fillGaps])

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

  // Publish commands to global store so SpotlightSearch can show them
  const setCommands = useCalendarCommandsStore((s) => s.setCommands)
  const clearCommands = useCalendarCommandsStore((s) => s.clearCommands)
  useEffect(() => {
    setCommands(commands)
    return () => clearCommands()
  }, [commands, setCommands, clearCommands])

  useKeyboardShortcuts(
    isSharedView ? EMPTY_COMMANDS : commands,
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
    queryClient.invalidateQueries({ queryKey: ['activity-intelligence', id] })
    setEditingActivityId(null)
  }, [moveActivity, updateActivity, queryClient])

  // Early returns for loading / error states (must come after all hooks)
  if (isLoading) return <CalendarSkeleton />
  if (error) return <CalendarError message={error} />
  if (!trip) return <CalendarSkeleton />

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
    if (isSharedView) return
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
    } else if (actionId === 'start-poll') {
      startPoll(activityId, userId)
    } else if (actionId === 'close-poll') {
      closePoll(activityId)
    } else if (actionId === 'restore-poll') {
      restoreActivity(activityId)
    } else if (actionId === 'remove-activity') {
      // Same effect as 'delete' — removes from calendar and restores to ForYou panel
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
    if (isSharedView) { router.push('/'); return }
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
    queryClient.invalidateQueries({ queryKey: ['activity-intelligence', id] })
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
    <TripPermissionProvider trip={trip!} collaborators={tripCollaborators} isSharedView={isSharedView}>
    <div className={theme === 'dark' ? 'dark' : ''}>
    <div className={`flex h-full overflow-hidden bg-[var(--cal-bg)] text-[var(--cal-text)]${isResizingPanel ? ' select-none' : ''}`}>
      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <CalendarToolbar
          tripName={trip?.title ?? 'Loading...'}
          dateRange={viewMode === 'day' ? currentDayLabel : dateRange}
          commands={commands}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onAddEvent={handleAddEvent}
          connectionStatus={connectionStatus}
          collaborators={collaborators}
          onShare={() => setIsShareModalOpen(true)}
          selectedActivity={selectedActivity}
          onDeselect={() => selectEvent(null)}
          tripDays={TRIP_DAYS}
          trip={trip ?? null}
          scheduledActivities={scheduledActivities}
          unscheduledActivities={unscheduledActivities}
          userId={userId}
          onAssignUnscheduled={(id, dayOffset) =>
            updateActivity(id, { day: dayOffset, endDay: dayOffset, unscheduled: false })
          }
          onDeleteUnscheduled={removeActivity}
          isSharedView={isSharedView}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onBookTrip={isSharedView ? undefined : handleBookTrip}
          hasBookingMatches={hasBookingMatches}
          isBookingInProgress={bookingInProgress}
          onViewBookings={() => {
            setBookingPanelMode('summary')
            setIsBookingPanelOpen(true)
          }}
          onFillGaps={handleFillGaps}
          isGapFilling={isGapFilling}
          hasGhosts={ghostActivities.length > 0}
          hasGaps={hasGaps}
          showEvents={showEvents}
          onToggleEvents={() => setShowEvents(v => !v)}
        />

        {/* Grid area */}
        <DndContext
          sensors={isSharedView ? [] : sensors}
          collisionDetection={calendarCollision}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Calendar grid column (AllDayRow + scrollable time grid) */}
            <div className="flex flex-col flex-1 min-w-0">
              {/* All-day row: flight + hotel banners — only spans the grid, not the right panel */}
              <AllDayRow
                days={visibleDays}
                eventsByDate={eventsByDate}
                showEvents={showEvents}
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
                        activities={scheduledActivities}
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
                        polls={polls}
                        pollUserId={userId}
                        onVotePoll={(activityId, v) => vote(activityId, userId, v)}
                        bookingStatuses={bookingStatuses}
                        tripId={tripId}
                        ghostActivities={ghostActivities}
                        onConfirmGhost={handleConfirmGhost}
                        onDismissGhost={handleDismissGhost}
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
                        activities={scheduledActivities}
                        viewers={collaborators}
                        selectedEventId={selectedEventId}
                        timeRange={timeRange}
                        tripStartDate={parsedStartDate}
                        onSelectEvent={handleSelectEvent}
                        onDeselect={() => selectEvent(null)}
                        pendingDrop={pendingDrop}
                        onResizeEvent={handleResizeEvent}
                        onContextMenu={handleContextMenu}
                        polls={polls}
                        pollUserId={userId}
                        onVotePoll={(activityId, v) => vote(activityId, userId, v)}
                        bookingStatuses={bookingStatuses}
                        tripId={tripId}
                        ghostActivities={ghostActivities}
                        onConfirmGhost={handleConfirmGhost}
                        onDismissGhost={handleDismissGhost}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {!isSharedView && (
              <>
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

                {/* Right column: Sidebar with For You / Map tabs */}
                <SidebarTabs
                  width={forYouWidth}
                  forYouContent={
                    <ForYouPanel
                      destination={trip?.destination ?? ''}
                      tripId={trip?.id ?? ''}
                      scheduledActivityIds={droppedSuggestionIds}
                      width={forYouWidth}
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
              </>
            )}

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
              <p className="text-sm text-gray-500">{isSharedView ? 'No activities planned yet' : 'No activities yet — add one to get started'}</p>
            </div>
          )}
        </DndContext>
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
      actions={selectedActivity && !isSharedView ? [
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
    <HistoryDrawer
      tripId={tripId}
      isOpen={isHistoryOpen}
      onClose={() => setIsHistoryOpen(false)}
      onMove={moveActivity}
      onEdit={updateActivity}
      onDelete={removeActivity}
      onAdd={addActivity}
      tripStartDate={tripStartDate}
      userId={userId}
    />
    <BookingPanel
      isOpen={isBookingPanelOpen}
      onClose={() => setIsBookingPanelOpen(false)}
      mode={bookingPanelMode}
      activities={scheduledActivities.map((a) => ({ id: a.id, title: a.title }))}
      matches={bookingMatches}
      receivedCount={bookingReceived}
      total={bookingTotal}
      onBookAll={handleBookAll}
      onBookOne={handleBookOne}
      failedToOpenIds={failedToOpenIds}
    />
    {contextMenu && (() => {
      const poll = polls.get(contextMenu.activityId)
      const hasActivePoll = poll?.status === 'active'
      const isResolvedPoll = poll?.status === 'resolved'
      const canManagePoll = poll ? (poll.startedBy === userId || trip?.user_id === userId) : false
      const canClosePoll = hasActivePoll && canManagePoll
      return (
        <ActivityContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          actions={[
            { id: 'edit', label: 'Edit' },
            { id: 'duplicate', label: 'Duplicate' },
            { id: 'separator', label: '', separator: true },
            ...(isResolvedPoll && canManagePoll
              ? [
                  { id: 'restore-poll', label: 'Restore Poll' },
                  { id: 'remove-activity', label: 'Remove from Calendar', danger: true },
                ]
              : isResolvedPoll
                ? [] // non-managers see no poll action on a resolved poll
                : hasActivePoll
                  ? [{ id: 'close-poll', label: 'Close Poll', disabled: !canClosePoll }]
                  : [{ id: 'start-poll', label: 'Start Poll' }]
            ),
            { id: 'separator2', label: '', separator: true },
            { id: 'delete', label: 'Delete', danger: true },
          ]}
          onAction={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )
    })()}
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
    </TripPermissionProvider>
    </CalendarThemeContext.Provider>
  )
}
