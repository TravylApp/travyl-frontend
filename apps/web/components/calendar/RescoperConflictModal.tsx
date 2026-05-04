'use client'

import type { CalendarActivity } from './types'

interface RescoperConflictModalProps {
  conflictingActivities: CalendarActivity[]
  onMoveToLastDay: () => void
  onKeepUnscheduled: () => void
  onCancel: () => void
}

export function RescoperConflictModal({
  conflictingActivities,
  onMoveToLastDay,
  onKeepUnscheduled,
  onCancel,
}: RescoperConflictModalProps) {
  const hasMultiDay = conflictingActivities.some(
    (a) => a.endDay !== undefined && a.endDay !== a.day,
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-cal-surface-elevated border border-gray-200 dark:border-cal-border rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
        <h2 className="text-[15px] font-medium text-gray-900 dark:text-cal-text mb-1">
          Activities outside new range
        </h2>
        <p className="text-[13px] text-gray-500 dark:text-cal-text-secondary mb-3">
          {conflictingActivities.length === 1
            ? '1 activity falls outside the new trip dates.'
            : `${conflictingActivities.length} activities fall outside the new trip dates.`}
          {hasMultiDay && (
            <span className="block mt-1 text-amber-600 dark:text-amber-400">
              Multi-day activities will be collapsed to a single day.
            </span>
          )}
        </p>

        <ul className="mb-4 space-y-1 max-h-40 overflow-y-auto">
          {conflictingActivities.map((a) => (
            <li
              key={a.id}
              className="text-[13px] text-gray-700 dark:text-cal-text bg-gray-50 dark:bg-cal-accent-bg/30 rounded px-2 py-1 truncate"
            >
              {a.title || 'Untitled'}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <button
            onClick={onMoveToLastDay}
            className="w-full px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary transition-colors"
          >
            Move to last day
          </button>
          <button
            onClick={onKeepUnscheduled}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-cal-border text-gray-700 dark:text-cal-text text-[13px] hover:bg-gray-50 dark:hover:bg-cal-accent-bg/60 transition-colors"
          >
            Keep as unscheduled
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-[13px] text-gray-400 dark:text-cal-text-secondary hover:text-gray-600 dark:hover:text-cal-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
