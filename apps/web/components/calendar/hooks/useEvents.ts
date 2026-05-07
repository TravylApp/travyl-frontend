'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { LocalEvent } from '../types'

interface UseEventsParams {
  destination: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
}

interface UseEventsReturn {
  events: LocalEvent[]
  eventsByDate: Record<string, LocalEvent[]>
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

// ── SerpAPI shape (subset we actually consume) ─────────────

interface SerpEvent {
  id: string
  name: string
  date: string                     // e.g. "Wed, Jun 5, 7:00 PM" or "Jun 5"
  time: string | null              // same shape as `date`, sometimes null
  venue: string
  venue_rating: number | null
  venue_reviews: number | null
  address: string
  lat: number | null
  lng: number | null
  description: string
  photo_url: string
  link: string
  ticket_links: { source: string; url: string }[]
  info_links: { source: string; url: string }[]
}

// ── Helpers ────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

/** Parse a SerpAPI Google Events date string into a Date in the trip year.
 * Strings like "Wed, Jun 5", "Jun 5, 7:00 PM", or "Wed, Jun 5, 7:00 PM" are
 * common; year is missing, so we anchor to the trip's start year and shift
 * forward by 12 months if we'd otherwise produce a date before the trip start. */
function parseTimeMatch(hourStr: string | undefined, minStr: string | undefined, ampm: string | undefined): { hour: number; min: number; hasTime: boolean } {
  if (!hourStr) return { hour: 12, min: 0, hasTime: false }
  let hour = parseInt(hourStr, 10)
  const min = minStr ? parseInt(minStr, 10) : 0
  const lower = ampm?.toLowerCase()
  if (lower === 'pm' && hour < 12) hour += 12
  if (lower === 'am' && hour === 12) hour = 0
  return { hour, min, hasTime: true }
}

function parseSerpDate(raw: string, anchor: Date): { date: Date; hasTime: boolean } | null {
  if (!raw) return null
  const lower = raw.toLowerCase()

  // 1. "Today" / "Tonight" / "Tomorrow" with optional time.
  const relMatch = lower.match(/(today|tonight|tomorrow)(?:[,\s]+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/)
  if (relMatch) {
    const offsetDays = relMatch[1] === 'tomorrow' ? 1 : 0
    const t = parseTimeMatch(relMatch[2], relMatch[3], relMatch[1] === 'tonight' ? 'pm' : relMatch[4])
    const d = new Date(anchor.getTime() + offsetDays * 86400000)
    return {
      date: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), t.hour, t.min)),
      hasTime: t.hasTime,
    }
  }

  // 2. ISO date "YYYY-MM-DD" (sometimes paired with a time).
  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/)
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10)
    const mo = parseInt(isoMatch[2], 10) - 1
    const d = parseInt(isoMatch[3], 10)
    const h = isoMatch[4] ? parseInt(isoMatch[4], 10) : 12
    const mi = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0
    return { date: new Date(Date.UTC(y, mo, d, h, mi)), hasTime: !!isoMatch[4] }
  }

  // 3. "Mon DD" with optional ", H[:MM] AM/PM" and optional weekday prefix.
  //    Positional groups (ES2017-safe):
  //      1: month abbreviation, 2: day, 3: hour (opt), 4: minute (opt), 5: am/pm (opt)
  const m = raw.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:,?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i)
  if (m) {
    const mon = MONTHS[m[1].toLowerCase()]
    const day = parseInt(m[2], 10)
    const t = parseTimeMatch(m[3], m[4], m[5])
    const year = anchor.getUTCFullYear()
    let candidate = new Date(Date.UTC(year, mon, day, t.hour, t.min))
    // SerpAPI omits the year. If the parsed date falls > 6 months before the
    // anchor, assume next year. Keeps trips that span New Year sane.
    const sixMonthsMs = 1000 * 60 * 60 * 24 * 180
    if (candidate.getTime() < anchor.getTime() - sixMonthsMs) {
      candidate = new Date(Date.UTC(year + 1, mon, day, t.hour, t.min))
    }
    return { date: candidate, hasTime: t.hasTime }
  }

  return null
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** EventCard.formatEventDate expects "HH:MM" 24-hour, splits on ':' and Number()s
 * the parts. Anything else parses to NaN and renders "Invalid Date". */
