'use client'

import { useMemo } from 'react'
import { NavArrowLeft, NavArrowRight } from 'iconoir-react'

interface MiniMonthCalendarProps {
  /** Earliest date of the trip */
  tripStartDate: Date
  /** Latest date of the trip (inclusive) */
  tripEndDate: Date
  /** 0-based day index currently selected */
  selectedDayIndex: number
  /** Called when user clicks a day — receives the 0-based day index */
  onSelectDay: (dayIndex: number) => void
  /** Current month being viewed (0-based month number) */
  viewMonth: number
  /** Current year being viewed */
  viewYear: number
  /** Called when user navigates to a different month */
  onNavigate: (month: number, year: number) => void
  /** Per-day activity counts for density dots — dayIndex → count */
  activityCounts?: Map<number, number>
}

/** Generate days for a given month grid (with leading/trailing padding) */
function buildMonthGrid(year: number, month: number): { day: number; month: number; year: number }[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay() // 0=Sun
  const totalDays = lastDay.getDate()

  const weeks: { day: number; month: number; year: number }[][] = []
  let week: { day: number; month: number; year: number }[] = []

  // Leading padding from previous month
  const prevMonthLast = new Date(year, month, 0).getDate()
  for (let i = startPad - 1; i >= 0; i--) {
    week.push({ day: prevMonthLast - i, month: month - 1, year: month === 0 ? year - 1 : year })
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    week.push({ day: d, month, year })
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }

  // Trailing padding for next month
  if (week.length > 0) {
    let nextDay = 1
    while (week.length < 7) {
      week.push({ day: nextDay++, month: month + 1, year: month === 11 ? year + 1 : year })
    }
    weeks.push(week)
  }

  return weeks
}

/** Convert a day index offset to a Date */
function dayIndexToDate(tripStart: Date, dayIndex: number): Date {
  return new Date(tripStart.getTime() + dayIndex * 86400000)
}

/** Convert a Date to a 0-based day index from trip start */
function dateToDayIndex(tripStart: Date, date: Date): number {
  return Math.round((date.getTime() - tripStart.getTime()) / 86400000)
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function MiniMonthCalendar({
  tripStartDate,
  tripEndDate,
  selectedDayIndex,
  onSelectDay,
  viewMonth,
  viewYear,
  onNavigate,
  activityCounts,
}: MiniMonthCalendarProps) {
  const weeks = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const today = useMemo(() => new Date(), [])

  const tripStart = new Date(tripStartDate)
  tripStart.setHours(0, 0, 0, 0)
  const tripEnd = new Date(tripEndDate)
  tripEnd.setHours(23, 59, 59, 999)

  // Count total activities for the month to show density
  const maxActivityCount = useMemo(() => {
    if (!activityCounts || activityCounts.size === 0) return 0
    return Math.max(...activityCounts.values(), 1)
  }, [activityCounts])

  const isInTrip = (d: Date) => d >= tripStart && d <= tripEnd
  const isSelected = (d: Date) => isSameDay(d, dayIndexToDate(tripStartDate, selectedDayIndex))

  function getActivityDotCount(d: Date) {
    if (!activityCounts) return 0
    const idx = dateToDayIndex(tripStartDate, d)
    return activityCounts.get(idx) ?? 0
  }

  function handlePrevMonth() {
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear
    onNavigate(newMonth, newYear)
  }

  function handleNextMonth() {
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1
    const newYear = viewMonth === 11 ? viewYear + 1 : viewYear
    onNavigate(newMonth, newYear)
  }

  return (
    <div className="flex flex-col bg-cal-surface-elevated rounded-xl border border-cal-border overflow-hidden select-none">
      {/* Month header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded-md text-cal-text-secondary hover:bg-cal-accent-bg/60 hover:text-cal-text transition-colors"
          aria-label="Previous month"
        >
          <NavArrowLeft width={14} height={14} />
        </button>
        <span className="text-[13px] font-semibold text-cal-text">
          {formatMonthLabel(viewYear, viewMonth)}
        </span>
        <button
          onClick={handleNextMonth}
          className="p-1 rounded-md text-cal-text-secondary hover:bg-cal-accent-bg/60 hover:text-cal-text transition-colors"
          aria-label="Next month"
        >
          <NavArrowRight width={14} height={14} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-2 gap-0">
        {WEEKDAY_LABELS.map((l, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-cal-text-tertiary py-1">
            {l}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="px-2 pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0">
            {week.map(({ day, month, year }, di) => {
              const date = new Date(year, month, day)
              const inTrip = isInTrip(date)
              const sel = isSelected(date)
              const isToday = isSameDay(date, today)
              const inViewMonth = month === viewMonth
              const count = getActivityDotCount(date)
              const density = maxActivityCount > 0 ? count / maxActivityCount : 0

              return (
                <button
                  key={di}
                  onClick={() => {
                    if (inTrip) {
                      const idx = dateToDayIndex(tripStartDate, date)
                      onSelectDay(idx)
                    }
                  }}
                  disabled={!inTrip}
                  className={[
                    'relative flex flex-col items-center justify-center w-full py-1 rounded-lg text-xs transition-colors',
                    sel
                      ? 'bg-primary text-white font-bold'
                      : inTrip
                      ? 'text-cal-text hover:bg-cal-accent-bg/60 cursor-pointer'
                      : 'text-cal-text-tertiary/30 cursor-default',
                    isToday && !sel && inTrip ? 'ring-1 ring-primary/40' : '',
                  ].join(' ')}
                  aria-label={`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${inTrip ? ', trip day' : ''}`}
                >
                  <span className={[
                    !inViewMonth && inTrip ? 'opacity-50' : '',
                    sel ? 'text-white' : '',
                  ].join(' ')}>
                    {day}
                  </span>
                  {/* Activity density dot */}
                  {inTrip && count > 0 && (
                    <span
                      className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                      style={{
                        backgroundColor: sel ? 'rgba(255,255,255,0.8)' : '#3b82f6',
                        opacity: 0.3 + density * 0.7,
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
