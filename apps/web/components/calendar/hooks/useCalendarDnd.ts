import { useState, useCallback } from 'react'
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { HOUR_HEIGHT } from '../constants'
import type { CalendarActivity } from '../types'

// Re-export DndContext for convenience, though CalendarDashboard imports it directly
export { DndContext } from '@dnd-kit/core'

interface UseCalendarDndOptions {
  onMoveActivity: (id: string, newDay: number, newStartHour: number) => void
}

export function useCalendarDnd({ onMoveActivity }: UseCalendarDndOptions) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over, delta } = event

      if (!over) return

      const activityId = String(active.id)

      // Drop target id encodes the day index as "day-{dayIndex}"
      const overIdStr = String(over.id)
      let newDay: number | null = null

      if (overIdStr.startsWith('day-')) {
        const parsed = parseInt(overIdStr.replace('day-', ''), 10)
        if (!isNaN(parsed)) newDay = parsed
      }

      if (newDay === null) return

      // Compute hour delta from vertical pixel delta, snapped to 30 min increments
      const rawHourDelta = delta.y / HOUR_HEIGHT
      const snappedHourDelta = Math.round(rawHourDelta * 2) / 2 // snap to 0.5h

      // Get current startHour from active.data if available, otherwise 0
      const currentActivity = active.data?.current as CalendarActivity | undefined
      const currentStartHour = currentActivity?.startHour ?? 0

      const newStartHour = Math.max(0, Math.min(23, currentStartHour + snappedHourDelta))

      onMoveActivity(activityId, newDay, newStartHour)
    },
    [onMoveActivity],
  )

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
  }
}
