import { useState, useCallback, useRef } from 'react'
import type { CalendarActivity } from '../types'
import { HOUR_HEIGHT, COLUMN_OUTER_PAD, COLUMN_GAP } from '../constants'
import { computeOverlapLayout } from '@travyl/shared'

export interface MarqueeRect {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface UseMarqueeSelectionOptions {
  activities: CalendarActivity[]
  timeRangeStartHour: number
  dayCount: number
}

interface UseMarqueeSelectionReturn {
  selectedIds: Set<string>
  marqueeRect: MarqueeRect | null
  isMarqueeActive: boolean
  startMarquee: (x: number, y: number, containerRect: DOMRect) => void
  updateMarquee: (x: number, y: number) => void
  endMarquee: () => void
  toggleActivityInSelection: (activityId: string) => void
  clearSelection: () => void
  setSelectedIds: (ids: Set<string>) => void
}

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function useMarqueeSelection({
  activities,
  timeRangeStartHour,
  dayCount,
}: UseMarqueeSelectionOptions): UseMarqueeSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null)
  const containerRectRef = useRef<DOMRect | null>(null)

  const computeSelectedActivities = useCallback(
    (rect: MarqueeRect): Set<string> => {
      const containerRect = containerRectRef.current
      if (!containerRect) return new Set()

      const mLeft = Math.min(rect.startX, rect.endX)
      const mRight = Math.max(rect.startX, rect.endX)
      const mTop = Math.min(rect.startY, rect.endY)
      const mBottom = Math.max(rect.startY, rect.endY)

      const columnWidth = containerRect.width / dayCount
      const result = new Set<string>()

      const actsByDay = new Map<number, CalendarActivity[]>()
      for (const act of activities) {
        const list = actsByDay.get(act.day) ?? []
        list.push(act)
        actsByDay.set(act.day, list)
      }

      for (const [day, dayActs] of actsByDay) {
        const overlapLayout = computeOverlapLayout(dayActs)
        const dayLeft = day * columnWidth

        for (const act of dayActs) {
          const layout = overlapLayout.get(act.id)
          if (!layout || layout.column === -1) continue

          const availableWidth = columnWidth - 2 * COLUMN_OUTER_PAD
          const colWidth =
            (availableWidth - (layout.totalColumns - 1) * COLUMN_GAP) /
            layout.totalColumns
          const actLeft =
            dayLeft +
            COLUMN_OUTER_PAD +
            layout.column * (colWidth + COLUMN_GAP)
          const actRight = actLeft + colWidth
          const actTop = (act.startHour - timeRangeStartHour) * HOUR_HEIGHT
          const actBottom = actTop + act.duration * HOUR_HEIGHT

          if (
            rectsIntersect(
              { left: mLeft, top: mTop, right: mRight, bottom: mBottom },
              { left: actLeft, top: actTop, right: actRight, bottom: actBottom },
            )
          ) {
            result.add(act.id)
          }
        }
      }

      return result
    },
    [activities, timeRangeStartHour, dayCount],
  )

  const startMarquee = useCallback(
    (x: number, y: number, containerRect: DOMRect) => {
      containerRectRef.current = containerRect
      setMarqueeRect({ startX: x, startY: y, endX: x, endY: y })
    },
    [],
  )

  const updateMarquee = useCallback(
    (x: number, y: number) => {
      setMarqueeRect((prev) => {
        if (!prev) return null
        const next = { ...prev, endX: x, endY: y }
        const hits = computeSelectedActivities(next)
        setSelectedIds(hits)
        return next
      })
    },
    [computeSelectedActivities],
  )

  const endMarquee = useCallback(() => {
    setMarqueeRect(null)
  }, [])

  const toggleActivityInSelection = useCallback((activityId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(activityId)) {
        next.delete(activityId)
      } else {
        next.add(activityId)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setMarqueeRect(null)
  }, [])

  return {
    selectedIds,
    marqueeRect,
    isMarqueeActive: marqueeRect !== null,
    startMarquee,
    updateMarquee,
    endMarquee,
    toggleActivityInSelection,
    clearSelection,
    setSelectedIds,
  }
}
