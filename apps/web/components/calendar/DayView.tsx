'use client'
import { TimeGutter } from './TimeGutter'
import { DayColumn } from './DayColumn'
import type { CalendarActivity, UserAwareness, TimeRange } from './types'
import type { Poll } from '@travyl/shared'

interface DayViewProps {
  dayIndex: number
  label: string
  activities: CalendarActivity[]
  viewers?: UserAwareness[]
  selectedEventId?: string | null
  timeRange: TimeRange
  tripStartDate: Date
  onSelectEvent: (id: string) => void
  onDeselect: () => void
  pendingDrop?: { dayIndex: number; activity: CalendarActivity } | null
  onResize?: (id: string, newStartHour: number, newDuration: number) => void
  polls?: Map<string, Poll>
  pollUserId?: string
  pollCollaborators?: UserAwareness[]
  tripOwnerId?: string
  onVote?: (activityId: string, vote: 'yes' | 'no') => void
  onStartPoll?: (activityId: string) => void
  onClosePoll?: (activityId: string) => void
  onRestoreActivity?: (activityId: string) => void
  onRemoveActivity?: (activityId: string) => void
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
  onResize,
  polls,
  pollUserId,
  pollCollaborators,
  tripOwnerId,
  onVote,
  onStartPoll,
  onClosePoll,
  onRestoreActivity,
  onRemoveActivity,
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
        />
      </div>
    </div>
  )
}
