'use client'

import { useState } from 'react'
import { Plus, Check, Plane, ChevronDown, ChevronUp } from 'lucide-react'
import type { SerpFlight } from './flightSearch'

export interface FlightResultCardProps {
  flight: SerpFlight
  alreadySaved: boolean
  busy: boolean
  onAdd: (flight: SerpFlight) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
}

function formatTime(iso: string): string {
  const m = iso.match(/(\d{2}:\d{2})$/)
  return m ? m[1] : iso
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function FlightResultCard({ flight, alreadySaved, busy, onAdd, formatPrice }: FlightResultCardProps) {
  const [expanded, setExpanded] = useState(false)
  const first = flight.legs[0]
  const last = flight.legs[flight.legs.length - 1]
  const carriers = Array.from(new Set(flight.legs.map((l) => l.airline)))

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await onAdd(flight)
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-4">
          {flight.airlineLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flight.airlineLogo} alt={first?.airline ?? ''} className="w-10 h-10 object-contain shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[16px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {first ? formatTime(first.departure.time) : '—'}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-[16px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {last ? formatTime(last.arrival.time) : '—'}
              </span>
              <span className="text-[12px] text-gray-500 dark:text-gray-400 ml-2">
                {formatDuration(flight.totalDuration)}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-gray-600 dark:text-gray-400">
              {carriers.join(' + ')} · {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
              {' · '}
              <span className="font-mono">{first?.departure.id}</span>
              {' → '}
              <span className="font-mono">{last?.arrival.id}</span>
            </div>
          </div>
          {flight.price != null && (
            <div className="text-right shrink-0">
              <div className="text-[16px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {formatPrice(flight.price, 'USD')}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleAdd}
            disabled={busy || alreadySaved}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50"
            style={{ backgroundColor: alreadySaved ? 'rgb(107 114 128)' : 'var(--trip-base)' }}
          >
            {alreadySaved ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add to trip</>}
          </button>
          {flight.legs.length > 1 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 hover:underline"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {flight.legs.length} legs
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06] space-y-2">
            {flight.legs.map((leg, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <Plane size={12} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-gray-700 dark:text-gray-300">
                    {leg.airline} {leg.flightNumber} · {leg.travelClass}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    <span className="font-mono">{leg.departure.id}</span> {formatTime(leg.departure.time)} → <span className="font-mono">{leg.arrival.id}</span> {formatTime(leg.arrival.time)} · {formatDuration(leg.duration)}
                  </div>
                </div>
              </div>
            ))}
            {flight.layovers.map((l, i) => (
              <div key={`l-${i}`} className="text-[11px] text-gray-500 dark:text-gray-400 pl-5">
                Layover at {l.airport} ({l.id}) · {formatDuration(l.duration)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
