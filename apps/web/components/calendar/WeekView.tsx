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
  onSelectEvent: (id: string) => void
  onClickDayHeader?: (dayIndex: number) => void
}

export function WeekView({
  days,
  activities,
  viewers = [],
  selectedEventId = null,
  timeRange,
  onSelectEvent,
  onClickDayHeader,
}: WeekViewProps) {
  return (
    <div role="grid" className="flex flex-1 overflow-auto">
      <TimeGutter timeRange={timeRange} />
      <div className="flex flex-1 min-w-0">
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
              onSelectEvent={onSelectEvent}
              onClickDayHeader={
                onClickDayHeader ? () => onClickDayHeader(dayIndex) : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}
