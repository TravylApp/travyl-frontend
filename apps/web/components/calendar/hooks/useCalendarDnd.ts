import { useState, useCallback } from 'react'
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
  DragOverEvent,
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
  }, [])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over, delta } = event
      if (!over) {
        setPendingDrop(null)
        return
      }

      const overIdStr = String(over.id)
      let newDay: number | null = null
      if (overIdStr.startsWith('day-')) {
        const parsed = parseInt(overIdStr.replace('day-', ''), 10)
        if (!isNaN(parsed)) newDay = parsed
      }
      if (newDay === null) {
        setPendingDrop(null)
        return
      }

      const dragData = active.data?.current as
        | { type: 'activity'; activity: CalendarActivity }
        | { type: 'suggestion'; suggestion: SuggestionCard }
        | { type: 'note'; note: TripNote }
        | undefined

      if (!dragData) return

      if (dragData.type === 'activity') {
        const rawHourDelta = delta.y / HOUR_HEIGHT
        const snappedHourDelta = Math.round(rawHourDelta * 2) / 2
        const currentStartHour = dragData.activity.startHour ?? 0
        const newStartHour = Math.max(0, Math.min(23, currentStartHour + snappedHourDelta))
        setPendingDrop({
          dayIndex: newDay,
          activity: { ...dragData.activity, day: newDay, startHour: newStartHour },
        })
      } else if (dragData.type === 'suggestion') {
        const overRect = over.rect
        const scrollTop = scrollRef.current?.scrollTop ?? 0
        const pointerY = (event.activatorEvent as PointerEvent)?.clientY ?? 0
        const dropY = pointerY + delta.y
        const gridRelativeY = dropY - overRect.top + scrollTop
        const rawHour = timeRangeStartHour + gridRelativeY / HOUR_HEIGHT
        const snappedStartHour = Math.max(0, Math.min(23, Math.round(rawHour * 2) / 2))
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
    [scrollRef, timeRangeStartHour],
  )

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setActiveData(null)
    setPendingDrop(null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      setActiveData(null)
      setPendingDrop(null)
      const { active, over, delta } = event

      if (!over) return

      const overIdStr = String(over.id)
      let newDay: number | null = null

      if (overIdStr.startsWith('day-')) {
        const parsed = parseInt(overIdStr.replace('day-', ''), 10)
        if (!isNaN(parsed)) newDay = parsed
      }

      if (newDay === null) return

      const dragData = active.data?.current as
        | { type: 'activity'; activity: CalendarActivity }
        | { type: 'suggestion'; suggestion: SuggestionCard }
        | { type: 'note'; note: TripNote }
        | undefined

      if (!dragData) return

      if (dragData.type === 'activity') {
        const rawHourDelta = delta.y / HOUR_HEIGHT
        const snappedHourDelta = Math.round(rawHourDelta * 2) / 2
        const currentStartHour = dragData.activity.startHour ?? 0
        const newStartHour = Math.max(0, Math.min(23, currentStartHour + snappedHourDelta))

        if (marqueeSelectedIds && marqueeSelectedIds.has(String(active.id)) && marqueeSelectedIds.size > 1 && onGroupMove) {
          const dayDelta = newDay - dragData.activity.day
          const hourDelta = newStartHour - currentStartHour
          onGroupMove(dayDelta, hourDelta)
        } else {
          onMoveActivity(String(active.id), newDay, newStartHour)
        }
      } else if (dragData.type === 'suggestion') {
        // New activity from suggestion — compute absolute drop position on grid
        const overRect = over.rect
        const scrollTop = scrollRef.current?.scrollTop ?? 0
        const pointerY = (event.activatorEvent as PointerEvent)?.clientY ?? 0
        const dropY = pointerY + delta.y
        // Convert from screen Y to grid-relative Y
        const gridRelativeY = dropY - overRect.top + scrollTop
        const rawHour = timeRangeStartHour + gridRelativeY / HOUR_HEIGHT
        const snappedStartHour = Math.max(0, Math.min(23, Math.round(rawHour * 2) / 2))

        const newActivity = suggestionToCalendarActivity(
          dragData.suggestion,
          newDay,
          snappedStartHour,
        )
        onAddFromSuggestion(newActivity, dragData.suggestion.id)
      } else if (dragData.type === 'note' && onMoveNote) {
        // Note move — use same absolute-position logic as suggestion
        const overRect = over.rect
        const scrollTop = scrollRef.current?.scrollTop ?? 0
        const pointerY = (event.activatorEvent as PointerEvent)?.clientY ?? 0
        const dropY = pointerY + delta.y
        const gridRelativeY = dropY - overRect.top + scrollTop
        const rawHour = timeRangeStartHour + gridRelativeY / HOUR_HEIGHT
        const targetHour = Math.max(0, Math.min(23, Math.round(rawHour * 2) / 2))
        onMoveNote(dragData.note.id, newDay, targetHour)
      }
    },
    [onMoveActivity, onAddFromSuggestion, onMoveNote, onGroupMove, marqueeSelectedIds, scrollRef, timeRangeStartHour],
  )

  return {
    sensors,
    activeId,
    activeData,
    pendingDrop,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  }
}
