'use client'
import { TimeGutter } from './TimeGutter'
import { DayColumn } from './DayColumn'
import type { CalendarActivity, UserAwareness, TimeRange } from './types'

interface DayViewProps {
  dayIndex: number
  label: string
  activities: CalendarActivity[]
  viewers?: UserAwareness[]
  selectedEventId?: string | null
  timeRange: TimeRange
  onSelectEvent: (id: string) => void
}

export function DayView({
  dayIndex,
  label,
  activities,
  viewers = [],
  selectedEventId = null,
  timeRange,
  onSelectEvent,
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
          onSelectEvent={onSelectEvent}
          onClickDayHeader={undefined}
        />
      </div>
    </div>
  )
}
