import { useState, useCallback, useRef } from 'react'
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
  DragMoveEvent,
} from '@dnd-kit/core'
import { suggestionToCalendarActivity } from '@travyl/shared/utils/suggestionMapper'
import { HOUR_HEIGHT as DEFAULT_HOUR_HEIGHT } from '../constants'
import type { CalendarActivity } from '../types'
import type { SuggestionCard } from '../types'
import type { TripNote } from '@travyl/shared'

// Re-export DndContext for convenience
export { DndContext } from '@dnd-kit/core'

export type DragData =
  | { type: 'activity'; activity: CalendarActivity }
  | { type: 'suggestion'; suggestion: SuggestionCard }
  | { type: 'note'; note: TripNote }

interface UseCalendarDndOptions {
  onMoveActivity: (id: string, newDay: number, newStartHour: number) => void
  onAddFromSuggestion: (activity: CalendarActivity, suggestionId: string) => void
  onMoveNote?: (noteId: string, day: number, hour: number) => void
  onGroupMove?: (dayDelta: number, hourDelta: number) => void
  marqueeSelectedIds?: Set<string>
  /** Ref to the scrollable grid container */
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Start hour of the visible time range (e.g., 7 for 7 AM) */
  timeRangeStartHour: number
  /** Pixels per hour. Defaults to the static constant when omitted. */
  hourHeight?: number
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Snap a fractional hour to the nearest N-minute increment.
 * When `free` is true, returns the raw value clamped to [0, 23].
 */
function snapHour(hour: number, incrementMinutes = 15, free = false): number {
  if (free) return Math.max(0, Math.min(23, hour))
  const incrementsPerHour = 60 / incrementMinutes
  return Math.max(0, Math.min(23, Math.round(hour * incrementsPerHour) / incrementsPerHour))
}

/**
 * Compute the absolute hour from a pointer Y position within a specific day's grid rect.
 * No DOM queries — uses the pre-cached rect.
 */
function computeHourFromPointer(
  clientY: number,
  dayIndex: number,
  gridRects: Map<number, DOMRect>,
  timeRangeStartHour: number,
  hourHeight: number,
): number | null {
  const rect = gridRects.get(dayIndex)
  if (!rect) return null
  const gridRelativeY = clientY - rect.top
  return timeRangeStartHour + gridRelativeY / hourHeight
}

/**
 * Re-cache all day grid rects by enumerating [data-day-grid] elements.
 * Called once at drag start and whenever the container scrolls.
 */
function collectGridRects(): Map<number, DOMRect> {
  const map = new Map<number, DOMRect>()
  const elements = document.querySelectorAll<HTMLElement>('[data-day-grid]')
  elements.forEach((el) => {
    const dayIndex = parseInt(el.getAttribute('data-day-grid') ?? '', 10)
    if (!isNaN(dayIndex)) {
      map.set(dayIndex, el.getBoundingClientRect())
    }
  })
  return map
}

/** Scroll speed (px per frame) — quadratic curve for natural feel */
function scrollSpeed(distanceFromEdge: number, threshold: number): number {
  if (distanceFromEdge > threshold) return 0
  const t = 1 - distanceFromEdge / threshold
  return t * t * 15
}

// ── Hook ───────────────────────────────────────────────────

export function useCalendarDnd({
  onMoveActivity,
  onAddFromSuggestion,
  onMoveNote,
  onGroupMove,
  marqueeSelectedIds,
  scrollRef,
  timeRangeStartHour,
  hourHeight = DEFAULT_HOUR_HEIGHT,
}: UseCalendarDndOptions) {
  const HOUR_HEIGHT = hourHeight
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeData, setActiveData] = useState<DragData | null>(null)
  const [pendingDrop, setPendingDrop] = useState<{
    dayIndex: number
    activity: CalendarActivity
  } | null>(null)

  // Pre-cached grid rects, rebuilt on drag start and after scroll
  const gridRectsRef = useRef<Map<number, DOMRect>>(new Map())
  // Latest pointer position (updated via pointermove listener)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  // Alt key state for snap override
  const altKeyRef = useRef(false)
  // Cleanup function for drag session
  const cleanupRef = useRef<(() => void) | null>(null)
  // Auto-scroll animation frame handle
  const scrollAnimRef = useRef<number | null>(null)
  // Ref to prevent concurrent re-cache
  const isCachingRef = useRef(false)

