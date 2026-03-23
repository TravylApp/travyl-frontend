'use client'
import { TimeGutter } from './TimeGutter'
import { DayColumn } from './DayColumn'
import type { CalendarActivity, UserAwareness, TimeRange } from './types'

export interface DayViewProps {
  dayIndex: number
  label: string
  activities: CalendarActivity[]
  viewers?: UserAwareness[]
  selectedEventId?: string | null
  timeRange: TimeRange
  tripStartDate: Date
  onSelectEvent: (id: string, anchorEl?: HTMLElement) => void
  onDeselect: () => void
  pendingDrop?: { dayIndex: number; activity: CalendarActivity } | null
  onResizeEvent?: (id: string, newStartHour: number, newDuration: number) => void
  onContextMenu?: (id: string, x: number, y: number) => void
}

export function DayView({
  dayIndex,
  label,
  activities,
  viewers = [],
  selectedEventId = null,
  timeRange,
  tripStartDate,
  onSelectEvent,
  onDeselect,
  pendingDrop = null,
  onResizeEvent,
  onContextMenu,
}: DayViewProps) {
  const dayActivities = activities.filter((a) => a.day === dayIndex)

  return (
    <div role="grid" className="flex flex-1 overflow-auto">
      <TimeGutter timeRange={timeRange} />
      <div className="flex flex-1 min-w-0">
        <DayColumn
          dayIndex={dayIndex}
          label={label}
          activities={dayActivities}
          viewers={viewers}
          selectedEventId={selectedEventId}
          timeRange={timeRange}
          tripStartDate={tripStartDate}
          onSelectEvent={onSelectEvent}
          onClickDayHeader={undefined}
          onDeselect={onDeselect}
          pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
          onResizeEvent={onResizeEvent}
          onContextMenu={onContextMenu}
        />
      </div>
    </div>
  )
}
