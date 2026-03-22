'use client'
import { TimeGutter } from './TimeGutter'
import { DayColumn } from './DayColumn'
import type { CalendarActivity, UserAwareness, TimeRange } from './types'

interface WeekViewProps {
  days: { dayIndex: number; label: string }[]
  activities: CalendarActivity[]
  viewers?: UserAwareness[]
  selectedEventId?: string | null
  timeRange: TimeRange
  tripStartDate: Date
  onClickEvent: (id: string, anchorEl: HTMLElement) => void
  onClickDayHeader?: (dayIndex: number) => void
  onDeselect: () => void
  pendingDrop?: { dayIndex: number; activity: CalendarActivity } | null
  onResize?: (id: string, newStartHour: number, newDuration: number) => void
  marqueeSelectedIds?: Set<string>
  gridRef?: React.RefObject<HTMLDivElement | null>
  marqueeOverlay?: React.ReactNode
  onShiftClickEvent?: (id: string) => void
}

export function WeekView({
  days,
  activities,
  viewers = [],
  selectedEventId = null,
  timeRange,
  tripStartDate,
  onClickEvent,
  onClickDayHeader,
  onDeselect,
  pendingDrop = null,
  onResize,
  marqueeSelectedIds,
  gridRef,
  marqueeOverlay,
  onShiftClickEvent,
}: WeekViewProps) {
  return (
    <div role="grid" className="flex flex-1 min-w-0">
      <TimeGutter timeRange={timeRange} />
      <div ref={gridRef} className="flex flex-1 min-w-0 relative">
        {days.map(({ dayIndex, label }) => {
          const dayActivities = activities.filter((a) => a.day === dayIndex)
          return (
            <DayColumn
              key={dayIndex}
              dayIndex={dayIndex}
              label={label}
              activities={dayActivities}
              viewers={viewers}
              selectedEventId={selectedEventId}
              timeRange={timeRange}
              tripStartDate={tripStartDate}
              onClickEvent={onClickEvent}
              onClickDayHeader={
                onClickDayHeader ? () => onClickDayHeader(dayIndex) : undefined
              }
              onDeselect={onDeselect}
              pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
              onResize={onResize}
              marqueeSelectedIds={marqueeSelectedIds}
              onShiftClickEvent={onShiftClickEvent}
            />
          )
        })}
        {marqueeOverlay}
      </div>
    </div>
  )
}
