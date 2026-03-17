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
  tripStartDate: Date
  onSelectEvent: (id: string) => void
  onCreateActivity?: (dayIndex: number, startHour: number) => void
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
  onCreateActivity,
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
          onCreateActivity={onCreateActivity}
        />
      </div>
    </div>
  )
}
