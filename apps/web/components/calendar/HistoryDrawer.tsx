'use client'
import { useEffect, useState } from 'react'
import { Xmark, Undo } from 'iconoir-react'
import { useQueryClient } from '@tanstack/react-query'
import { useActivityHistory, type AuditEntry } from './hooks/useActivityHistory'
import { formatDistanceToNow } from 'date-fns'
import type { CalendarActivity } from './types'
import { toCalendarActivity, supabase, type ActivityRow } from '@travyl/shared'

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
  const queryClient = useQueryClient()
  const { data: entries = [], isLoading } = useActivityHistory(tripId, isOpen)

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
    const { error: auditError } = await supabase.from('itinerary_edits').insert({
      trip_id: tripId,
      activity_id: activityId,
      edit_type: 'revert',
      original_data: entry.new_data,
      new_data: entry.original_data,
      user_id: userId,
    })
    if (auditError) console.warn('[HistoryDrawer] revert audit insert failed:', auditError.message)

    queryClient.invalidateQueries({ queryKey: ['activity-history', tripId] })
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        className={[
          'absolute right-0 top-0 h-full w-80 bg-white dark:bg-[#0f1a28] border-l border-gray-200 dark:border-[#1e3a5f]/40 shadow-xl pointer-events-auto flex flex-col transition-transform duration-300',
          isVisible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1e3a5f]/30">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-[#f5efe8]">Change history</h2>
          <button
            onClick={onClose}
            aria-label="Close history"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30"
          >
            <Xmark className="w-4 h-4 text-gray-500 dark:text-[#7a9cc0]" />
          </button>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <p className="px-4 py-3 text-xs text-gray-400 animate-pulse">Loading history…</p>
          )}
          {!isLoading && entries.length === 0 && (
            <p className="px-4 py-6 text-xs text-center text-gray-400 dark:text-[#4a7ab5]">No changes yet</p>
          )}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 px-4 py-2.5 border-b border-gray-50 dark:border-[#1e3a5f]/20 hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/10"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 dark:text-[#cdd9e5] leading-snug">
                  <span className="font-medium">{entry.displayName}</span>{' '}
                  {describeEntry(entry)}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-[#4a7ab5] mt-0.5">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </p>
              </div>
              {entry.edit_type !== 'revert' && (
                <button
                  onClick={() => handleRevert(entry)}
                  title="Revert this change"
                  aria-label={`Revert: ${describeEntry(entry)}`}
                  className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-[#cdd9e5] hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30"
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
