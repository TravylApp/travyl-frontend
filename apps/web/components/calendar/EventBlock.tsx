'use client'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  getActivityColor,
  getActivityColorDark,
  getActivityColorDarkBorder,
} from '@travyl/shared/viewmodels/calendarViewModel'
import { HOUR_HEIGHT, COLUMN_GAP, COLUMN_OUTER_PAD } from './constants'
import { formatTimeRange } from './utils'
import { useCalendarThemeContext } from './CalendarThemeContext'
import { useResizeHandles } from './hooks/useResizeHandles'
import type { CalendarActivity, UserAwareness } from './types'
import type { Poll } from '@travyl/shared'
import { FloatingVoteButtons } from './PollBar'

interface EventBlockProps {
  activity: CalendarActivity
  viewers?: UserAwareness[]
  isSelected?: boolean
  isMultiSelected?: boolean
  onSelect: (id: string, anchorEl: HTMLElement) => void
  onShiftClick?: (id: string) => void
  onResize?: (id: string, newStartHour: number, newDuration: number) => void
  onContextMenu?: (id: string, x: number, y: number) => void
  poll?: Poll
  userId?: string
  onVote?: (activityId: string, vote: 'yes' | 'no') => void
  timeRangeStartHour: number
  timeRangeEndHour?: number
  column?: number
  totalColumns?: number
  hiddenCount?: number
}

export function EventBlock({
  activity,
  viewers = [],
  isSelected = false,
  isMultiSelected = false,
  onSelect,
  onShiftClick,
  onResize,
  onContextMenu,
  poll,
  userId,
  onVote,
  timeRangeStartHour,
  timeRangeEndHour = 24,
  column = 0,
  totalColumns = 1,
  hiddenCount = 0,
}: EventBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: activity.id,
    data: { type: 'activity' as const, activity },
  })

  const {
    isResizing,
    previewStartHour,
    previewDuration,
    topHandleProps,
    bottomHandleProps,
  } = useResizeHandles({
    startHour: activity.startHour,
    duration: activity.duration,
    timeRangeStartHour,
    timeRangeEndHour,
    onResize: (newStart, newDuration) => {
      onResize?.(activity.id, newStart, newDuration)
    },
  })

  const { isDark } = useCalendarThemeContext()

  const color = getActivityColor(activity.type)
  const hasImage = !!(activity.image && activity.duration >= 1)

  const bgColor = isDark ? getActivityColorDark(activity.type) : color
  const borderColor = isDark ? getActivityColorDarkBorder(activity.type) : `${color}88`

  // Column positioning — uses calc() with fixed pixel gaps
  // COLUMN_OUTER_PAD preserves the existing 4px inset on each side of the day column
  const availableWidth = `(100% - ${2 * COLUMN_OUTER_PAD}px)`
  const colWidth = `(${availableWidth} - ${(totalColumns - 1) * COLUMN_GAP}px) / ${totalColumns}`
  const leftOffset = column === 0
    ? `${COLUMN_OUTER_PAD}px`
    : `${COLUMN_OUTER_PAD}px + ${column} * (${colWidth} + ${COLUMN_GAP}px)`

  const displayStartHour = isResizing && previewStartHour !== null ? previewStartHour : activity.startHour
  const displayDuration = isResizing && previewDuration !== null ? previewDuration : activity.duration

  const style: React.CSSProperties = {
    position: 'absolute',
    top: (displayStartHour - timeRangeStartHour) * HOUR_HEIGHT,
    height: Math.max(displayDuration * HOUR_HEIGHT - 2, 20),
    left: `calc(${leftOffset})`,
    width: `calc(${colWidth})`,
    transform: isResizing ? undefined : CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : isResizing ? 40 : isSelected ? 10 : 1,
    borderLeft: `3px solid ${borderColor}`,
    transition: isDragging || isResizing ? undefined : 'left 150ms ease, width 150ms ease',
    ...(hasImage ? {} : { backgroundColor: bgColor }),
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(activity.id, e.currentTarget)
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
        'group rounded-md cursor-grab active:cursor-grabbing select-none relative',
        'text-white text-xs',
        isMultiSelected
          ? 'ring-2 ring-blue-400 bg-blue-500/10'
          : 'ring-2 ring-transparent',
        isDragging
          ? ''
          : `transition-[ring,shadow,opacity,transform] duration-150${!isSelected ? ' hover:-translate-y-px hover:shadow-lg' : ''}`,
        !isMultiSelected && (isSelected ? 'ring-2 ring-white ring-offset-2 scale-[1.02] shadow-lg' : 'hover:ring-white/40'),
        'focus:outline-none focus:ring-white focus:ring-offset-1',
      ].filter(Boolean).join(' ')}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.shiftKey && onShiftClick) {
          e.stopPropagation()
          onShiftClick(activity.id)
          return
        }
        onSelect(activity.id, e.currentTarget)
      }}
      onContextMenu={(e: React.MouseEvent<HTMLDivElement>) => {
        if (onContextMenu) {
          e.preventDefault()
          e.stopPropagation()
          onContextMenu(activity.id, e.clientX, e.clientY)
        }
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Inner clip wrapper — provides overflow-hidden and rounded corners for card content */}
      <div className="absolute inset-0 rounded-md overflow-hidden">
        {hasImage ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center rounded-md"
              style={{ backgroundImage: `url(${activity.image})` }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-6"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}
            >
              <div
                className="font-semibold truncate text-white"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
              >
                {activity.title}
              </div>
              <div
                className="text-[10px] text-white/85 truncate"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {formatTimeRange(activity)}
              </div>
              {activity.location && (
                <div
                  className="text-[9px] text-white/70 truncate"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {activity.location}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="px-2 py-1 flex flex-col gap-0.5">
            <span className="font-semibold truncate leading-tight text-white">{activity.title}</span>
            <span className="opacity-80 truncate text-white">{formatTimeRange(activity)}</span>
            {activity.location && (
              <span className="opacity-70 truncate text-[10px] text-white">{activity.location}</span>
            )}
          </div>
        )}

        {activeViewers.length > 0 && (
          <div className="absolute top-1 right-1 flex gap-0.5">
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

        {hiddenCount > 0 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-auto">
            +{hiddenCount} more
          </div>
        )}
      </div>

      {/* Resize handles — direct children of root div, NOT inside inner clip wrapper */}
      {onResize && (
        <>
          <div
            {...topHandleProps}
            className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-20 group/handle"
            style={{ touchAction: 'none' }}
          >
            <div className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full bg-white/0 group-hover/handle:bg-white/60 transition-colors" />
          </div>
          <div
            {...bottomHandleProps}
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20 group/handle"
            style={{ touchAction: 'none' }}
          >
            <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full bg-white/0 group-hover/handle:bg-white/60 transition-colors" />
          </div>
        </>
      )}

      {/* Floating vote buttons — outside inner clip, floats right of card */}
      {poll && userId && onVote && (
        <FloatingVoteButtons
          poll={poll}
          userId={userId}
          onVote={(v) => onVote(activity.id, v)}
          compact={displayDuration < 0.67}
          isResolved={poll.status === 'resolved'}
        />
      )}
    </div>
  )
}
