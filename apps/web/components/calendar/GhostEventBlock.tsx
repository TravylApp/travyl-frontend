'use client'
import { useHourHeight } from './HourHeightContext'
import type { CalendarActivity } from './types'

interface GhostEventBlockProps {
  activity: CalendarActivity
  timeRangeStartHour: number
  onConfirm: (activity: CalendarActivity) => void
  onDismiss: (id: string) => void
}

export function GhostEventBlock({
  activity,
  timeRangeStartHour,
  onConfirm,
  onDismiss,
}: GhostEventBlockProps) {
  const HOUR_HEIGHT = useHourHeight()
  const top = (activity.startHour - timeRangeStartHour) * HOUR_HEIGHT
  const height = activity.duration * HOUR_HEIGHT

  return (
    <div
      className="absolute left-0 right-0 px-1"
      style={{ top, height, pointerEvents: 'auto' }}
    >
      <div
        className="relative h-full rounded-md border-2 border-dashed flex flex-col justify-between p-2 overflow-hidden"
        style={{
          opacity: 0.55,
          borderColor: 'var(--cal-accent)',
          background: 'color-mix(in srgb, var(--cal-accent) 10%, transparent)',
        }}
      >
        <span className="text-[11px] font-medium text-cal-text truncate leading-tight">
          {activity.title}
        </span>
        <div className="flex gap-1 justify-end mt-1">
          <button
            onClick={() => onConfirm(activity)}
            className="text-[10px] font-semibold rounded px-2 py-0.5 transition-opacity"
            style={{ background: 'var(--cal-accent)', color: 'white' }}
          >
            + Add
          </button>
          <button
            onClick={() => onDismiss(activity.id)}
            className="text-[10px] rounded px-2 py-0.5 transition-colors"
            style={{ color: 'var(--cal-text-secondary)', background: 'transparent' }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
