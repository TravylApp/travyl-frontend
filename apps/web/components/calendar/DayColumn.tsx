'use client'
import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { HOUR_HEIGHT } from './constants'
import { EventBlock } from './EventBlock'
import { PostItNote } from './PostItNote'
import type { CalendarActivity, UserAwareness, TimeRange } from './types'
import type { TripNote, Poll } from '@travyl/shared'
import { computeOverlapLayout } from '@travyl/shared'
import { COLUMN_GAP, COLUMN_OUTER_PAD } from './constants'
import { useDayIntelligence } from './hooks/useDayIntelligence'
import { getWmoWeather } from './utils/wmoWeatherCode'
import DayHealthIndicator from './DayHealthIndicator'
import TravelTimeBadge from './TravelTimeBadge'
import { GhostEventBlock } from './GhostEventBlock'
import { computeBlockedRanges } from './utils/travelConstraints'
import { TravelConstraintBlock } from './TravelConstraintBlock'

interface DayColumnProps {
  dayIndex: number
  label: string
  activities: CalendarActivity[]
  viewers?: UserAwareness[]
  selectedEventId?: string | null
  timeRange: TimeRange
  tripStartDate: Date
  onSelectEvent: (id: string, anchorEl?: HTMLElement) => void
  onClickDayHeader?: () => void
  onDeselect: () => void
  pendingActivity?: CalendarActivity | null
  notes?: TripNote[]
  canEditNotes?: boolean
  userId?: string
  isOwner?: boolean
  onUpdateNote?: (noteId: string, text: string) => void
  onDeleteNote?: (noteId: string) => void
  marqueeSelectedIds?: Set<string>
  onShiftClickEvent?: (id: string) => void
  onResizeEvent?: (id: string, newStartHour: number, newDuration: number) => void
  onContextMenu?: (id: string, x: number, y: number) => void
  polls?: Map<string, Poll>
  pollUserId?: string
  onVotePoll?: (activityId: string, vote: 'yes' | 'no') => void
  bookingStatuses?: Map<string, 'matched' | 'opened'>
  tripId?: string
  isDayView?: boolean
  ghostActivities?: CalendarActivity[]
  onConfirmGhost?: (activity: CalendarActivity) => void
  onDismissGhost?: (id: string) => void
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
  onDeselect,
  pendingActivity = null,
  notes,
  canEditNotes,
  userId,
  isOwner,
  onUpdateNote,
  onDeleteNote,
  marqueeSelectedIds,
  onShiftClickEvent,
  onResizeEvent,
  onContextMenu,
  polls,
  pollUserId,
  onVotePoll,
  bookingStatuses,
  tripId,
  isDayView = false,
  ghostActivities = [],
  onConfirmGhost,
  onDismissGhost,
}: DayColumnProps) {
  const date = useMemo(() => {
    const d = new Date(tripStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000)
    return d.toISOString().slice(0, 10)
  }, [tripStartDate, dayIndex])

  const { data: dayIntel } = useDayIntelligence(tripId ?? null, date)

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => a.startHour - b.startHour),
    [activities],
  )

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return
    onDeselect()
  }

  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dayIndex}`,
    data: { dayIndex },
  })

  const hourCount = timeRange.endHour - timeRange.startHour
  const hours: number[] = []
  for (let h = timeRange.startHour; h <= timeRange.endHour; h++) hours.push(h)

  // Compute overlap layout
  // If pendingActivity is an existing activity being moved, filter original to avoid double-counting
  const layoutActivities = pendingActivity
    ? [
        ...activities.filter((a) => a.id !== pendingActivity.id),
        pendingActivity,
      ]
    : activities

  const overlapLayout = computeOverlapLayout(layoutActivities)

  // Compute travel constraint blocked ranges for this day
  const blockedRanges = useMemo(
    () => computeBlockedRanges(activities, timeRange),
    [activities, timeRange],
  )

  // Compute hidden counts: find which column-2 block should show the "+N more" badge
  // hiddenCount = count of activities in the same cluster whose column === -1
  const hiddenByCluster = new Map<string, number>()
  for (const [id, layout] of overlapLayout) {
    if (layout.column === -1) {
      const hiddenAct = layoutActivities.find((a) => a.id === id)!
      for (const [otherId, otherLayout] of overlapLayout) {
        if (otherLayout.column === 2) {
          const otherAct = layoutActivities.find((a) => a.id === otherId)!
          if (
            hiddenAct.startHour < otherAct.startHour + otherAct.duration &&
            otherAct.startHour < hiddenAct.startHour + hiddenAct.duration
          ) {
            hiddenByCluster.set(otherId, (hiddenByCluster.get(otherId) ?? 0) + 1)
            break
          }
        }
      }
    }
  }

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Day header */}
      <div
        className={[
          'text-center text-xs font-medium py-1 text-cal-text-secondary select-none',
          onClickDayHeader
            ? 'cursor-pointer hover:bg-cal-border-light transition-colors'
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
        <span className="inline-flex items-center gap-1">
          {label}
          {dayIntel?.weather && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-cal-text-secondary">
              {getWmoWeather(dayIntel.weather.weatherCode).icon}
              {dayIntel.weather.tempMaxC !== null && `${Math.round(dayIntel.weather.tempMaxC)}°`}
            </span>
          )}
          {dayIntel && (
            <DayHealthIndicator
              hoursConflictCount={Object.values(dayIntel.activities).filter(a => a.conflicts.hours).length}
              travelTimeConflictCount={Object.values(dayIntel.activities).filter(a => a.conflicts.travelTime).length}
            />
          )}
        </span>
      </div>

      {/* Droppable grid */}
      <div
        ref={setNodeRef}
        data-day-grid={dayIndex}
        className={[
          'relative flex-1',
          isOver ? 'bg-cal-drag-over' : '',
        ].join(' ')}
        style={{ minHeight: hourCount * HOUR_HEIGHT }}
        onClick={handleBackgroundClick}
      >
        {/* Hour grid lines */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute w-full border-t border-cal-grid-line pointer-events-none"
            style={{ top: (hour - timeRange.startHour) * HOUR_HEIGHT }}
          />
        ))}

        {/* Half-hour tick lines — subtle dots */}
        {hours.map((hour) => (
          <div
            key={`half-${hour}`}
            className="absolute w-full pointer-events-none"
            style={{ top: (hour - timeRange.startHour) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
          >
            <div className="mx-4 h-px bg-cal-grid-line-half" />
          </div>
        ))}

        {/* Travel constraint blocks — shown for flight/transport activities */}
        {blockedRanges.map((range, i) => (
          <TravelConstraintBlock
            key={`tc-${i}`}
            range={range}
            timeRangeStartHour={timeRange.startHour}
          />
        ))}

        {/* Event blocks */}
        {activities.map((activity) => {
          const layout = overlapLayout.get(activity.id)
          if (!layout || layout.column === -1) return null
          return (
            <EventBlock
              key={activity.id}
              activity={activity}
              viewers={viewers}
              isSelected={selectedEventId === activity.id}
              isMultiSelected={marqueeSelectedIds?.has(activity.id)}
              onSelect={onSelectEvent}
              onShiftClick={onShiftClickEvent}
              onResize={onResizeEvent}
              onContextMenu={onContextMenu}
              poll={polls?.get(activity.id)}
              userId={pollUserId}
              onVote={onVotePoll}
              bookingStatus={bookingStatuses?.get(activity.id) ?? null}
              timeRangeStartHour={timeRange.startHour}
              timeRangeEndHour={timeRange.endHour}
              column={layout.column}
              totalColumns={layout.totalColumns}
              columnSpan={layout.columnSpan}
              hiddenCount={hiddenByCluster.get(activity.id) ?? 0}
            />
          )
        })}

        {/* Post-it notes */}
        {notes?.filter((n) => n.day === dayIndex).map((note) => (
          <PostItNote
            key={note.id}
            note={note}
            authorInitials={note.user_id.slice(0, 2).toUpperCase()}
            canEdit={canEditNotes ?? false}
            canDelete={(note.user_id === userId) || (isOwner ?? false)}
            timeRangeStartHour={timeRange.startHour}
            onUpdate={onUpdateNote ?? (() => {})}
            onDelete={onDeleteNote ?? (() => {})}
          />
        ))}

        {/* Ghost block for pending drag activity — always visible during drag */}
        {pendingActivity && (() => {
          const layout = overlapLayout.get(pendingActivity.id)
          // Fall back to full-width column 0 when overlap hides it (column -1)
          const col = layout && layout.column >= 0 ? layout.column : 0
          const cols = layout ? layout.totalColumns : 1
          const availableWidth = `(100% - ${2 * COLUMN_OUTER_PAD}px)`
          const colWidth = `(${availableWidth} - ${(cols - 1) * COLUMN_GAP}px) / ${cols}`
          const leftOffset = col === 0
            ? `${COLUMN_OUTER_PAD}px`
            : `${COLUMN_OUTER_PAD}px + ${col} * (${colWidth} + ${COLUMN_GAP}px)`
          return (
            <div
              className="absolute rounded-md border-2 border-dashed border-blue-400 bg-blue-100/30 pointer-events-none"
              style={{
                top: (pendingActivity.startHour - timeRange.startHour) * HOUR_HEIGHT,
                height: Math.max(pendingActivity.duration * HOUR_HEIGHT - 2, 20),
                left: `calc(${leftOffset})`,
                width: `calc(${colWidth})`,
                zIndex: 5,
              }}
            />
          )
        })()}

        {/* Current time indicator */}
        <CurrentTimeIndicator
          dayIndex={dayIndex}
          tripStartDate={tripStartDate}
          timeRange={timeRange}
        />

        {/* Travel time badges — day view only, shown between consecutive activities */}
        {isDayView && dayIntel && sortedActivities.map((act, i) => {
          if (i === 0) return null
          const prev = sortedActivities[i - 1]
          const intel = dayIntel.activities[act.id]
          if (!intel?.logistics.travelTimeMinutes) return null
          const travelMinutes = intel.logistics.travelTimeMinutes
          const gapMinutes = Math.round((act.startHour - (prev.startHour + prev.duration)) * 60)
          const midTop = ((prev.startHour + prev.duration + act.startHour) / 2 - timeRange.startHour) * HOUR_HEIGHT
          return (
            <div
              key={`travel-${act.id}`}
              className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none group"
              style={{ top: midTop }}
            >
              <TravelTimeBadge
                travelTimeMinutes={travelMinutes}
                distanceKm={intel.logistics.distanceKm ?? 0}
                gapMinutes={gapMinutes}
                hasConflict={intel.conflicts.travelTime}
              />
            </div>
          )
        })}

        {/* Ghost activity layer — above events (z-10), pointer-events only on blocks */}
        {ghostActivities.length > 0 && (
          <div className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 10 }}>
            {ghostActivities
              .filter((g) => g.day === dayIndex)
              .map((ghost) => (
                <GhostEventBlock
                  key={ghost.id}
                  activity={ghost}
                  timeRangeStartHour={timeRange.startHour}
                  onConfirm={(a) => onConfirmGhost?.(a)}
                  onDismiss={(id) => onDismissGhost?.(id)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
