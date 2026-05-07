'use client'
import Image from 'next/image'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useQueryClient } from '@tanstack/react-query'
import {
  getActivityColor,
  getActivityColorDark,
  getActivityColorDarkBorder,
} from '@travyl/shared/viewmodels/calendarViewModel'
import { COLUMN_GAP, COLUMN_OUTER_PAD } from './constants'
import { useHourHeight } from './HourHeightContext'
import { formatTimeRange } from './utils'
import { TrainFront, Bus, Train, CableCar, Ship } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCalendarThemeContext } from './CalendarThemeContext'
import { useResizeHandles } from './hooks/useResizeHandles'
import type { CalendarActivity, UserAwareness } from './types'
import type { Poll } from '@travyl/shared'
import { FloatingVoteButtons } from './PollBar'
import type { ActivityIntelligence } from './hooks/useActivityIntelligence'

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
  columnSpan?: number
  hiddenCount?: number
  bookingStatus?: 'matched' | 'opened' | null
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
  columnSpan = 1,
  hiddenCount = 0,
  bookingStatus = null,
}: EventBlockProps) {
  const HOUR_HEIGHT = useHourHeight()
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
    hourHeight: HOUR_HEIGHT,
    onResize: (newStart, newDuration) => {
      onResize?.(activity.id, newStart, newDuration)
    },
  })

  const { isDark } = useCalendarThemeContext()

  const vehicleIcon = activity.type === 'transport' && activity.transitVehicleType
    ? getVehicleIcon(activity.transitVehicleType)
    : null

  const queryClient = useQueryClient()
  const cachedResults = queryClient.getQueriesData<ActivityIntelligence>({
    queryKey: ['activity-intelligence', activity.id],
  })
  const intel = cachedResults[0]?.[1] ?? null
  const hasConflict = intel ? intel.conflicts.hours : false
  const conflictTooltip = intel?.conflicts.hours ? 'Opening hours conflict' : null

  // Opening hours pill — show the first entry's hours as a hint (e.g. "09:00–18:00")
  const hoursEntry = intel?.place.openingHours?.[0]
  const hoursLabel = hoursEntry ? `${hoursEntry.opens.slice(0, 5)}–${hoursEntry.closes.slice(0, 5)}` : null

  const color = getActivityColor(activity.type)
  const hasImage = !!(activity.image && activity.duration >= 1)

  const bgColor = isDark ? getActivityColorDark(activity.type) : color
  const borderColor = isDark ? getActivityColorDarkBorder(activity.type) : `${color}88`

  // Column positioning — uses calc() with fixed pixel gaps
  // COLUMN_OUTER_PAD preserves the existing 4px inset on each side of the day column
  const availableWidth = `(100% - ${2 * COLUMN_OUTER_PAD}px)`
  const singleColWidth = `(${availableWidth} - ${(totalColumns - 1) * COLUMN_GAP}px) / ${totalColumns}`
  const leftOffset = column === 0
    ? `${COLUMN_OUTER_PAD}px`
    : `${COLUMN_OUTER_PAD}px + ${column} * (${singleColWidth} + ${COLUMN_GAP}px)`
  // Width spans multiple columns when adjacent columns are empty
  const colWidth = columnSpan === 1
    ? singleColWidth
    : `(${singleColWidth}) * ${columnSpan} + ${COLUMN_GAP}px * ${columnSpan - 1}`

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
    touchAction: 'none',
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
      {hasConflict && conflictTooltip && (
        <div
          title={conflictTooltip}
          className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white dark:ring-cal-surface-elevated z-10"
        />
      )}

      {/* Inner clip wrapper — provides overflow-hidden and rounded corners for card content */}
      <div className="absolute inset-0 rounded-md overflow-hidden">
        {/* Opening hours pill — top-left, only for activities >= 30 min */}
        {hoursLabel && activity.duration >= 0.5 && (
          <div
            title={`Open: ${hoursLabel}`}
            className={[
              'absolute top-0.5 left-0.5 z-10 px-1 py-0.5 rounded text-[9px] leading-none pointer-events-none',
              intel?.conflicts.hours
                ? 'bg-red-500/80 text-white'
                : 'bg-green-500/80 text-white',
            ].join(' ')}
          >
            {hoursLabel}
          </div>
        )}
        {hasImage ? (
          <>
            <div className="absolute inset-0 rounded-md" style={{ backgroundColor: bgColor }}>
              <Image
                src={activity.image!}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 150px"
                draggable={false}
              />
              {/* Subtle full-card scrim to lift contrast on bright photos without hiding them */}
              <div className="absolute inset-0 bg-black/15" />
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-8"
              style={{
                background:
                  'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 100%)',
              }}
            >
              <div
                className="font-bold truncate text-white flex items-center gap-1"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.55)' }}
              >
                {vehicleIcon && <span className="shrink-0">{vehicleIcon}</span>}
                <span className="truncate">{activity.title}</span>
              </div>
              <div
                className="text-[10px] font-medium text-white/95 truncate"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {formatTimeRange(activity)}
              </div>
              {activity.location && (
                <div
                  className="text-[9px] text-white/85 truncate"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {activity.location}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="px-2 py-1 flex flex-col gap-0.5">
            <span className="font-semibold truncate leading-tight text-white flex items-center gap-1">
              {vehicleIcon && <span className="shrink-0">{vehicleIcon}</span>}
              <span className="truncate">{activity.title}</span>
            </span>
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
                className="inline-flex items-center justify-center w-4 h-4 overflow-hidden rounded-full text-[9px] font-bold text-white ring-1 ring-white/50"
                style={{ backgroundColor: viewer.color }}
              >
                {viewer.avatarUrl ? (
                  <img
                    src={viewer.avatarUrl}
                    alt={viewer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  viewer.avatarInitial
                )}
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

      {/* Booking status badge */}
      {bookingStatus === 'matched' && (
        <span
          title="Bookable"
          className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-blue-500 ring-1 ring-white dark:ring-cal-bg"
        />
      )}
      {bookingStatus === 'opened' && (
        <span
          title="Booking opened"
          className="absolute bottom-1 right-1 flex items-center justify-center h-3.5 w-3.5 rounded-full bg-green-500 ring-1 ring-white dark:ring-cal-bg"
        >
          <svg width="7" height="7" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </div>
  )
}

const VEHICLE_ICONS: Record<string, ReactNode> = {
  bus: <Bus className="w-3 h-3" />,
  subway: <TrainFront className="w-3 h-3" />,
  train: <Train className="w-3 h-3" />,
  tram: <TrainFront className="w-3 h-3" />,
  light_rail: <TrainFront className="w-3 h-3" />,
  ferry: <Ship className="w-3 h-3" />,
  cable_car: <CableCar className="w-3 h-3" />,
  funicular: <CableCar className="w-3 h-3" />,
  rideshare: <Bus className="w-3 h-3" />,
  shuttle: <Bus className="w-3 h-3" />,
}

function getVehicleIcon(vehicleType: string): ReactNode {
  return VEHICLE_ICONS[vehicleType] ?? <TrainFront className="w-3 h-3" />
}
