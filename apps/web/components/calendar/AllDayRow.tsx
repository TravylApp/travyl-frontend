'use client'

import { useState, useEffect, useRef } from 'react'
import type { LocalEvent } from './types'

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

const CATEGORY_COLORS: Record<LocalEvent['category'], string> = {
  music:    '#7C3AED',
  sports:   '#059669',
  arts:     '#D97706',
  family:   '#DB2777',
  festival: '#CA8A04',
  other:    '#6B7280',
}

function formatPillTime(startTime: string): string {
  const [h, m] = startTime.split(':').map(Number)
  const d = new Date(0)
  d.setUTCHours(h, m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
}

interface EventPillProps {
  event: LocalEvent
}

function EventPill({ event }: EventPillProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const color = CATEGORY_COLORS[event.category]

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left text-[10px] px-1 py-0.5 rounded truncate leading-tight"
        style={{
          backgroundColor: `${color}26`,
          borderLeft: `2px solid ${color}`,
          color: 'var(--cal-text)',
        }}
        title={event.name}
      >
        {event.name}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-cal-surface-elevated border border-cal-border rounded-lg shadow-lg p-3 text-left">
          <p className="text-[13px] font-semibold text-cal-text leading-snug mb-1">
            {event.name}
          </p>
          <p className="text-[11px] text-cal-text-secondary">
            {formatPillTime(event.startTime)}
            {event.endTime ? ` – ${formatPillTime(event.endTime)}` : ''}
          </p>
          <p className="text-[11px] text-cal-text-tertiary mt-0.5 truncate">
            {event.venueName}
          </p>
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[11px] font-medium text-primary hover:underline"
            >
              Get tickets →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

interface OverflowPillProps {
  events: LocalEvent[]
}

function OverflowPill({ events }: OverflowPillProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left text-[10px] px-1 py-0.5 rounded truncate leading-tight text-cal-text-secondary bg-cal-border-light hover:bg-cal-border transition-colors"
      >
        +{events.length} more
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-cal-surface-elevated border border-cal-border rounded-lg shadow-lg py-1">
          {events.map(event => {
            const color = CATEGORY_COLORS[event.category]
            return (
              <div key={event.id} className="flex items-start gap-2 px-3 py-2 hover:bg-cal-border-light transition-colors">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-cal-text truncate">{event.name}</p>
                  <p className="text-[10px] text-cal-text-secondary">
                    {formatPillTime(event.startTime)} · {event.venueName}
                  </p>
                  {event.ticketUrl && (
                    <a
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline"
                    >
                      Tickets →
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const MAX_PILLS = 3

interface AllDayRowProps {
  days: { dayIndex: number; isoDate?: string }[]
  flights?: FlightBanner[]
  hotels?: HotelBanner[]
  eventsByDate?: Record<string, LocalEvent[]>
  showEvents?: boolean
}

export function AllDayRow({
  days,
  flights = [],
  hotels = [],
  eventsByDate = {},
  showEvents = true,
}: AllDayRowProps) {
  const hasEvents = showEvents && Object.values(eventsByDate).some(arr => arr.length > 0)
  if (flights.length === 0 && hotels.length === 0 && !hasEvents) return null

  return (
    <div className="flex border-b border-cal-border min-h-[2rem]">
      {/* Gutter spacer matching TimeGutter width */}
      <div className="flex-shrink-0 w-14" />

      {/* Per-day cells */}
      <div className="flex flex-1 min-w-0">
        {days.map(({ dayIndex, isoDate }) => {
          const dayFlights = flights.filter(f => f.dayIndex === dayIndex)
          const dayHotels = hotels.filter(
            h => h.startDayIndex <= dayIndex && dayIndex <= h.endDayIndex,
          )
          const dayEvents: LocalEvent[] = showEvents && isoDate
            ? (eventsByDate[isoDate] ?? [])
            : []

          return (
            <div
              key={dayIndex}
              className="flex-1 min-w-0 border-l border-cal-border-light px-1 py-0.5 flex flex-col gap-0.5"
            >
              {/* Hotel banners */}
              {dayHotels.map(hotel => {
                const isStart = hotel.startDayIndex === dayIndex
                const isEnd = hotel.endDayIndex === dayIndex
                return (
                  <div
                    key={hotel.id}
                    title={hotel.label}
                    className={[
                      'text-[10px] font-medium px-1 py-0.5 bg-amber-100 text-amber-800 overflow-hidden',
                      isStart && isEnd ? 'rounded'
                        : isStart ? 'rounded-l pr-0'
                        : isEnd ? 'rounded-r pl-0'
                        : 'rounded-none px-0',
                    ].join(' ')}
                  >
                    {isStart ? (
                      <span className="truncate block">{hotel.label}</span>
                    ) : (
                      <span className="text-amber-400">— — —</span>
                    )}
                  </div>
                )
              })}

              {/* Flight banners */}
              {dayFlights.map(flight => (
                <div
                  key={flight.id}
                  title={flight.label}
                  className={[
                    'text-[10px] font-medium px-1 py-0.5 rounded truncate',
                    flight.direction === 'arrival'
                      ? 'bg-cal-accent-bg text-cal-accent'
                      : 'bg-red-50 text-red-700',
                  ].join(' ')}
                >
                  {flight.direction === 'arrival' ? '→ ' : '← '}
                  {flight.label}
                </div>
              ))}

              {/* Event pills */}
              {dayEvents.slice(0, MAX_PILLS).map(event => (
                <EventPill key={event.id} event={event} />
              ))}
              {dayEvents.length > MAX_PILLS && (
                <OverflowPill events={dayEvents.slice(MAX_PILLS)} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
