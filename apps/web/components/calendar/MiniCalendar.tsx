'use client'

interface MiniCalendarProps {
  tripStartDate: Date
  tripDays: number
  currentDay: number
  onSelectDay: (dayIndex: number) => void
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function MiniCalendar({
  tripStartDate,
  tripDays,
  currentDay,
  onSelectDay,
}: MiniCalendarProps) {
  const year = tripStartDate.getFullYear()
  const month = tripStartDate.getMonth()

  // First day of month (0 = Sun)
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build grid cells: leading nulls + day numbers
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null)

  // Trip range: tripStartDate.getDate() .. tripStartDate.getDate() + tripDays - 1
  const tripStartDom = tripStartDate.getDate()
  const tripEndDom = tripStartDom + tripDays - 1

  // Current calendar date's day-of-month
  const currentCalDate = new Date(tripStartDate)
  currentCalDate.setDate(tripStartDom + currentDay)
  const currentDom = currentCalDate.getDate()
  const currentDomMonth = currentCalDate.getMonth()

  function handleCellClick(dom: number) {
    // Convert day-of-month back to a trip day index
    const dayIndex = dom - tripStartDom
    if (dayIndex >= 0 && dayIndex < tripDays) {
      onSelectDay(dayIndex)
    }
  }

  return (
    <div className="p-2 text-xs select-none">
      {/* Month label */}
      <div className="text-center text-[var(--cal-text-secondary)] font-serif font-normal tracking-wide mb-1.5">
        {MONTH_NAMES[month]} {year}
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[var(--cal-text-tertiary)] font-medium"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((dom, idx) => {
          if (dom === null) return <div key={idx} className="h-5" />

          const inTrip = dom >= tripStartDom && dom <= tripEndDom
          const isCurrent = dom === currentDom && month === currentDomMonth

          return (
            <button
              key={idx}
              onClick={() => handleCellClick(dom)}
              disabled={!inTrip}
              className={[
                'h-5 w-5 flex items-center justify-center rounded text-[10px] transition-colors',
                isCurrent
                  ? 'bg-[#003594] text-white font-semibold'
                  : inTrip
                  ? 'text-[var(--cal-text-secondary)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)]'
                  : 'text-[var(--cal-border)] cursor-default',
              ].join(' ')}
            >
              {dom}
            </button>
          )
        })}
      </div>
    </div>
  )
}
