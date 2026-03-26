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
import { HOUR_HEIGHT } from '../constants'
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
  /** Ref to the scrollable grid container — used to compute absolute drop position for suggestions */
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Start hour of the visible time range (e.g., 7 for 7 AM) */
  timeRangeStartHour: number
}

/**
 * Compute the hour on the calendar grid by measuring the actual DOM element.
 * Queries `[data-day-grid="N"]` for a fresh getBoundingClientRect() — never stale.
 */
function cursorToHour(
  cursorY: number,
  dayIndex: number,
  timeRangeStartHour: number,
): number {
  const gridEl = document.querySelector(`[data-day-grid="${dayIndex}"]`)
  if (!gridEl) return timeRangeStartHour
  const rect = gridEl.getBoundingClientRect()
  const gridRelativeY = cursorY - rect.top
  const rawHour = timeRangeStartHour + gridRelativeY / HOUR_HEIGHT
  return Math.max(0, Math.min(23, Math.round(rawHour * 2) / 2))
}

export function useCalendarDnd({
  onMoveActivity,
  onAddFromSuggestion,
  onMoveNote,
  onGroupMove,
  marqueeSelectedIds,
  scrollRef,
  timeRangeStartHour,
}: UseCalendarDndOptions) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeData, setActiveData] = useState<DragData | null>(null)
  const [pendingDrop, setPendingDrop] = useState<{
    dayIndex: number
    activity: CalendarActivity
  } | null>(null)

  // Track the latest pointer position so we always use the current cursor Y,
  // not the stale activatorEvent from drag start.
  const lastPointerY = useRef(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  )

  const handleDragStart = useCallback((event: { active: { id: string | number; data?: { current?: unknown } } }) => {
    setActiveId(String(event.active.id))
    const data = event.active.data?.current as DragData | undefined
    setActiveData(data ?? null)

    // Track live pointer position throughout the drag
    const onPointerMove = (e: PointerEvent) => {
      lastPointerY.current = e.clientY
    }
    window.addEventListener('pointermove', onPointerMove)
    cleanupRef.current = () => window.removeEventListener('pointermove', onPointerMove)
  }, [])

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const { active, over } = event
      // When the pointer is in a dead zone (gap between columns, resize divider,
      // etc.) `over` is null. Keep the last known pendingDrop so the ghost doesn't
      // flicker/disappear as the user drags across column boundaries.
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

      if (dragData.type === 'activity') {
        const rawHourDelta = event.delta.y / HOUR_HEIGHT
        const snappedHourDelta = Math.round(rawHourDelta * 4) / 4
        const currentStartHour = dragData.activity.startHour ?? 0
        const newStartHour = Math.max(0, Math.min(23 - dragData.activity.duration, currentStartHour + snappedHourDelta))
        setPendingDrop({
          dayIndex: newDay,
          activity: { ...dragData.activity, day: newDay, startHour: newStartHour },
        })
      } else if (dragData.type === 'suggestion') {
        const cursorY = lastPointerY.current || (event.activatorEvent as PointerEvent)?.clientY || 0
        const snappedStartHour = cursorToHour(cursorY, newDay, timeRangeStartHour)
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
      }
    },
    [timeRangeStartHour],
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setActiveData(null)
    setPendingDrop(null)
    cleanupRef.current?.()
    cleanupRef.current = null
  }, [])

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

      if (dragData.type === 'activity') {
        const rawHourDelta = delta.y / HOUR_HEIGHT
        const snappedHourDelta = Math.round(rawHourDelta * 4) / 4
        const currentStartHour = dragData.activity.startHour ?? 0
        const newStartHour = Math.max(0, Math.min(23 - dragData.activity.duration, currentStartHour + snappedHourDelta))

        if (marqueeSelectedIds && marqueeSelectedIds.has(String(active.id)) && marqueeSelectedIds.size > 1) {
          const dayDelta = newDay - dragData.activity.day
          const hourDelta = newStartHour - currentStartHour
          if (onGroupMove) {
            onGroupMove(dayDelta, hourDelta)
          }
        } else {
          onMoveActivity(String(active.id), newDay, newStartHour)
        }
      } else if (dragData.type === 'suggestion') {
        const cursorY = lastPointerY.current || (event.activatorEvent as PointerEvent)?.clientY || 0
        const snappedStartHour = cursorToHour(cursorY, newDay, timeRangeStartHour)

        const newActivity = suggestionToCalendarActivity(
          dragData.suggestion,
          newDay,
          snappedStartHour,
        )
        onAddFromSuggestion(newActivity, dragData.suggestion.id)
      } else if (dragData.type === 'note' && onMoveNote) {
        const cursorY = lastPointerY.current || (event.activatorEvent as PointerEvent)?.clientY || 0
        const targetHour = cursorToHour(cursorY, newDay, timeRangeStartHour)
        onMoveNote(dragData.note.id, newDay, targetHour)
      }
    },
    [onMoveActivity, onAddFromSuggestion, onMoveNote, onGroupMove, marqueeSelectedIds, timeRangeStartHour],
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
