'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core'
import { useQuery } from '@tanstack/react-query'
import { computeTimeRange, getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import { fetchCollaborators, usePlaceImages } from '@travyl/shared'
import { DEFAULT_TIME_RANGE, HOUR_HEIGHT as DEFAULT_HOUR_HEIGHT } from './constants'
import { HourHeightProvider } from './HourHeightContext'
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

// ── Persistent geocode cache ─────────────────────────────
// Geocodes are keyed by trip activity id. Persisted in localStorage so a
// reload (or switching trips and coming back) doesn't re-fire Nominatim.
const GEOCODE_CACHE_KEY = 'travyl-cal-geocode-cache-v1'
type GeocodeCacheEntry = { lat: number; lng: number }
type GeocodeCacheShape = Record<string, GeocodeCacheEntry>

function loadGeocodeCacheIntoMap(): Map<string, GeocodeCacheEntry> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = window.localStorage.getItem(GEOCODE_CACHE_KEY)
    if (!raw) return new Map()
    const parsed = JSON.parse(raw) as GeocodeCacheShape
    const map = new Map<string, GeocodeCacheEntry>()
    for (const [k, v] of Object.entries(parsed)) {
      if (v && Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
        map.set(k, v)
      }
    }
    return map
  } catch {
    return new Map()
  }
}

