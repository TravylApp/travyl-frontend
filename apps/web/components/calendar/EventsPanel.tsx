'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EventCard, eventToSuggestion } from './EventCard'
import { SuggestionDetailDrawer } from './SuggestionDetailDrawer'
import type { LocalEvent } from './types'

interface EventsPanelProps {
  events: LocalEvent[]
  isLoading: boolean
  destination: string
  startDate: string
  endDate: string
  onRetry?: () => void
}

function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return ''
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'UTC',
    })
  }
  return `${fmt(startDate)} – ${fmt(endDate)}`
}

function formatDrawerDate(date: string, startTime: string): string {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  const [h, mi] = (startTime || '12:00').split(':').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, h, mi))
  if (Number.isNaN(dt.getTime())) return ''
  const weekday = dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const monthLabel = dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const dayLabel = dt.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })
  const time = startTime
    ? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
    : ''
  return time
    ? `${weekday} ${monthLabel} ${dayLabel} · ${time}`
    : `${weekday} ${monthLabel} ${dayLabel}`
}

export function EventsPanel({
  events,
  isLoading,
  destination,
  startDate,
  endDate,
  onRetry,
}: EventsPanelProps) {
  const sorted = useMemo(
    () =>
      [...events].sort((a, b) =>
        a.date === b.date
          ? a.startTime.localeCompare(b.startTime)
          : a.date.localeCompare(b.date),
      ),
    [events],
  )

  const cityName = destination.split(',')[0]
  const dateRange = formatDateRange(startDate, endDate)
  const isDisabled = !startDate || !endDate

  // Detail drawer — same pattern as ForYouPanel: a delayed unmount so the
  // slide-out CSS transition has time to play before we drop the node.
  const [selectedEvent, setSelectedEvent] = useState<LocalEvent | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDrawer = useCallback((event: LocalEvent) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setSelectedEvent(event)
    setIsClosing(false)
  }, [])

  const closeDrawer = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setSelectedEvent(null)
      setIsClosing(false)
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const drawerSuggestion = useMemo(
    () => (selectedEvent ? eventToSuggestion(selectedEvent) : null),
    [selectedEvent],
  )

  const drawerSubtitle = useMemo(() => {
    if (!selectedEvent) return undefined
    const date = formatDrawerDate(selectedEvent.date, selectedEvent.startTime)
    return selectedEvent.venueName
      ? date ? `${date} · ${selectedEvent.venueName}` : selectedEvent.venueName
      : date
  }, [selectedEvent])

  return (
    <aside
      className="relative flex flex-col h-full shrink-0 self-stretch border-l border-cal-border-light bg-cal-surface-elevated overflow-hidden"
      aria-label="Local events"
    >
      {/* Header — matches the For-You panel's headline + tagline pattern */}
      <div className="px-3.5 pt-3.5 pb-2">
        <h2 className="text-[14px] font-semibold text-cal-text truncate">
          Events in {cityName || 'this city'}
        </h2>
        <p className="text-[11px] text-cal-text-tertiary mt-px">
          {isDisabled
            ? 'Add trip dates to discover local events'
            : isLoading
              ? 'Searching upcoming events...'
              : sorted.length === 0
                ? `Nothing surfacing right now${dateRange ? ` for ${dateRange}` : ''}`
                : `${sorted.length} happening · drag onto a day to schedule`}
        </p>
      </div>

      {/* Body */}
      <div className="h-0 grow overflow-y-auto px-2 pb-3 scrollbar-thin">
        {isDisabled ? (
          <DisabledState />
        ) : isLoading ? (
          <LoadingSkeleton />
        ) : onRetry && sorted.length === 0 ? (
          <ErrorState onRetry={onRetry} />
        ) : sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2 pt-1 px-1">
            {sorted.map((event) => (
              <EventCard key={event.id} event={event} onSelect={openDrawer} />
            ))}
          </div>
        )}
      </div>

      {!isDisabled && !isLoading && sorted.length > 0 && (
        <div className="text-center text-[10px] text-cal-text-tertiary/50 py-2 border-t border-cal-border-light">
          Click an event for details · drag onto a day to schedule
        </div>
      )}

      {drawerSuggestion && selectedEvent && (
        <SuggestionDetailDrawer
          suggestion={drawerSuggestion}
          subtitle={drawerSubtitle}
          ctaLabel={selectedEvent.ticketUrl ? 'Get tickets' : undefined}
          ctaUrl={selectedEvent.ticketUrl ?? undefined}
          isClosing={isClosing}
          onClose={closeDrawer}
        />
      )}
    </aside>
  )
}

// ── Sub-components ────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="px-1 space-y-2 pt-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 px-2 py-2 animate-pulse">
          <div className="w-12 h-12 rounded-lg bg-cal-border shrink-0" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-3 bg-cal-border rounded w-3/4" />
            <div className="h-2.5 bg-cal-border rounded w-1/2" />
            <div className="h-2.5 bg-cal-border rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-cal-text mb-1">Couldn&apos;t load events</p>
      <p className="text-xs text-cal-text-tertiary mb-4">Something went wrong. Check your connection.</p>
      <button
        onClick={onRetry}
        className="text-xs font-medium text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
      >
        Try again
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/40">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-cal-text mb-1">No events surfacing right now</p>
      <p className="text-xs text-cal-text-tertiary max-w-[220px]">
        Check back closer to your travel dates — local events typically appear a few weeks out.
      </p>
    </div>
  )
}

function DisabledState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-cal-border/50 flex items-center justify-center mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cal-text-tertiary">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-cal-text mb-1">No trip dates set</p>
      <p className="text-xs text-cal-text-tertiary">Add trip dates to discover local events</p>
    </div>
  )
}
