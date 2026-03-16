'use client'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import { HOUR_HEIGHT } from './constants'
import { formatTimeRange } from './utils'
import type { CalendarActivity, UserAwareness } from './types'

interface EventBlockProps {
  activity: CalendarActivity
  viewers?: UserAwareness[]
  isSelected?: boolean
  onSelect: (id: string) => void
  timeRangeStartHour: number
}

export function EventBlock({
  activity,
  viewers = [],
  isSelected = false,
  onSelect,
  timeRangeStartHour,
}: EventBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: activity.id,
    data: { activity },
  })

  const style: React.CSSProperties = {
    position: 'absolute',
    top: (activity.startHour - timeRangeStartHour) * HOUR_HEIGHT,
    height: Math.max(activity.duration * HOUR_HEIGHT - 2, 20),
    left: 4,
    right: 4,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: getActivityColor(activity.type),
    zIndex: isDragging ? 50 : isSelected ? 10 : 1,
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(activity.id)
    }
  }

  const activeViewers = viewers.filter(
    (v) => v.selectedEventId === activity.id && v.isOnline,
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="gridcell"
      tabIndex={0}
      aria-label={`${activity.title}, ${formatTimeRange(activity)}`}
      aria-selected={isSelected}
      className={[
        'rounded-md px-2 py-1 cursor-grab active:cursor-grabbing overflow-hidden select-none',
        'text-white text-xs flex flex-col gap-0.5',
        'ring-2 ring-transparent transition-shadow',
        isSelected ? 'ring-white ring-offset-1' : 'hover:ring-white/40',
        'focus:outline-none focus:ring-white focus:ring-offset-1',
      ].join(' ')}
      onClick={() => onSelect(activity.id)}
      onKeyDown={handleKeyDown}
    >
      <span className="font-semibold truncate leading-tight">{activity.title}</span>
      <span className="opacity-80 truncate">{formatTimeRange(activity)}</span>
      {activity.location && (
        <span className="opacity-70 truncate text-[10px]">{activity.location}</span>
      )}
      {activeViewers.length > 0 && (
        <div className="flex gap-0.5 mt-auto pt-0.5">
          {activeViewers.slice(0, 5).map((viewer) => (
            <span
              key={viewer.userId}
              title={viewer.name}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white ring-1 ring-white/50"
              style={{ backgroundColor: viewer.color }}
            >
              {viewer.avatarInitial}
            </span>
          ))}
          {activeViewers.length > 5 && (
            <span className="text-[9px] opacity-80">+{activeViewers.length - 5}</span>
          )}
        </div>
      )}
    </div>
  )
}
