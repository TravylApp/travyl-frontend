'use client'
import { useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { HOUR_HEIGHT } from './constants'
import { EventBlock } from './EventBlock'
import type { CalendarActivity, UserAwareness, TimeRange } from './types'

interface DayColumnProps {
  dayIndex: number
  label: string
  activities: CalendarActivity[]
  viewers?: UserAwareness[]
  selectedEventId?: string | null
  timeRange: TimeRange
  tripStartDate: Date
  onSelectEvent: (id: string) => void
  onClickDayHeader?: () => void
  onCreateActivity?: (dayIndex: number, startHour: number) => void
}

function CurrentTimeIndicator({
  dayIndex,
  tripStartDate,
  timeRange,
}: {
  dayIndex: number
  tripStartDate: Date
  timeRange: TimeRange
}) {
  const now = new Date()
  // Compute the UTC date for this column
  const columnDate = new Date(tripStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000)
  const isToday =
    now.getUTCFullYear() === columnDate.getUTCFullYear() &&
    now.getUTCMonth() === columnDate.getUTCMonth() &&
    now.getUTCDate() === columnDate.getUTCDate()

  if (!isToday) return null

  const currentHour = now.getHours() + now.getMinutes() / 60
  const top = (currentHour - timeRange.startHour) * HOUR_HEIGHT

  if (top < 0 || top > (timeRange.endHour - timeRange.startHour) * HOUR_HEIGHT) return null

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-10"
      style={{ top }}
    >
      <div className="relative flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 -ml-1.5" />
        <div className="flex-1 h-px bg-red-500" />
      </div>
    </div>
  )
}

export function DayColumn({
  dayIndex,
  label,
  activities,
  viewers = [],
  selectedEventId = null,
  timeRange,
  tripStartDate,
  onSelectEvent,
  onClickDayHeader,
  onCreateActivity,
}: DayColumnProps) {
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mouseDownPos.current || !onCreateActivity) return
    const dx = Math.abs(e.clientX - mouseDownPos.current.x)
    const dy = Math.abs(e.clientY - mouseDownPos.current.y)
    mouseDownPos.current = null
    if (dx < 5 && dy < 5) {
      const rect = e.currentTarget.getBoundingClientRect()
      const offsetY = e.clientY - rect.top
      const rawHour = timeRange.startHour + offsetY / HOUR_HEIGHT
      const snappedHour = Math.round(rawHour * 2) / 2
      onCreateActivity(dayIndex, snappedHour)
    }
  }

  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dayIndex}`,
    data: { dayIndex },
  })

  const hourCount = timeRange.endHour - timeRange.startHour
  const hours: number[] = []
  for (let h = timeRange.startHour; h <= timeRange.endHour; h++) hours.push(h)

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Day header */}
      <div
        className={[
          'text-center text-xs font-medium py-1 border-b border-gray-200 dark:border-gray-700 select-none',
          onClickDayHeader
            ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
            : '',
        ].join(' ')}
        onClick={onClickDayHeader}
        role={onClickDayHeader ? 'button' : undefined}
        tabIndex={onClickDayHeader ? 0 : undefined}
        onKeyDown={
          onClickDayHeader
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClickDayHeader()
                }
              }
            : undefined
        }
      >
        {label}
      </div>

      {/* Droppable grid */}
      <div
        ref={setNodeRef}
        className={[
          'relative flex-1 border-l border-gray-200 dark:border-gray-700',
          isOver ? 'bg-blue-50 dark:bg-blue-900/20' : '',
        ].join(' ')}
        style={{ height: hourCount * HOUR_HEIGHT }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Hour grid lines */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute w-full border-t border-gray-100 dark:border-gray-800 pointer-events-none"
            style={{ top: (hour - timeRange.startHour) * HOUR_HEIGHT }}
          />
        ))}

        {/* Half-hour tick lines */}
        {hours.map((hour) => (
          <div
            key={`half-${hour}`}
            className="absolute w-full border-t border-dashed border-gray-100 dark:border-gray-800 pointer-events-none opacity-60"
            style={{ top: (hour - timeRange.startHour) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
          />
        ))}

        {/* Event blocks */}
        {activities.map((activity) => (
          <EventBlock
            key={activity.id}
            activity={activity}
            viewers={viewers}
            isSelected={selectedEventId === activity.id}
            onSelect={onSelectEvent}
            timeRangeStartHour={timeRange.startHour}
          />
        ))}

        {/* Current time indicator */}
        <CurrentTimeIndicator
          dayIndex={dayIndex}
          tripStartDate={tripStartDate}
          timeRange={timeRange}
        />
      </div>
    </div>
  )
}
