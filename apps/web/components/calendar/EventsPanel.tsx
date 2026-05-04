'use client'

import { useState, useMemo } from 'react'
import { EventCard } from './EventCard'
import type { LocalEvent } from './types'

const FILTER_CHIPS = ['All', 'Music', 'Sports', 'Arts', 'Family', 'Festivals'] as const
type FilterChip = (typeof FILTER_CHIPS)[number]

const CHIP_TO_CATEGORY: Record<FilterChip, LocalEvent['category'] | null> = {
  All:       null,
  Music:     'music',
  Sports:    'sports',
  Arts:      'arts',
  Family:    'family',
  Festivals: 'festival',
}

function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return ''
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'UTC',
    })
  }
  return `${fmt(startDate)}–${fmt(endDate)}`
}

interface EventsPanelProps {
  events: LocalEvent[]
  isLoading: boolean
  destination: string
  startDate: string
  endDate: string
  onRetry?: () => void
}

export function EventsPanel({
  events,
  isLoading,
  destination,
  startDate,
  endDate,
  onRetry,
}: EventsPanelProps) {
  const [activeChip, setActiveChip] = useState<FilterChip>('All')

  const filtered = useMemo(() => {
    const category = CHIP_TO_CATEGORY[activeChip]
    const sorted = [...events].sort((a, b) =>
      a.date === b.date
        ? a.startTime.localeCompare(b.startTime)
        : a.date.localeCompare(b.date),
    )
    return category ? sorted.filter(e => e.category === category) : sorted
  }, [events, activeChip])

  const dateRange = formatDateRange(startDate, endDate)
  const isDisabled = !startDate || !endDate
  const cityName = destination.split(',')[0]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3.5 pb-3 border-b border-cal-border-light">
        <h2 className="text-sm font-semibold text-cal-text">
          Events{cityName ? ` in ${cityName}` : ''}
        </h2>
        {dateRange && (
          <p className="text-[11px] text-cal-text-secondary mt-0.5">{dateRange}</p>
        )}
      </div>

      {/* Filter chips — only shown in loaded state */}
      {!isDisabled && !isLoading && events.length > 0 && (
      <div className="flex gap-1.5 px-3.5 pt-2.5 pb-0 overflow-x-auto">
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => setActiveChip(chip)}
            className={[
              'text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-all border',
              activeChip === chip
                ? 'bg-primary border-primary text-white'
                : 'border-cal-border text-cal-text-secondary hover:bg-cal-border-light hover:text-cal-text',
            ].join(' ')}
          >
            {chip}
          </button>
        ))}
      </div>
      )}

      {/* Content */}
      <div className="h-0 grow overflow-y-auto py-2 scrollbar-thin">
        {isDisabled ? (
          <div className="flex items-center justify-center h-full px-4 text-center">
            <p className="text-sm text-cal-text-secondary">
              Add trip dates to see local events
            </p>
          </div>
        ) : isLoading ? (
          <div className="px-3 space-y-3 pt-2">
            {[0, 1].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-cal-border animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-cal-border animate-pulse rounded w-3/4" />
                  <div className="h-2.5 bg-cal-border animate-pulse rounded w-1/2" />
                  <div className="h-2.5 bg-cal-border animate-pulse rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : onRetry && events.length === 0 ? (
          // Error state takes precedence over empty state when onRetry is provided
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <p className="text-sm text-cal-text-secondary">Couldn't load events</p>
            <button
              onClick={onRetry}
              className="text-xs text-cal-accent hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4 text-center">
            <p className="text-sm text-cal-text-secondary">
              No events found in {cityName} during your trip
            </p>
          </div>
        ) : (
          filtered.map(event => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
}
