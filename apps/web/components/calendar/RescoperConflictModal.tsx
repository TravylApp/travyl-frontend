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
      <div className="bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
        <h2 className="text-[15px] font-medium text-gray-900 dark:text-[#f5efe8] mb-1">
          Activities outside new range
        </h2>
        <p className="text-[13px] text-gray-500 dark:text-[#4a7ab5] mb-3">
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
              className="text-[13px] text-gray-700 dark:text-[#cdd9e5] bg-gray-50 dark:bg-[#1e3a5f]/10 rounded px-2 py-1 truncate"
            >
              {a.title || 'Untitled'}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <button
            onClick={onMoveToLastDay}
            className="w-full px-4 py-2 rounded-lg bg-[#003594] text-white text-[13px] font-medium hover:bg-[#002a7a] transition-colors"
          >
            Move to last day
          </button>
          <button
            onClick={onKeepUnscheduled}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 text-gray-700 dark:text-[#cdd9e5] text-[13px] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
          >
            Keep as unscheduled
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-[13px] text-gray-400 dark:text-[#4a7ab5] hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
