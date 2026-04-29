'use client'
import { useEffect, useState, useMemo } from 'react'
import { Xmark, Undo, ClockRotateLeft } from 'iconoir-react'
import { useQueryClient } from '@tanstack/react-query'
import { useActivityHistory, type AuditEntry } from './hooks/useActivityHistory'
import { formatDistanceToNow } from 'date-fns'
import type { CalendarActivity } from './types'
import { toCalendarActivity, supabase, type ActivityRow, groupAuditEntries, buildRestorePlan } from '@travyl/shared'

interface Props {
  tripId: string
  isOpen: boolean
  onClose: () => void
  onMove: (id: string, day: number, startHour: number) => void
  onEdit: (id: string, patch: Partial<CalendarActivity>) => void
  onDelete: (id: string) => Promise<void>
  onAdd: (activity: CalendarActivity) => Promise<void>
  tripStartDate: string
  userId: string
}

function describeEntry(entry: AuditEntry): string {
  const name = entry.activityName
  switch (entry.edit_type) {
    case 'create': return `added "${name}"`
    case 'delete': return `removed "${name}"`
    case 'move': {
      const orig = entry.original_data as any
      const next = entry.new_data as any
      return `moved "${name}" · day ${orig?.day} → ${next?.day}`
    }
    case 'edit': return `edited "${name}"`
    case 'revert': return `reverted a change to "${name}"`
    default: return `changed "${name}"`
  }
}

export function HistoryDrawer({
  tripId, isOpen, onClose, onMove, onEdit, onDelete, onAdd, tripStartDate, userId,
}: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmGroupId, setConfirmGroupId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { data: entries = [], isLoading } = useActivityHistory(tripId, isOpen)

  const groups = useMemo(() => groupAuditEntries(entries, 3), [entries])

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setIsVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleRevert(entry: AuditEntry) {
    if (entry.edit_type === 'revert') return
    const activityId = entry.activity_id

    switch (entry.edit_type) {
      case 'move': {
        const orig = entry.original_data as any
        onMove(activityId, orig.day, orig.startHour)
        break
      }
      case 'edit':
        onEdit(activityId, entry.original_data as Partial<CalendarActivity>)
        break
      case 'create':
        await onDelete(activityId)
        break
      case 'delete': {
        const activity = toCalendarActivity(entry.original_data as unknown as ActivityRow, tripStartDate)
        await onAdd(activity)
        break
      }
    }

    // Log the revert itself
    await supabase.from('itinerary_edits').insert({
      trip_id: tripId,
      activity_id: activityId,
      edit_type: 'revert',
      original_data: entry.new_data,
      new_data: entry.original_data,
      user_id: userId,
    })

    queryClient.invalidateQueries({ queryKey: ['activity-history', tripId] })
  }

  async function handleRestoreToPoint(groupTimestamp: string) {
    setRestoring(true)
    try {
      const plan = buildRestorePlan(entries, groupTimestamp)
      for (const entry of plan) {
        const activityId = entry.activity_id
        switch (entry.edit_type) {
          case 'move': {
            const orig = entry.original_data as any
            onMove(activityId, orig.day, orig.startHour)
            break
          }
          case 'edit':
            onEdit(activityId, entry.original_data as Partial<CalendarActivity>)
            break
          case 'create':
            await onDelete(activityId)
            break
          case 'delete': {
            const activity = toCalendarActivity(entry.original_data as unknown as ActivityRow, tripStartDate)
            await onAdd(activity)
            break
          }
        }

        await supabase.from('itinerary_edits').insert({
          trip_id: tripId,
          activity_id: activityId,
          edit_type: 'revert',
          original_data: entry.new_data,
          new_data: entry.original_data,
          user_id: userId,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['activity-history', tripId] })
    } finally {
      setRestoring(false)
      setConfirmGroupId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        className={[
          'absolute right-0 top-0 h-full w-80 bg-white dark:bg-cal-surface-elevated border-l border-gray-200 dark:border-cal-border shadow-xl pointer-events-auto flex flex-col transition-transform duration-300',
          isVisible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-cal-border">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-cal-text">Change history</h2>
          <button
            onClick={onClose}
            aria-label="Close history"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-cal-accent-bg"
          >
            <Xmark className="w-4 h-4 text-gray-500 dark:text-cal-text-secondary" />
          </button>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <p className="px-4 py-3 text-xs text-gray-400 animate-pulse">Loading history…</p>
          )}
          {!isLoading && groups.length === 0 && (
            <p className="px-4 py-6 text-xs text-center text-gray-400 dark:text-cal-text-secondary">No changes yet</p>
          )}
          {groups.map((group) => (
            <div key={group.id} className="border-b border-gray-100 dark:border-cal-border/70">
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50 dark:bg-cal-accent-bg/20">
                <span className="text-[11px] text-gray-500 dark:text-cal-text-secondary font-medium">
                  {group.label}
                  {group.entries.length > 1 && (
                    <span className="text-gray-400 dark:text-cal-text-secondary/60 ml-1">
                      ({group.entries.length} changes)
                    </span>
                  )}
                </span>
                {group.entries.some((e) => e.edit_type !== 'revert') && (
                  confirmGroupId === group.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setConfirmGroupId(null)}
                        disabled={restoring}
                        className="text-[10px] px-2 py-0.5 rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-cal-accent-bg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRestoreToPoint(group.timestamp)}
                        disabled={restoring}
                        className="text-[10px] px-2 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        {restoring ? 'Restoring…' : 'Confirm'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmGroupId(group.id)}
                      disabled={restoring}
                      title="Restore itinerary to this point"
                      className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      <ClockRotateLeft className="w-3 h-3" />
                      Restore to here
                    </button>
                  )
                )}
              </div>

              {/* Group entries */}
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-cal-accent-bg/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 dark:text-cal-text leading-snug">
                      <span className="font-medium">{entry.displayName}</span>{' '}
                      {describeEntry(entry)}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-cal-text-secondary mt-0.5">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {entry.edit_type !== 'revert' && (
                    <button
                      onClick={() => handleRevert(entry)}
                      title="Revert this change"
                      aria-label={`Revert: ${describeEntry(entry)}`}
                      className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-cal-text hover:bg-gray-100 dark:hover:bg-cal-accent-bg"
                    >
                      <Undo className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
