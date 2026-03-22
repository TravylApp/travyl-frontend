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
  onSelectEvent: (id: string) => void
  onClickDayHeader?: (dayIndex: number) => void
  onCreateActivity?: (dayIndex: number, startHour: number) => void
  pendingDrop?: { dayIndex: number; activity: CalendarActivity } | null
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
  onSelectEvent,
  onClickDayHeader,
  onCreateActivity,
  pendingDrop = null,
  marqueeSelectedIds,
  gridRef,
  marqueeOverlay,
  onShiftClickEvent,
}: WeekViewProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onSelectEvent('')
    }
  }

  return (
    <div role="grid" className="flex flex-1 min-w-0" onKeyDown={handleKeyDown}>
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
              onSelectEvent={onSelectEvent}
              onClickDayHeader={
                onClickDayHeader ? () => onClickDayHeader(dayIndex) : undefined
              }
              onCreateActivity={onCreateActivity}
              pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
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
