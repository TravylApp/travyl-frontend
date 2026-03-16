'use client'
import { AnimatePresence, motion } from 'motion/react'
import type { CalendarActivity, UserAwareness } from './types'
import { DETAIL_PANEL_WIDTH } from './constants'
import { formatTimeRange } from './utils'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'

interface DetailPanelProps {
  activity: CalendarActivity | null
  viewers: UserAwareness[]
  onClose: () => void
  onRemove: (id: string) => void
}

export function DetailPanel({ activity, viewers, onClose, onRemove }: DetailPanelProps) {
  // Viewers watching this specific activity
  const activityViewers = viewers.filter(
    (v) => v.selectedEventId === activity?.id && v.isOnline,
  )

  return (
    <AnimatePresence>
      {activity && (
        <motion.aside
          key="detail-panel"
          initial={{ x: DETAIL_PANEL_WIDTH, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: DETAIL_PANEL_WIDTH, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ width: DETAIL_PANEL_WIDTH }}
          className="flex flex-col shrink-0 border-l border-white/10 bg-[#1a1f2e] overflow-y-auto"
          aria-label="Activity details"
        >
          {/* Color bar + header */}
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: getActivityColor(activity.type) }}
          />

          <div className="flex items-start justify-between p-4 pb-2">
            <div className="flex flex-col gap-0.5 min-w-0 pr-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {activity.type}
              </span>
              <h2 className="text-base font-semibold text-white leading-snug">
                {activity.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close detail panel"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M2 2L12 12M12 2L2 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Details */}
          <dl className="flex flex-col gap-3 px-4 py-2 text-sm">
            {/* Time */}
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="shrink-0 text-gray-500"
                aria-hidden="true"
              >
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <dt className="sr-only">Time</dt>
              <dd className="text-gray-300">{formatTimeRange(activity)}</dd>
            </div>

            {/* Location */}
            {activity.location && (
              <div className="flex items-start gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="mt-0.5 shrink-0 text-gray-500"
                  aria-hidden="true"
                >
                  <path
                    d="M7 1.5C5.067 1.5 3.5 3.067 3.5 5C3.5 7.5 7 12.5 7 12.5C7 12.5 10.5 7.5 10.5 5C10.5 3.067 8.933 1.5 7 1.5Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <circle cx="7" cy="5" r="1.2" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                <dt className="sr-only">Location</dt>
                <dd className="text-gray-300 leading-snug">{activity.location}</dd>
              </div>
            )}

            {/* Price */}
            {activity.price && (
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="shrink-0 text-gray-500"
                  aria-hidden="true"
                >
                  <path
                    d="M7 1.5V2.5M7 11.5V12.5M4 7C4 5.619 5.343 4.5 7 4.5C8.657 4.5 10 5.619 10 7C10 8.381 8.657 9.5 7 9.5C5.343 9.5 4 8.381 4 7Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
                <dt className="sr-only">Price</dt>
                <dd className="text-gray-300">{activity.price}</dd>
              </div>
            )}

            {/* Rating */}
            {activity.rating != null && (
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="shrink-0 text-yellow-400"
                  aria-hidden="true"
                >
                  <path
                    d="M7 1.5L8.545 4.636L12 5.127L9.5 7.564L10.09 11L7 9.386L3.91 11L4.5 7.564L2 5.127L5.455 4.636L7 1.5Z"
                    fill="currentColor"
                  />
                </svg>
                <dt className="sr-only">Rating</dt>
                <dd className="text-gray-300">{activity.rating} / 5</dd>
              </div>
            )}
          </dl>

          {/* Notes */}
          {activity.notes && (
            <div className="mx-4 my-2 rounded-lg bg-white/5 p-3 text-sm text-gray-400 leading-relaxed">
              {activity.notes}
            </div>
          )}

          {/* Collaborator presence */}
          {activityViewers.length > 0 && (
            <div className="mx-4 my-2 flex flex-wrap gap-1.5">
              {activityViewers.map((v) => (
                <span
                  key={v.userId}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                  style={{ backgroundColor: `${v.color}22`, color: v.color }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: v.color }}
                  />
                  {v.name} is viewing
                </span>
              ))}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex gap-2 border-t border-white/10 p-4">
            <button
              className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
              onClick={onClose}
            >
              Edit
            </button>
            <button
              className="flex-1 rounded-lg border border-red-500/30 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              onClick={() => onRemove(activity.id)}
            >
              Remove
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
