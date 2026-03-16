'use client'

export interface FlightBanner {
  id: string
  label: string
  dayIndex: number
  direction: 'arrival' | 'departure'
}

export interface HotelBanner {
  id: string
  label: string
  startDayIndex: number
  endDayIndex: number
}

interface AllDayRowProps {
  days: { dayIndex: number }[]
  flights?: FlightBanner[]
  hotels?: HotelBanner[]
}

export function AllDayRow({ days, flights = [], hotels = [] }: AllDayRowProps) {
  if (flights.length === 0 && hotels.length === 0) return null

  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 min-h-[2rem]">
      {/* Gutter spacer matching TimeGutter width */}
      <div className="flex-shrink-0 w-14" />

      {/* Per-day cells */}
      <div className="flex flex-1 min-w-0">
        {days.map(({ dayIndex }) => {
          const dayFlights = flights.filter((f) => f.dayIndex === dayIndex)
          const dayHotels = hotels.filter(
            (h) => h.startDayIndex <= dayIndex && dayIndex <= h.endDayIndex,
          )

          return (
            <div
              key={dayIndex}
              className="flex-1 min-w-0 border-l border-gray-200 dark:border-gray-700 px-1 py-0.5 flex flex-col gap-0.5"
            >
              {/* Hotel banners */}
              {dayHotels.map((hotel) => {
                const isStart = hotel.startDayIndex === dayIndex
                const isEnd = hotel.endDayIndex === dayIndex
                return (
                  <div
                    key={hotel.id}
                    title={hotel.label}
                    className={[
                      'text-[10px] font-medium px-1 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 overflow-hidden',
                      isStart && isEnd
                        ? 'rounded'
                        : isStart
                        ? 'rounded-l pr-0'
                        : isEnd
                        ? 'rounded-r pl-0'
                        : 'rounded-none px-0',
                    ].join(' ')}
                  >
                    {isStart ? (
                      <span className="truncate block">{hotel.label}</span>
                    ) : (
                      <span className="text-amber-400 dark:text-amber-600">— — —</span>
                    )}
                  </div>
                )
              })}

              {/* Flight banners */}
              {dayFlights.map((flight) => (
                <div
                  key={flight.id}
                  title={flight.label}
                  className={[
                    'text-[10px] font-medium px-1 py-0.5 rounded truncate',
                    flight.direction === 'arrival'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
                  ].join(' ')}
                >
                  {flight.direction === 'arrival' ? '→ ' : '← '}
                  {flight.label}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
