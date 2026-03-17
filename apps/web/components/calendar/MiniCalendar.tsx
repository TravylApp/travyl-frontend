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
    <div className="select-none px-2 py-3">
      {/* Month label */}
      <p className="mb-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
        {MONTH_NAMES[month]} {year}
      </p>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className="text-center text-[10px] text-gray-600 font-medium">
            {d}
          </span>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((dom, idx) => {
          if (dom === null) {
            return <span key={`empty-${idx}`} />
          }

          const isInTrip = dom >= tripStartDom && dom <= tripEndDom
          const isCurrent =
            dom === currentDom && currentDomMonth === month

          return (
            <button
              key={dom}
              onClick={() => handleCellClick(dom)}
              disabled={!isInTrip}
              aria-label={`Day ${dom}`}
              aria-current={isCurrent ? 'date' : undefined}
              className={[
                'flex h-6 w-6 mx-auto items-center justify-center rounded-full text-[11px] transition-colors',
                isCurrent
                  ? 'bg-blue-600 text-white font-semibold'
                  : isInTrip
                  ? 'text-gray-200 hover:bg-white/10 cursor-pointer'
                  : 'text-gray-700 cursor-default',
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
