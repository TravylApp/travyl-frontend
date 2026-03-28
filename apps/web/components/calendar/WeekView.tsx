'use client'
import { useState, useLayoutEffect, useRef, useCallback, Fragment } from 'react'
import { TimeGutter } from './TimeGutter'
import { DayColumn } from './DayColumn'
import { ResizeDivider } from './ResizeDivider'
import type { CalendarActivity, UserAwareness, TimeRange } from './types'
import type { Poll } from '@travyl/shared'

const MIN_COLUMN_WIDTH = 60

interface WeekViewProps {
  days: { dayIndex: number; label: string }[]
  activities: CalendarActivity[]
  viewers?: UserAwareness[]
  selectedEventId?: string | null
  timeRange: TimeRange
  tripStartDate: Date
  onSelectEvent: (id: string, anchorEl?: HTMLElement) => void
  onClickDayHeader?: (dayIndex: number) => void
  onDeselect: () => void
  pendingDrop?: { dayIndex: number; activity: CalendarActivity } | null
  marqueeSelectedIds?: Set<string>
  gridRef?: React.RefObject<HTMLDivElement | null>
  marqueeOverlay?: React.ReactNode
  onShiftClickEvent?: (id: string) => void
  onResizeEvent?: (id: string, newStartHour: number, newDuration: number) => void
  onContextMenu?: (id: string, x: number, y: number) => void
  polls?: Map<string, Poll>
  pollUserId?: string
  onVotePoll?: (activityId: string, vote: 'yes' | 'no') => void
  tripId?: string
}

export function WeekView({
  days,
  activities,
  viewers = [],
  selectedEventId = null,
  timeRange,
  tripStartDate,
  onSelectEvent,
  onClickDayHeader,
  onDeselect,
  pendingDrop = null,
  marqueeSelectedIds,
  gridRef,
  marqueeOverlay,
  onShiftClickEvent,
  onResizeEvent,
  onContextMenu,
  polls,
  pollUserId,
  onVotePoll,
  tripId,
}: WeekViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columnWidths, setColumnWidths] = useState<number[]>([])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el || days.length === 0) return

    const recalculate = () => {
      const equal = el.clientWidth / days.length
      setColumnWidths(days.map(() => equal))
    }

    recalculate()

    const observer = new ResizeObserver(recalculate)
    observer.observe(el)
    return () => observer.disconnect()
  }, [days.length])

  const handleColumnResize = useCallback((index: number, deltaX: number) => {
    setColumnWidths((prev) => {
      if (prev.length < index + 2) return prev
      const newLeft = (prev[index] ?? 0) + deltaX
      const newRight = (prev[index + 1] ?? 0) - deltaX
      if (newLeft < MIN_COLUMN_WIDTH || newRight < MIN_COLUMN_WIDTH) return prev
      const next = [...prev]
      next[index] = newLeft
      next[index + 1] = newRight
      return next
    })
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onSelectEvent('')
    }
  }

  return (
    <div role="grid" className="flex flex-1 min-w-0" onKeyDown={handleKeyDown}>
      <TimeGutter timeRange={timeRange} />
      <div
        ref={(el) => {
          containerRef.current = el
          if (gridRef) (gridRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        }}
        className="flex flex-1 min-w-0 relative"
      >
        {days.map(({ dayIndex, label }, i) => {
          const dayActivities = activities.filter((a) => a.day === dayIndex)
          const w = columnWidths[i]
          return (
            <Fragment key={dayIndex}>
              <div
                className="flex flex-col min-w-0"
                style={w !== undefined ? { width: w, flexShrink: 0, flexGrow: 0 } : { flex: '1 1 0', minWidth: 0 }}
              >
                <DayColumn
                  dayIndex={dayIndex}
                  label={label}
                  activities={dayActivities}
                  viewers={viewers}
                  selectedEventId={selectedEventId}
                  timeRange={timeRange}
                  tripStartDate={tripStartDate}
                  onSelectEvent={onSelectEvent}
                  onClickDayHeader={
                    onClickDayHeader ? () => onClickDayHeader(dayIndex) : undefined
                  }
                  onDeselect={onDeselect}
                  pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
                  marqueeSelectedIds={marqueeSelectedIds}
                  onShiftClickEvent={onShiftClickEvent}
                  onResizeEvent={onResizeEvent}
                  onContextMenu={onContextMenu}
                  polls={polls}
                  pollUserId={pollUserId}
                  onVotePoll={onVotePoll}
                  tripId={tripId}
                  isDayView={false}
                />
              </div>
              {i < days.length - 1 && (
                <ResizeDivider
                  width={w ?? 0}
                  onDragStart={() => {}}
                  onDrag={(dx) => handleColumnResize(i, dx)}
                  onDragEnd={() => {}}
                />
              )}
            </Fragment>
          )
        })}
        {marqueeOverlay}
      </div>
    </div>
  )
}