  // ── Sensors (Fix 4: touchAction handled via CSS on EventBlock) ──
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor),
  )

  // ── Auto-scroll ──────────────────────────────────────────
  const startAutoScroll = useCallback(() => {
    if (scrollAnimRef.current !== null) return

    const container = scrollRef.current
    if (!container) return

    const THRESHOLD = 80

    const tick = () => {
      if (!container) {
        scrollAnimRef.current = null
        return
      }
      const { x, y } = lastPointerRef.current
      if (x === 0 && y === 0) {
        scrollAnimRef.current = requestAnimationFrame(tick)
        return
      }

      const rect = container.getBoundingClientRect()
      let dx = 0
      let dy = 0

      // Horizontal
      const distR = rect.right - x
      dx = scrollSpeed(distR, THRESHOLD)
      if (dx === 0) {
        const distL = x - rect.left
        dx = -scrollSpeed(distL, THRESHOLD)
      }

      // Vertical
      const distB = rect.bottom - y
      dy = scrollSpeed(distB, THRESHOLD)
      if (dy === 0) {
        const distT = y - rect.top
        dy = -scrollSpeed(distT, THRESHOLD)
      }

      if (dx !== 0 || dy !== 0) {
        container.scrollBy({ left: dx * 0.4, top: dy * 0.4 })
        // Re-cache rects after scroll to keep positions accurate
        if (!isCachingRef.current) {
          isCachingRef.current = true
          gridRectsRef.current = collectGridRects()
          isCachingRef.current = false
        }
      }

      scrollAnimRef.current = requestAnimationFrame(tick)
    }

    scrollAnimRef.current = requestAnimationFrame(tick)
  }, [scrollRef])

  const stopAutoScroll = useCallback(() => {
    if (scrollAnimRef.current !== null) {
      cancelAnimationFrame(scrollAnimRef.current)
      scrollAnimRef.current = null
    }
  }, [])

  // ── Drag start ───────────────────────────────────────────
  const handleDragStart = useCallback((event: { active: { id: string | number; data?: { current?: unknown } } }) => {
    setActiveId(String(event.active.id))
    const data = event.active.data?.current as DragData | undefined
    setActiveData(data ?? null)

    // (Fix 2) Cache all grid rects once at drag start
    gridRectsRef.current = collectGridRects()

    // Track live pointer & Alt key throughout drag
    const onPointerMove = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altKeyRef.current = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') altKeyRef.current = false
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      stopAutoScroll()
    }
  }, [stopAutoScroll])

  // ── Drag move ────────────────────────────────────────────
  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active, over } = event
      // Dead zone: keep last known pendingDrop so ghost doesn't flicker
      if (!over) return

      const overIdStr = String(over.id)
      let newDay: number | null = null
      if (overIdStr.startsWith('day-')) {
        const parsed = parseInt(overIdStr.replace('day-', ''), 10)
        if (!isNaN(parsed)) newDay = parsed
      }
      if (newDay === null) return

      const dragData = active.data?.current as DragData | undefined
      if (!dragData) return

      // (Fix 3) Start auto-scrolling based on pointer proximity to edge
      startAutoScroll()

      // (Fix 6) Check Alt key for free-placement (no snap)
      const freeSnap = altKeyRef.current

      // (Fix 5) Use absolute pointer position for hour computation
      const { y } = lastPointerRef.current

      if (dragData.type === 'activity') {
        // (Fix 2 + Fix 5) Compute hour from cached rect + absolute pointer
        const absHour = computeHourFromPointer(y, newDay, gridRectsRef.current, timeRangeStartHour, HOUR_HEIGHT)
        // Fallback to delta-based if rect not cached
        const newStartHour = absHour !== null
          ? Math.max(0, Math.min(23 - dragData.activity.duration, snapHour(absHour, 15, freeSnap)))
          : Math.max(0, Math.min(23 - dragData.activity.duration,
              snapHour(dragData.activity.startHour + (event.delta.y / HOUR_HEIGHT), 15, freeSnap)))

        setPendingDrop({
          dayIndex: newDay,
          activity: { ...dragData.activity, day: newDay, startHour: newStartHour },
        })
      } else if (dragData.type === 'suggestion') {
        const absHour = computeHourFromPointer(y, newDay, gridRectsRef.current, timeRangeStartHour, HOUR_HEIGHT)
        const snappedStartHour = absHour !== null
          ? snapHour(absHour, 15, freeSnap)
          : snapHour(timeRangeStartHour, 15, freeSnap)

        setPendingDrop({
          dayIndex: newDay,
          activity: {
            id: `pending-${dragData.suggestion.id}`,
            title: dragData.suggestion.name,
            type: dragData.suggestion.category as CalendarActivity['type'],
            day: newDay,
            startHour: snappedStartHour,
            duration: dragData.suggestion.duration,
          },
        })
      } else if (dragData.type === 'note') {
        const absHour = computeHourFromPointer(y, newDay, gridRectsRef.current, timeRangeStartHour, HOUR_HEIGHT)
        const targetHour = absHour !== null ? snapHour(absHour, 15, freeSnap) : timeRangeStartHour
        setPendingDrop({
          dayIndex: newDay,
          activity: {
            id: `pending-${dragData.note.id}`,
            title: dragData.note.text,
            type: 'other' as CalendarActivity['type'],
            day: newDay,
            startHour: targetHour,
            duration: 0.5,
          },
        })
      }
    },
    [timeRangeStartHour, startAutoScroll, HOUR_HEIGHT],
  )

  // ── Drag cancel ──────────────────────────────────────────
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setActiveData(null)
    setPendingDrop(null)
    cleanupRef.current?.()
    cleanupRef.current = null
  }, [])

  // ── Drag end ─────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      setActiveData(null)
      setPendingDrop(null)
      cleanupRef.current?.()
      cleanupRef.current = null

      const { active, over, delta } = event
      if (!over) return

      const overIdStr = String(over.id)
      let newDay: number | null = null
      if (overIdStr.startsWith('day-')) {
        const parsed = parseInt(overIdStr.replace('day-', ''), 10)
        if (!isNaN(parsed)) newDay = parsed
      }
      if (newDay === null) return

      const dragData = active.data?.current as DragData | undefined
      if (!dragData) return

      const freeSnap = altKeyRef.current
      const { y } = lastPointerRef.current

      if (dragData.type === 'activity') {
        const absHour = computeHourFromPointer(y, newDay, gridRectsRef.current, timeRangeStartHour, HOUR_HEIGHT)
        const finalStartHour = absHour !== null
          ? Math.max(0, Math.min(23 - dragData.activity.duration, snapHour(absHour, 15, freeSnap)))
          : Math.max(0, Math.min(23 - dragData.activity.duration,
              snapHour(dragData.activity.startHour + (delta.y / HOUR_HEIGHT), 15, freeSnap)))

        if (marqueeSelectedIds && marqueeSelectedIds.has(String(active.id)) && marqueeSelectedIds.size > 1) {
          const dayDelta = newDay - dragData.activity.day
          const hourDelta = finalStartHour - dragData.activity.startHour
          if (onGroupMove) onGroupMove(dayDelta, hourDelta)
        } else {
          onMoveActivity(String(active.id), newDay, finalStartHour)
        }
      } else if (dragData.type === 'suggestion') {
        const absHour = computeHourFromPointer(y, newDay, gridRectsRef.current, timeRangeStartHour, HOUR_HEIGHT)
        const snappedStartHour = absHour !== null
          ? snapHour(absHour, 15, freeSnap)
          : snapHour(timeRangeStartHour, 15, freeSnap)

        const newActivity = suggestionToCalendarActivity(dragData.suggestion, newDay, snappedStartHour)
        onAddFromSuggestion(newActivity, dragData.suggestion.id)
      } else if (dragData.type === 'note' && onMoveNote) {
        const absHour = computeHourFromPointer(y, newDay, gridRectsRef.current, timeRangeStartHour, HOUR_HEIGHT)
        const targetHour = absHour !== null ? snapHour(absHour, 15, freeSnap) : timeRangeStartHour
        onMoveNote(dragData.note.id, newDay, targetHour)
      }
    },
    [onMoveActivity, onAddFromSuggestion, onMoveNote, onGroupMove, marqueeSelectedIds, timeRangeStartHour, HOUR_HEIGHT],
  )

  return {
    sensors,
    activeId,
    activeData,
    pendingDrop,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  }
}
