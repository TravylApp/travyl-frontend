'use client'
import { useDroppable } from '@dnd-kit/core'
import { HOUR_HEIGHT } from './constants'
import { EventBlock } from './EventBlock'
import { PostItNote } from './PostItNote'
import type { CalendarActivity, UserAwareness, TimeRange } from './types'
import type { TripNote, Poll } from '@travyl/shared'
import { computeOverlapLayout } from '@travyl/shared'
import { COLUMN_GAP, COLUMN_OUTER_PAD } from './constants'

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
  tripOwnerId?: string
  onVotePoll?: (activityId: string, vote: 'yes' | 'no') => void
  onRestorePoll?: (activityId: string) => void
  onRemovePollActivity?: (activityId: string) => void
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
  tripOwnerId,
  onVotePoll,
  onRestorePoll,
  onRemovePollActivity,
}: DayColumnProps) {
  const dayCollaborators = viewers.filter(
    (c) => (c.selectedDayIndex ?? 0) === dayIndex,
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
          'text-center text-xs font-medium py-1 border-b border-[var(--cal-border)] text-[var(--cal-text-secondary)] select-none',
          onClickDayHeader
            ? 'cursor-pointer hover:bg-[var(--cal-border-light)] transition-colors'
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
        {dayCollaborators.length > 0 && (
          <div
            className="flex items-center justify-center gap-0 mt-0.5"
            aria-label={`Viewing: ${dayCollaborators.map((c) => c.name).join(', ')}`}
          >
            {dayCollaborators.slice(0, 3).map((c, i) => (
              <div
                key={c.userId}
                title={c.name}
                style={{
                  backgroundColor: c.color,
                  marginLeft: i === 0 ? 0 : '-4px',
                  zIndex: 3 - i,
                }}
                className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center ring-1 ring-[var(--cal-surface)]"
              >
                {c.avatarInitial}
              </div>
            ))}
            {dayCollaborators.length > 3 && (
              <span className="text-[9px] text-[var(--cal-text-tertiary)] ml-1">
                +{dayCollaborators.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Droppable grid */}
      <div
        ref={setNodeRef}
        className={[
          'relative flex-1 border-l border-[var(--cal-border-light)]',
          isOver ? 'bg-[var(--cal-drag-over)]' : '',
        ].join(' ')}
        style={{ height: hourCount * HOUR_HEIGHT }}
        onClick={handleBackgroundClick}
      >
        {/* Hour grid lines */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute w-full border-t border-[var(--cal-grid-line)] pointer-events-none"
            style={{ top: (hour - timeRange.startHour) * HOUR_HEIGHT }}
          />
        ))}

        {/* Half-hour tick lines */}
        {hours.map((hour) => (
          <div
            key={`half-${hour}`}
            className="absolute w-full border-t border-dashed border-[var(--cal-grid-line-half)] pointer-events-none"
            style={{ top: (hour - timeRange.startHour) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
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
              onRestorePoll={onRestorePoll}
              onRemovePollActivity={onRemovePollActivity}
              canManagePoll={
                polls?.get(activity.id)
                  ? polls.get(activity.id)!.startedBy === pollUserId || tripOwnerId === pollUserId
                  : false
              }
              timeRangeStartHour={timeRange.startHour}
              timeRangeEndHour={timeRange.endHour}
              column={layout.column}
              totalColumns={layout.totalColumns}
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

        {/* Ghost block for pending drag activity */}
        {pendingActivity && (() => {
          const layout = overlapLayout.get(pendingActivity.id)
          if (!layout || layout.column < 0) return null
          const availableWidth = `(100% - ${2 * COLUMN_OUTER_PAD}px)`
          const colWidth = `(${availableWidth} - ${(layout.totalColumns - 1) * COLUMN_GAP}px) / ${layout.totalColumns}`
          const leftOffset = layout.column === 0
            ? `${COLUMN_OUTER_PAD}px`
            : `${COLUMN_OUTER_PAD}px + ${layout.column} * (${colWidth} + ${COLUMN_GAP}px)`
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
      </div>
    </div>
  )
}
