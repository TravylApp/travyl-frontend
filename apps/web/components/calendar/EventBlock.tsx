'use client'
import { useState, useCallback, useMemo, useEffect } from 'react'
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
import { PollBar } from './PollBar'
import { ActivityContextMenu, type ContextMenuAction } from './ActivityContextMenu'

interface EventBlockProps {
  activity: CalendarActivity
  viewers?: UserAwareness[]
  isSelected?: boolean
  isMultiSelected?: boolean
  onClickEvent: (id: string, anchorEl: HTMLElement) => void
  onShiftClick?: (id: string) => void
  timeRangeStartHour: number
  column?: number
  totalColumns?: number
  hiddenCount?: number
  onResize?: (id: string, newStartHour: number, newDuration: number) => void
  timeRangeEndHour?: number
  poll?: Poll | null
  pollUserId?: string
  pollCollaborators?: UserAwareness[]
  isPollManager?: boolean
  tripOwnerId?: string
  onVote?: (activityId: string, vote: 'yes' | 'no') => void
  onStartPoll?: (activityId: string) => void
  onClosePoll?: (activityId: string) => void
  onRestoreActivity?: (activityId: string) => void
  onRemoveActivity?: (activityId: string) => void
}

export function EventBlock({
  activity,
  viewers = [],
  isSelected = false,
  isMultiSelected = false,
  onClickEvent,
  onShiftClick,
  timeRangeStartHour,
  column = 0,
  totalColumns = 1,
  hiddenCount = 0,
  onResize,
  timeRangeEndHour,
  poll,
  pollUserId,
  pollCollaborators,
  isPollManager,
  tripOwnerId: _tripOwnerId,
  onVote,
  onStartPoll,
  onClosePoll,
  onRestoreActivity,
  onRemoveActivity,
}: EventBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: activity.id,
    data: { type: 'activity' as const, activity },
    activationConstraint: { distance: 5 },
  })

  const { isDark } = useCalendarThemeContext()

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
    timeRangeEndHour: onResize ? timeRangeEndHour! : timeRangeStartHour + 24,
    onResize: onResize
      ? (s, d) => onResize(activity.id, s, d)
      : () => {},
  })

  const displayActivity = isResizing && previewStartHour != null && previewDuration != null
    ? { ...activity, startHour: previewStartHour, duration: previewDuration }
    : activity

  const color = getActivityColor(activity.type)
  const hasImage = !!(activity.image && displayActivity.duration >= 1)

  const bgColor = isDark ? getActivityColorDark(activity.type) : color
  const borderColor = isDark ? getActivityColorDarkBorder(activity.type) : `${color}88`

  // Column positioning — uses calc() with fixed pixel gaps
  // COLUMN_OUTER_PAD preserves the existing 4px inset on each side of the day column
  const availableWidth = `(100% - ${2 * COLUMN_OUTER_PAD}px)`
  const colWidth = `(${availableWidth} - ${(totalColumns - 1) * COLUMN_GAP}px) / ${totalColumns}`
  const leftOffset = column === 0
    ? `${COLUMN_OUTER_PAD}px`
    : `${COLUMN_OUTER_PAD}px + ${column} * (${colWidth} + ${COLUMN_GAP}px)`

  const style: React.CSSProperties = {
    position: 'absolute',
    top: (displayActivity.startHour - timeRangeStartHour) * HOUR_HEIGHT,
    height: Math.max(displayActivity.duration * HOUR_HEIGHT - 2, 20),
    left: `calc(${leftOffset})`,
    width: `calc(${colWidth})`,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : isSelected ? 10 : 1,
    borderLeft: `3px solid ${borderColor}`,
    transition: isDragging ? undefined : 'left 150ms ease, width 150ms ease',
    ...(hasImage ? {} : { backgroundColor: bgColor }),
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey && onShiftClick) {
      e.stopPropagation()
      onShiftClick(activity.id)
      return
    }
    onClickEvent(activity.id, e.currentTarget)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClickEvent(activity.id, e.currentTarget as HTMLElement)
    }
  }

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; activityId: string } | null>(null)

  // TEST: bare capture listener
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      console.log('[TEST] capture contextmenu fired! target:', e.target, 'activity.id:', activity.id)
    }
    window.addEventListener('contextmenu', handler, true)
    return () => window.removeEventListener('contextmenu', handler, true)
  }, [activity.id])

  const contextMenuActions = useMemo((): ContextMenuAction[] => {
    const hasPoll = poll && poll.status === 'active'
    const canClosePoll = hasPoll && isPollManager
    return [
      { id: 'cut', label: 'Cut', disabled: true },
      { id: 'duplicate', label: 'Duplicate' },
      { id: 'separator-1', label: '', separator: true },
      hasPoll
        ? canClosePoll
          ? { id: 'close-poll', label: 'Close Poll' }
          : { id: 'start-poll', label: 'Start Poll', disabled: true }
        : { id: 'start-poll', label: 'Start Poll' },
      { id: 'separator-2', label: '', separator: true },
      { id: 'delete', label: 'Delete', danger: true },
    ]
  }, [poll, isPollManager])

  const handleContextAction = useCallback(
    (actionId: string) => {
      setContextMenu(null)
      switch (actionId) {
        case 'duplicate':
          // Trigger duplicate via existing command system
          break
        case 'start-poll':
          onStartPoll?.(activity.id)
          break
        case 'close-poll':
          onClosePoll?.(activity.id)
          break
        case 'delete':
          onRemoveActivity?.(activity.id)
          break
      }
    },
    [activity.id, onStartPoll, onClosePoll, onRemoveActivity],
  )

  const isGrayedOut = activity.pollResult === 'remove'

  const activeViewers = viewers.filter(
    (v) => v.selectedEventId === activity.id && v.isOnline,
  )

  return (
    <>
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-event-block-id={activity.id}
      role="gridcell"
      tabIndex={0}
      aria-label={`${activity.title}, ${formatTimeRange(displayActivity)}`}
      aria-selected={isSelected}
      className={[
        'group rounded-md overflow-hidden select-none relative flex flex-col',
        'text-white text-xs',
        isMultiSelected
          ? 'ring-2 ring-blue-400 bg-blue-500/10'
          : isResizing ? 'ring-2 ring-white/50' : 'ring-2 ring-transparent',
        isDragging ? '' : 'transition-[ring,shadow,opacity] duration-150 hover:-translate-y-px hover:shadow-lg hover:ring-white/40',
        isResizing ? 'focus:outline-none' : 'focus:outline-none focus:ring-white focus:ring-offset-1',
      ].join(' ')}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Drag handle — scopes dnd-kit listeners away from root so onContextMenu fires */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-0"
        {...listeners}
      />
      <div className={`flex-1 min-h-0 overflow-hidden relative ${isGrayedOut ? 'opacity-40 grayscale' : ''}`}>
        {hasImage ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center rounded-md"
              style={{ backgroundImage: `url(${activity.image})` }}
            />
            <div
              className="absolute inset-0 rounded-md"
              style={{ background: `linear-gradient(135deg, ${color}4d, ${color}33)` }}
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
                {formatTimeRange(displayActivity)}
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
            <span className="opacity-80 truncate text-white">{formatTimeRange(displayActivity)}</span>
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

      {poll && poll.status === 'active' && pollUserId && (
        <PollBar
          poll={poll}
          userId={pollUserId}
          onVote={(vote) => onVote?.(activity.id, vote)}
          collaborators={pollCollaborators ?? []}
          compact={displayActivity.duration * HOUR_HEIGHT < 40}
          isResolved={false}
          canManage={!!isPollManager}
          onRestore={() => onRestoreActivity?.(activity.id)}
          onRemove={() => onRemoveActivity?.(activity.id)}
        />
      )}
      {isGrayedOut && pollUserId && (
        <PollBar
          poll={poll ?? { activityId: activity.id, startedBy: '', startedAt: '', status: 'resolved', result: 'remove', votes: {} }}
          userId={pollUserId}
          onVote={() => {}}
          collaborators={pollCollaborators ?? []}
          isResolved={true}
          canManage={!!isPollManager}
          onRestore={() => onRestoreActivity?.(activity.id)}
          onRemove={() => onRemoveActivity?.(activity.id)}
        />
      )}

      {onResize && (
        <>
          {/* Top resize handle */}
          <div
            className={[
              'absolute left-0 right-0 top-0 h-1.5 cursor-ns-resize z-[2]',
              isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150',
            ].join(' ')}
            onClick={(e) => e.stopPropagation()}
            {...topHandleProps}
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-white/30" />
          </div>
          {/* Bottom resize handle */}
          <div
            className={[
              'absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize z-[2]',
              isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150',
            ].join(' ')}
            onClick={(e) => e.stopPropagation()}
            {...bottomHandleProps}
          >
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/30" />
          </div>
        </>
      )}
    </div>
    {contextMenu && (
      <ActivityContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        actions={contextMenuActions}
        onAction={handleContextAction}
        onClose={() => setContextMenu(null)}
      />
    )}
    </>
  )
}
