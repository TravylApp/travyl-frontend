'use client'
import { AnimatePresence, motion } from 'motion/react'
import { Clock, MapPin, Wallet, Star, Xmark } from 'iconoir-react'
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
              <Xmark width={16} height={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          {/* Details */}
          <dl className="flex flex-col gap-3 px-4 py-2 text-sm">
            {/* Time */}
            <div className="flex items-center gap-2">
              <Clock
                width={16}
                height={16}
                strokeWidth={1.5}
                className="shrink-0 text-gray-500"
                aria-hidden="true"
              />
              <dt className="sr-only">Time</dt>
              <dd className="text-gray-300">{formatTimeRange(activity)}</dd>
            </div>

            {/* Location */}
            {activity.location && (
              <div className="flex items-start gap-2">
                <MapPin
                  width={16}
                  height={16}
                  strokeWidth={1.5}
                  className="mt-0.5 shrink-0 text-gray-500"
                  aria-hidden="true"
                />
                <dt className="sr-only">Location</dt>
                <dd className="text-gray-300 leading-snug">{activity.location}</dd>
              </div>
            )}

            {/* Price */}
            {activity.price && (
              <div className="flex items-center gap-2">
                <Wallet
                  width={16}
                  height={16}
                  strokeWidth={1.5}
                  className="shrink-0 text-gray-500"
                  aria-hidden="true"
                />
                <dt className="sr-only">Price</dt>
                <dd className="text-gray-300">{activity.price}</dd>
              </div>
            )}

            {/* Rating */}
            {activity.rating != null && (
              <div className="flex items-center gap-2">
                <Star
                  width={16}
                  height={16}
                  strokeWidth={1.5}
                  fill="currentColor"
                  className="shrink-0 text-yellow-400"
                  aria-hidden="true"
                />
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
