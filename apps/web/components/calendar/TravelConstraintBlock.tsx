'use client'
import { useHourHeight } from './HourHeightContext'
import type { BlockedRange } from './utils/travelConstraints'

interface TravelConstraintBlockProps {
  range: BlockedRange
  timeRangeStartHour: number
}

export function TravelConstraintBlock({
  range,
  timeRangeStartHour,
}: TravelConstraintBlockProps) {
  const HOUR_HEIGHT = useHourHeight()
  const top = (range.startHour - timeRangeStartHour) * HOUR_HEIGHT
  const height = (range.endHour - range.startHour) * HOUR_HEIGHT
  const minHeight = 12

  if (height < minHeight) return null

  const isFlight = range.type === 'flight-buffer' || range.type === 'flight'
  const isBuffer = range.type === 'flight-buffer' || range.type === 'transport-buffer'

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-[3]"
      style={{ top, height: Math.max(height, minHeight) }}
    >
      {/* Striped background pattern for buffer zones */}
      <div
        className="w-full h-full rounded-sm"
        style={{
          background: isFlight
            ? isBuffer
              ? 'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0, 53, 148, 0.03) 3px, rgba(0, 53, 148, 0.03) 6px)'
              : 'rgba(0, 53, 148, 0.04)'
            : isBuffer
              ? 'repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(37, 99, 235, 0.03) 3px, rgba(37, 99, 235, 0.03) 6px)'
              : 'rgba(37, 99, 235, 0.04)',
          borderLeft: isFlight
            ? `2px solid ${isBuffer ? 'rgba(0, 53, 148, 0.12)' : 'rgba(0, 53, 148, 0.2)'}`
            : `2px solid ${isBuffer ? 'rgba(37, 99, 235, 0.12)' : 'rgba(37, 99, 235, 0.2)'}`,
        }}
      >
        {/* Label */}
        {height >= 20 && (
          <span
            className="absolute left-2 top-0.5 text-[10px] font-medium leading-tight truncate max-w-[90%]"
            style={{
              color: isFlight
                ? isBuffer ? 'rgba(0, 53, 148, 0.4)' : 'rgba(0, 53, 148, 0.55)'
                : isBuffer ? 'rgba(37, 99, 235, 0.4)' : 'rgba(37, 99, 235, 0.55)',
            }}
          >
            <span className="mr-1">{isFlight ? '✈' : '🚗'}</span>
            {range.label}
          </span>
        )}
      </div>
    </div>
  )
}
