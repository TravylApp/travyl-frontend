'use client'

import { useState, useMemo } from 'react'
import { Calendar, MapPin } from 'iconoir-react'
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

const CATEGORY_ICONS: Record<string, string> = {
  music: '🎵',
  sports: '⚽',
  arts: '🎨',
  family: '👨‍👩‍👧‍👦',
  festival: '🎪',
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
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="relative px-3.5 pt-3.5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar width={13} height={13} className="text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-cal-text">
              Events{cityName ? ` in ${cityName}` : ''}
            </h2>
          </div>
          {dateRange && (
            <div className="flex items-center gap-1 text-[11px] text-cal-text-tertiary ml-8">
              <MapPin width={10} height={10} />
              <span>{dateRange}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter chips */}
      {!isDisabled && !isLoading && events.length > 0 && (
        <div className="px-3.5 pb-2.5 overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5">
            {FILTER_CHIPS.map(chip => {
              const isActive = activeChip === chip
              return (
                <button
                  key={chip}
                  onClick={() => setActiveChip(chip)}
                  className={[
                    'flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all border',
                    isActive
                      ? 'bg-primary border-primary text-white shadow-sm'
                      : 'border-cal-border text-cal-text-secondary hover:bg-cal-bg hover:text-cal-text hover:border-cal-text-tertiary',
                  ].join(' ')}
                >
                  {CATEGORY_ICONS[chip.toLowerCase()] && (
                    <span className="text-[10px]">{CATEGORY_ICONS[chip.toLowerCase()]}</span>
                  )}
                  {chip}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="h-0 grow overflow-y-auto pb-3 scrollbar-thin">
        {isDisabled ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cal-border/50 flex items-center justify-center mb-4">
              <Calendar width="20" height="20" className="text-cal-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-cal-text mb-1">No trip dates set</p>
            <p className="text-xs text-cal-text-tertiary">Add trip dates to discover local events</p>
          </div>
        ) : isLoading ? (
          <div className="px-3 space-y-3 pt-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-cal-border shrink-0" />
                <div className="flex-1 space-y-2 py-0.5">
                  <div className="h-3 bg-cal-border rounded w-3/4" />
                  <div className="h-2.5 bg-cal-border rounded w-1/2" />
                  <div className="h-2.5 bg-cal-border rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : onRetry && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-cal-text mb-1">Couldn&apos;t load events</p>
            <button
              onClick={onRetry}
              className="mt-3 text-xs font-medium text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cal-border/50 flex items-center justify-center mb-4">
              <Calendar width="20" height="20" className="text-cal-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-cal-text mb-1">No events during your trip</p>
            <p className="text-xs text-cal-text-tertiary">Check back closer to your travel dates</p>
          </div>
        ) : (
          <div className="px-2.5 space-y-2 pt-2">
            {filtered.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
