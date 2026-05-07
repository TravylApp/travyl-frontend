'use client'

import { useRef, useEffect, useMemo } from 'react'

interface DayStripProps {
  /** 0-based day index currently selected */
  selectedDayIndex: number
  /** Total number of trip days */
  totalDays: number
  /** Trip start date */
  tripStartDate: Date
  /** Called when user clicks a day */
  onSelectDay: (dayIndex: number) => void
  /** Per-day activity counts for density visualization — dayIndex → count */
  activityCounts?: Map<number, number>
}

function formatDayHeader(date: Date): { weekday: string; day: number; month: string } {
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    day: date.getUTCDate(),
    month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
  }
}

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  )
}

export function DayStrip({
  selectedDayIndex,
  totalDays,
  tripStartDate,
  onSelectDay,
  activityCounts,
}: DayStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  const maxActivityCount = useMemo(() => {
    if (!activityCounts || activityCounts.size === 0) return 0
    return Math.max(...activityCounts.values(), 1)
  }, [activityCounts])

  // Auto-scroll to keep selected day visible
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current
      const el = selectedRef.current
      const containerRect = container.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      if (elRect.left < containerRect.left || elRect.right > containerRect.right) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [selectedDayIndex])

  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const date = new Date(tripStartDate.getTime() + i * 86400000)
      return { dayIndex: i, ...formatDayHeader(date), date }
    })
  }, [totalDays, tripStartDate])

  return (
    <div className="flex bg-cal-surface-elevated/50">
      <div
        ref={scrollRef}
        className="flex flex-1 overflow-x-auto scrollbar-none gap-px"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {days.map(({ dayIndex, weekday, day, month, date }) => {
          const isSelected = dayIndex === selectedDayIndex
          const today = isToday(date)
          const count = activityCounts?.get(dayIndex) ?? 0
          const density = maxActivityCount > 0 ? count / maxActivityCount : 0

          return (
            <button
              key={dayIndex}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelectDay(dayIndex)}
              className={[
                'flex flex-col items-center flex-shrink-0 w-16 py-2 px-1 transition-colors relative',
                isSelected
                  ? 'bg-primary text-white'
                  : 'text-cal-text hover:bg-cal-accent-bg/40',
              ].join(' ')}
            >
              <span className="text-[10px] font-medium leading-tight opacity-70">
                {weekday}
              </span>
              <span className={[
                'text-[16px] font-bold leading-tight',
                today && !isSelected ? 'text-primary' : '',
              ].join(' ')}>
                {day}
              </span>
              <span className="text-[9px] leading-tight opacity-60">
                {month}
              </span>
              {/* Activity density bar */}
              {count > 0 && (
                <div className="absolute bottom-0 left-2 right-2 flex justify-center gap-[2px]">
                  {Array.from({ length: Math.min(count, 5) }, (_, i) => (
                    <span
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : '#3b82f6',
                        opacity: 0.3 + (i / 5) * 0.7,
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
