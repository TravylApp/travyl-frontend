'use client'
import { TimeGutter } from './TimeGutter'
import { DayColumn } from './DayColumn'
import type { CalendarActivity, UserAwareness, TimeRange } from './types'
import type { Poll } from '@travyl/shared'

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
  polls?: Map<string, Poll>
  pollUserId?: string
  onVotePoll?: (activityId: string, vote: 'yes' | 'no') => void
  ghostActivities?: CalendarActivity[]
  onConfirmGhost?: (activity: CalendarActivity) => void
  onDismissGhost?: (id: string) => void
  tripId?: string
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
  polls,
  pollUserId,
  onVotePoll,
  ghostActivities,
  onConfirmGhost,
  onDismissGhost,
  tripId,
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
          polls={polls}
          pollUserId={pollUserId}
          onVotePoll={onVotePoll}
          ghostActivities={ghostActivities}
          onConfirmGhost={onConfirmGhost}
          onDismissGhost={onDismissGhost}
          tripId={tripId}
          isDayView={true}
        />
      </div>
    </div>
  )
}
