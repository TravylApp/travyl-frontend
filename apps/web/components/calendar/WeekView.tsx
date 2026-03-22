'use client'
import { TimeGutter } from './TimeGutter'
import { DayColumn } from './DayColumn'
import type { CalendarActivity, UserAwareness, TimeRange } from './types'
import type { Poll } from '@travyl/shared'

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
  marqueeSelectedIds?: Set<string>
  gridRef?: React.RefObject<HTMLDivElement | null>
  marqueeOverlay?: React.ReactNode
  onShiftClickEvent?: (id: string) => void
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
  marqueeSelectedIds,
  gridRef,
  marqueeOverlay,
  onShiftClickEvent,
  polls,
  pollUserId,
  pollCollaborators,
  tripOwnerId,
  onVote,
  onStartPoll,
  onClosePoll,
  onRestoreActivity,
  onRemoveActivity,
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
              onCreateActivity={onCreateActivity}
              pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
              onResize={onResize}
              marqueeSelectedIds={marqueeSelectedIds}
              onShiftClickEvent={onShiftClickEvent}
              polls={polls}
              pollUserId={pollUserId}
              pollCollaborators={pollCollaborators}
              tripOwnerId={tripOwnerId}
              onVote={onVote}
              onStartPoll={onStartPoll}
              onClosePoll={onClosePoll}
              onRestoreActivity={onRestoreActivity}
              onRemoveActivity={onRemoveActivity}
            />
          )
        })}
        {marqueeOverlay}
      </div>
    </div>
  )
}
