'use client'

import type { LocalEvent } from './types'

const CATEGORY_COLORS: Record<LocalEvent['category'], string> = {
  music:    '#7C3AED',
  sports:   '#059669',
  arts:     '#D97706',
  family:   '#DB2777',
  festival: '#CA8A04',
  other:    '#6B7280',
}

const CATEGORY_LABELS: Record<LocalEvent['category'], string> = {
  music:    'Music',
  sports:   'Sports',
  arts:     'Arts',
  family:   'Family',
  festival: 'Festival',
  other:    'Other',
}

function formatEventDate(date: string, startTime: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = startTime.split(':').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const monthLabel = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const dayLabel = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
  return `${weekday} ${monthLabel} ${dayLabel} · ${time}`
}

interface EventCardProps {
  event: LocalEvent
}

export function EventCard({ event }: EventCardProps) {
  const color = CATEGORY_COLORS[event.category]

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--cal-border-light)] transition-colors rounded-lg">
      {/* Thumbnail */}
      <div
        className="shrink-0 w-12 h-12 rounded-lg overflow-hidden"
        style={{ backgroundColor: `${color}22` }}
      >
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--cal-text)] line-clamp-2 leading-snug">
          {event.name}
        </p>
        <p className="text-[11px] text-[var(--cal-text-secondary)] mt-0.5">
          {formatEventDate(event.date, event.startTime)}
        </p>
        <p className="text-[11px] text-[var(--cal-text-tertiary)] truncate">
          {event.venueName}
        </p>
        <span
          className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {CATEGORY_LABELS[event.category]}
        </span>
      </div>
    </div>
  )
}
