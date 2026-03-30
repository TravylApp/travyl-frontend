'use client'
import { HOUR_HEIGHT } from './constants'
import { formatHourGutter } from './utils'
import type { TimeRange } from './types'

interface TimeGutterProps { timeRange: TimeRange }

export function TimeGutter({ timeRange }: TimeGutterProps) {
  const hours: number[] = []
  for (let h = timeRange.startHour; h <= timeRange.endHour; h++) hours.push(h)
  return (
    <div className="relative flex-shrink-0 w-16 text-right pr-3">
      {hours.map((hour) => (
        <div key={hour} className="relative text-xs text-[var(--cal-hour-text)] select-none whitespace-nowrap" style={{ height: HOUR_HEIGHT }}>
          <span className="absolute -top-2 right-3">{formatHourGutter(hour)}</span>
        </div>
      ))}
    </div>
  )
}
