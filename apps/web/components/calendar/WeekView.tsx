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
  onCreateActivity?: (dayIndex: number, startHour: number) => void
  pendingDrop?: { dayIndex: number; activity: CalendarActivity } | null
  onResize?: (id: string, newStartHour: number, newDuration: number) => void
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
  onCreateActivity,
  pendingDrop = null,
  onResize,
}: WeekViewProps) {
  return (
    <div role="grid" className="flex flex-1 min-w-0">
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
              tripStartDate={tripStartDate}
              onClickEvent={onClickEvent}
              onClickDayHeader={
                onClickDayHeader ? () => onClickDayHeader(dayIndex) : undefined
              }
              onCreateActivity={onCreateActivity}
              pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
              onResize={onResize}
            />
          )
        })}
      </div>
    </div>
  )
}