function saveGeocodeMapToCache(map: Map<string, GeocodeCacheEntry>) {
  if (typeof window === 'undefined') return
  try {
    const obj: GeocodeCacheShape = {}
    map.forEach((v, k) => {
      obj[k] = v
    })
    window.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(obj))
  } catch {
    /* quota or disabled — fine, it's just a cache */
  }
}

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

  // ── Right panel resize + collapse ────────────────────────
  const { width: panelWidth, handleDragStart: panelDragStart, handleDrag: panelDrag, handleDragEnd: panelDragEnd, isDragging } = useResizablePanel()
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const togglePanelCollapsed = useCallback(() => setPanelCollapsed((v) => !v), [])
  const effectivePanelWidth = panelCollapsed ? 0 : panelWidth

  // ── Dynamic hour height ──────────────────────────────────
  // The calendar grid stretches to fill the available viewport height; the
  // per-hour pixel size grows or shrinks with the window. Floored at the
  // static default so rows never get smaller than their canonical size on
  // short viewports (just adds a scrollbar instead).
  //
  // We anchor to `window.innerHeight` minus a fixed chrome offset rather than
  // measuring the scroll container's clientHeight. The DashboardLayout uses
  // `min-h-screen` (not `h-screen`), which lets the page grow with content —
  // so a flex-based measurement comes back undersized and the rows collapse
  // to the 60px floor. Viewport math is deterministic regardless of the
  // surrounding flex chain.
  const DAY_HEADER_HEIGHT = 28
  const SHELL_CHROME_HEIGHT = 48 /* dashboard navbar */ + 50 /* CalendarTopBar */
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 900,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const hourCount = timeRange.endHour - timeRange.startHour
  const dynamicHourHeight = useMemo(() => {
    if (hourCount <= 0) return DEFAULT_HOUR_HEIGHT
    const available = viewportHeight - SHELL_CHROME_HEIGHT - DAY_HEADER_HEIGHT
    return Math.max(DEFAULT_HOUR_HEIGHT, available / hourCount)
  }, [viewportHeight, hourCount])

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
    const next = selectedDayIndex + direction * 7
    const clamped = Math.max(0, Math.min(next, Math.max(0, tripTotalDays - 1)))
    selectDay(clamped)
  }, [selectedDayIndex, selectDay, tripTotalDays])

  const handleToday = useCallback(() => {
    const diffDays = Math.floor((Date.now() - parsedStartDate.getTime()) / 86400000)
    const clamped = Math.max(0, Math.min(diffDays, Math.max(0, tripTotalDays - 1)))
    selectDay(clamped)
  }, [parsedStartDate, selectDay, tripTotalDays])

  // Week view shows up to 7 days, aligned to trip-week blocks starting at day 0.
  // The last week of a trip whose length is not a multiple of 7 will be partial.
  const weekStartIndex = useMemo(
    () => Math.floor(Math.max(0, selectedDayIndex) / 7) * 7,
    [selectedDayIndex],
  )

  const visibleWeekDays = useMemo(
    () => allDays.slice(weekStartIndex, weekStartIndex + 7),
    [allDays, weekStartIndex],
  )

  // ── Top-bar context label ────────────────────────────────
  const viewLabel = useMemo(() => {
    if (!trip) return ''
    const dateForIndex = (idx: number) =>
      new Date(parsedStartDate.getTime() + idx * 86400000)
    if (viewMode === 'day') {
      const d = dateForIndex(selectedDayIndex)
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      })
    }
    const last = Math.min(weekStartIndex + 6, tripTotalDays - 1)
    const start = dateForIndex(weekStartIndex)
    const end = dateForIndex(last)
    const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
    const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
    const startDay = start.getUTCDate()
    const endDay = end.getUTCDate()
    if (startMonth === endMonth) return `${startMonth} ${startDay} – ${endDay}`
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`
  }, [trip, parsedStartDate, viewMode, selectedDayIndex, weekStartIndex, tripTotalDays])

  const visibleActivityCount = useMemo(() => {
    if (viewMode === 'day') {
      return scheduledActivities.filter((a) => a.day === selectedDayIndex).length
    }
    const end = weekStartIndex + 7
    return scheduledActivities.filter((a) => a.day >= weekStartIndex && a.day < end).length
  }, [scheduledActivities, viewMode, selectedDayIndex, weekStartIndex])

  // ── Enrich activities with images for the map popup ─────
  // /api/images is fronted by Pexels/Unsplash and is permissive — calling it
  // in parallel for missing-image activities is fine. usePlaceImages is the
  // same hook the For-You panel uses, so React Query caches results and
  // shares them across the app.
  const activitiesNeedingImage = useMemo(
    () => scheduledActivities.filter((a) => !a.image && !!a.title),
    [scheduledActivities],
  )
  const imageQueries = useMemo(
    () => activitiesNeedingImage.map((a) =>
      `${a.title} ${trip?.destination ?? ''}`.trim(),
    ),
    [activitiesNeedingImage, trip?.destination],
  )
  const imageResults = usePlaceImages(imageQueries)
  const enrichedImageMap = useMemo(() => {
    const map = new Map<string, string>()
    activitiesNeedingImage.forEach((a, i) => {
      const url = imageResults[i]?.data?.url
      if (url) map.set(a.id, url)
    })
    return map
  }, [activitiesNeedingImage, imageResults])

  // ── Geocode missing activity coordinates ─────────────────
  // Activities created via paths that don't carry geo (AI itinerary, manual
  // entry, /api/places where the backend omitted lat/lng) end up with 0,0
  // and the map silently drops them. We backfill by geocoding the title
  // paired with the trip destination, with three layers:
  //   1. Persistent localStorage cache so revisits / reloads are instant.
  //   2. Sequential dispatch (~1 req/s) so Nominatim's rate limit doesn't
  //      eat the queue.
  //   3. A second fallback attempt against just the destination so titles
  //      Nominatim can't resolve still get *some* pin (centered on the
  //      trip's city) instead of disappearing forever.
  const [geocodedCoords, setGeocodedCoords] = useState<Map<string, { lat: number; lng: number }>>(
    () => loadGeocodeCacheIntoMap(),
  )
  const geocodeAttempted = useRef<Set<string>>(new Set())
  // Throttle persistence — every successful geocode triggers a state update
  // that re-renders the panel; we don't want to hit localStorage that often.
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      saveGeocodeMapToCache(geocodedCoords)
    }, 500)
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    }
  }, [geocodedCoords])

  useEffect(() => {
    const destination = trip?.destination ?? ''
    if (!destination) return
    const queue = scheduledActivities.filter(
      (a) =>
        (!a.latitude || a.latitude === 0) &&
        (!a.longitude || a.longitude === 0) &&
        !!a.title &&
        !geocodedCoords.has(a.id) &&
        !geocodeAttempted.current.has(a.id),
    )
    if (queue.length === 0) return

    let cancelled = false
    ;(async () => {
      // Pre-resolve the trip-destination centroid so unresolvable titles can
      // fall back to it instantly. Block the workers on this so we don't have
      // 10 activities all firing destination lookups in parallel later.
      let destinationFallback: { lat: number; lng: number } | null = null
      const tryQuery = async (q: string): Promise<{ lat: number; lng: number } | null> => {
        try {
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&limit=1`)
          if (!res.ok) return null
          const data = await res.json()
          const hit = Array.isArray(data) ? data?.[0] : null
          if (!hit?.lat || !hit?.lon) return null
          const lat = parseFloat(hit.lat)
          const lng = parseFloat(hit.lon)
          return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
        } catch {
          return null
        }
      }
      destinationFallback = await tryQuery(destination)
      if (cancelled) return

      // Two-worker pool. Each worker paces ~1.1s between its own requests so
      // the *total* request rate stays around 2 req/sec — Nominatim tolerates
      // short bursts at that rate while the strict 1/sec policy applies to
      // sustained heavy usage. For 10 activities this drops wall time from
      // ~11s to ~5s.
      const remaining = [...queue]
      const CONCURRENCY = 2
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (remaining.length > 0 && !cancelled) {
          const a = remaining.shift()
          if (!a) break
          geocodeAttempted.current.add(a.id)

          let coords = await tryQuery(`${a.title}, ${destination}`)
          if (!coords && destinationFallback) coords = destinationFallback

          if (coords && !cancelled) {
            setGeocodedCoords((prev) => {
              if (prev.has(a.id)) return prev
              const next = new Map(prev)
              next.set(a.id, coords!)
              return next
            })
          }
          // Pacing — each worker holds for 1.1s so combined rate ≈ 2/sec.
          await new Promise((resolve) => setTimeout(resolve, 1100))
        }
      })
      await Promise.all(workers)
    })()

    return () => {
      cancelled = true
    }
    // Intentionally NOT including `geocodedCoords` — that would re-run the
    // effect every time we add a coord, restarting the queue and replaying
    // already-attempted lookups. We track attempts in a ref instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledActivities, trip?.destination])

  // ── Drag-and-drop ────────────────────────────────────────
  const weekGridRef = useRef<HTMLDivElement>(null)
  const { sensors, activeId, activeData, pendingDrop, handleDragStart, handleDragMove, handleDragEnd, handleDragCancel } = useCalendarDnd({
    onMoveActivity: moveActivity,
    onAddFromSuggestion: (activity) => addActivity(activity),
    scrollRef: weekGridRef,
    timeRangeStartHour: timeRange.startHour,
    hourHeight: dynamicHourHeight,
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
  // Day view: just the selected day. Week view: every activity in the visible
  // 7-day window — otherwise the map is silently empty whenever the user
  // hasn't explicitly clicked a day with pinned activities yet.
  // Coords come from the activity itself when present, otherwise from the
  // background geocoder (`geocodedCoords`).
  const currentDayMapActivities = useMemo(() => {
    const dayInWindow = (day: number) =>
      viewMode === 'day' ? day === selectedDayIndex : day >= weekStartIndex && day < weekStartIndex + 7

    const result: { id: string; title: string; latitude: number; longitude: number; startHour: number; image?: string | null; day: number }[] = []
    for (const a of scheduledActivities) {
      if (!dayInWindow(a.day)) continue
      let lat = a.latitude ?? 0
      let lng = a.longitude ?? 0
      if (!lat || !lng || (lat === 0 && lng === 0)) {
        const fallback = geocodedCoords.get(a.id)
        if (!fallback) continue
        lat = fallback.lat
        lng = fallback.lng
      }
      result.push({
        id: a.id,
        title: a.title,
        latitude: lat,
        longitude: lng,
        startHour: a.startHour,
        image: a.image ?? enrichedImageMap.get(a.id) ?? null,
        day: a.day,
      })
    }
    // Day-then-hour sort so the numbered pins (and the route line connecting
    // them) traverse the trip chronologically — Day 1 morning → Day 1 evening
    // → Day 2 morning → … — rather than interleaving days by hour-of-day.
    return result
      .sort((a, b) => a.day - b.day || a.startHour - b.startHour)
      .map(({ day: _day, ...rest }) => rest)
  }, [scheduledActivities, viewMode, selectedDayIndex, weekStartIndex, geocodedCoords, enrichedImageMap])

  // ── Loading / error states ───────────────────────────────
  if (isLoading) return <CalendarSkeleton />
  if (errorMsg || !trip) return <CalendarError message={errorMsg ?? 'Failed to load trip'} />

  // ── Render ────────────────────────────────────────────────
  const selectedDayLabel = allDays[selectedDayIndex]?.label ?? ''

  return (
    <CalendarThemeContext.Provider value={{ isDark: theme === 'dark' }}>
      <HourHeightProvider value={dynamicHourHeight}>
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
            viewLabel={viewLabel}
            activityCount={visibleActivityCount}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onWeekChange={handleWeekChange}
            onToday={handleToday}
            panelCollapsed={panelCollapsed}
            onTogglePanel={togglePanelCollapsed}
          />

          {/* Two-column layout (left date nav hidden) */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* Center: Calendar Grid */}
            <div ref={weekGridRef} className="flex flex-col flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
              {viewMode === 'week' ? (
                <WeekView
                  days={visibleWeekDays}
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
              aria-hidden={panelCollapsed}
              className={[
                'flex-shrink-0 bg-[var(--cal-bg)] relative overflow-hidden',
                panelCollapsed ? 'border-l-0 pointer-events-none' : 'border-l border-[var(--cal-border)]',
                isDragging ? '' : 'transition-[width] duration-200 ease-out',
              ].join(' ')}
              style={{ width: effectivePanelWidth }}
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
                  dayLabel={allDays[regeneratingDayIndex]?.label ?? ''}
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
                  mapContent={(() => {
                    // Count activities in the visible window so we can tell
                    // the user how many pins are still locating themselves.
                    const dayInWindow = (day: number) =>
                      viewMode === 'day' ? day === selectedDayIndex : day >= weekStartIndex && day < weekStartIndex + 7
                    const totalInWindow = scheduledActivities.filter((a) => dayInWindow(a.day)).length
                    const pinned = currentDayMapActivities.length
                    const stillLocating = Math.max(0, totalInWindow - pinned)

                    const headerLabel = viewMode === 'day'
                      ? `${viewLabel || selectedDayLabel}`
                      : `Week of ${viewLabel || 'this trip'}`
                    const subtext = totalInWindow === 0
                      ? viewMode === 'day'
                        ? 'No activities on this day yet'
                        : 'No activities this week yet'
                      : pinned === 0
                        ? `Locating ${stillLocating} ${stillLocating === 1 ? 'stop' : 'stops'}…`
                        : `${pinned} of ${totalInWindow} ${totalInWindow === 1 ? 'stop' : 'stops'} mapped${stillLocating > 0 ? ` · locating ${stillLocating} more…` : ''}`

                    return (
                      <div className="flex flex-col h-full">
                        <div className="px-3.5 pt-3.5 pb-2.5 border-b border-cal-border">
                          <h2 className="text-sm font-semibold text-cal-text">{headerLabel}</h2>
                          <p className="text-[11px] text-cal-text-tertiary mt-0.5">{subtext}</p>
                        </div>
                        <div className="flex-1 min-h-0">
                          <DayMap
                            activities={currentDayMapActivities}
                            selectedActivityId={selectedEventId}
                            onSelectActivity={(id) => handleSelectEvent(id)}
                            className="h-full"
                          />
                        </div>
                      </div>
                    )
                  })()}
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
      </HourHeightProvider>
    </CalendarThemeContext.Provider>
  )
}