function format24hTime(d: Date): string {
  const h = d.getUTCHours()
  const m = d.getUTCMinutes()
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Best-effort categorization based on the event's title + description.
 * Maps to LocalEvent's enum so the category chips actually filter something. */
function inferCategory(name: string, description: string): LocalEvent['category'] {
  const text = `${name} ${description}`.toLowerCase()
  if (/(festival|fest\b|fair\b|carnival|expo)/.test(text)) return 'festival'
  if (/(concert|music|band|dj\b|tour\b|live\s|symphony|orchestra|edm|hip[- ]hop|rock\b|jazz|opera|country)/.test(text)) return 'music'
  if (/(game\b|match\b|nba|nfl|mlb|nhl|soccer|football|basketball|baseball|hockey|tennis|race\b|marathon)/.test(text)) return 'sports'
  if (/(family|kids|children|disney|cartoon|circus|magic show)/.test(text)) return 'family'
  if (/(art\b|gallery|museum|theatre|theater|broadway|musical\b|exhibit|comedy|standup|stand-up|drama|ballet)/.test(text)) return 'arts'
  return 'other'
}

// ── Fetcher ────────────────────────────────────────────────

async function fetchEvents(destination: string): Promise<LocalEvent[]> {
  if (!destination) return []
  // Ask for 3 pages (~30 results) — SerpAPI Google Events returns 10/page
  // and dedupes overlap server-side; more pages = more events surfaced
  // without blowing past the route's per-IP rate limit.
  const params = new URLSearchParams({ city: destination, pages: '3' })
  const res = await fetch(`/api/events/search?${params}`)
  if (!res.ok) return []
  const raw = (await res.json()) as SerpEvent[] | { events: SerpEvent[] }
  const list: SerpEvent[] = Array.isArray(raw) ? raw : (raw?.events ?? [])

  // SerpAPI Google Events returns "upcoming" events around the request time,
  // not events scoped to a specific date range. For trips far in the future
  // (or in the past) the returned events won't sit inside the trip window —
  // we still surface them, sorted by date, since "what's happening in <city>
  // around now" is the most useful signal we can offer.
  const anchor = new Date()

  const mapped: LocalEvent[] = []
  for (const ev of list) {
    if (!ev?.name) continue
    const parsed = parseSerpDate(ev.date || ev.time || '', anchor)
    if (!parsed) continue

    const ticket = ev.ticket_links?.[0]?.url || ev.link || undefined

    mapped.push({
      id: ev.id || `evt-${mapped.length}-${parsed.date.getTime()}`,
      name: ev.name,
      category: inferCategory(ev.name, ev.description || ''),
      date: toISODate(parsed.date),
      // Always emit "HH:MM" 24h. Fall back to noon for date-only events so
      // EventCard still renders a parseable Date instead of "Invalid Date".
      startTime: parsed.hasTime ? format24hTime(parsed.date) : '12:00',
      venueName: ev.venue || '',
      venueAddress: ev.address || undefined,
      imageUrl: ev.photo_url || undefined,
      ticketUrl: ticket,
    })
  }

  return mapped
}

// ── Hook ───────────────────────────────────────────────────

export function useEvents({
  destination,
  startDate,
  endDate,
}: UseEventsParams): UseEventsReturn {
  const {
    data: events = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    // startDate/endDate are part of the key so swapping trips with the same
    // city still busts the cache — but we no longer pass them into the fetch
    // because SerpAPI ignores arbitrary date ranges anyway.
    queryKey: ['trip-events', destination, startDate, endDate],
    queryFn: () => fetchEvents(destination),
    enabled: !!destination,
    staleTime: 60 * 60 * 1000,       // 1 hour
    gcTime: 2 * 60 * 60 * 1000,     // 2 hours
  })

  const eventsByDate = useMemo(() => {
    const map: Record<string, LocalEvent[]> = {}
    for (const event of events) {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    }
    return map
  }, [events])

  return {
    events,
    eventsByDate,
    isLoading,
    error,
    refetch,
  }
}
