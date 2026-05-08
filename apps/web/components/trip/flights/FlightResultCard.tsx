'use client'

import { useState } from 'react'
import { Plus, Check, Plane, Leaf, Clock, ArmchairIcon } from 'lucide-react'
import type { SerpFlight } from './flightSearch'
import { FlightDetailModal } from './FlightDetailModal'

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

function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/)
  if (!m) return ''
  const d = new Date(`${m[1]}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function FlightResultCard({ flight, alreadySaved, busy, onAdd, formatPrice }: FlightResultCardProps) {
  const [open, setOpen] = useState(false)
  const first = flight.legs[0]
  const last = flight.legs[flight.legs.length - 1]
  const carriers = Array.from(new Set(flight.legs.map((l) => l.airline).filter(Boolean)))
  const airplanes = Array.from(new Set(flight.legs.map((l) => l.airplane).filter(Boolean)))
  const cabin = first?.travelClass
  const legroom = first?.legroom
  const co2Kg = flight.carbonEmissions?.this_flight != null
    ? Math.round(flight.carbonEmissions.this_flight / 1000)
    : null
  const co2Diff = flight.carbonEmissions?.difference_percent ?? null

  const stopsLabel = flight.stops === 0
    ? 'Nonstop'
    : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}${
        flight.layovers.length > 0
          ? ' · ' + flight.layovers.map((l) => l.id).filter(Boolean).join(', ')
          : ''
      }`

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await onAdd(flight)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOpen(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen(true)
        }
      }}
      className="rounded-2xl border border-gray-200/80 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:shadow-md hover:border-gray-300 dark:hover:border-white/[0.12] transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trip-base)]"
    >
      <div className="p-5">
        {/* Header: airline + price */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {flight.airlineLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flight.airlineLogo} alt={carriers[0] ?? 'airline'} className="w-10 h-10 object-contain rounded-md bg-white shrink-0 border border-gray-100 dark:border-white/[0.06]" />
            ) : (
              <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                <Plane size={16} className="text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
                {carriers.join(' + ') || 'Flight'}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {first?.flightNumber}
                {airplanes.length > 0 && ' · ' + airplanes.join(' + ')}
              </div>
            </div>
          </div>
          {flight.price != null && (
            <div className="text-right shrink-0">
              <div className="text-[20px] font-semibold text-gray-900 dark:text-white tabular-nums leading-none">
                {formatPrice(flight.price, 'USD')}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
                per traveler
              </div>
            </div>
          )}
        </div>

        {/* Timeline: departure ─ duration ─ arrival */}
        <div className="mt-4 flex items-center gap-3">
          <div className="text-left shrink-0">
            <div className="text-[20px] font-semibold text-gray-900 dark:text-white tabular-nums leading-none">
              {first ? formatTime(first.departure.time) : '—'}
            </div>
            <div className="text-[12px] font-mono font-semibold text-gray-700 dark:text-gray-300 mt-1">
              {first?.departure.id ?? ''}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[110px]">
              {first ? formatDate(first.departure.time) : ''}
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center px-2">
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 inline-flex items-center gap-1">
              <Clock size={10} /> {formatDuration(flight.totalDuration)}
            </div>
            <div className="relative w-full h-px bg-gray-200 dark:bg-white/[0.10]">
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--trip-base)]" />
              {flight.layovers.map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-white/40"
                  style={{ left: `${((i + 1) / (flight.layovers.length + 1)) * 100}%` }}
                />
              ))}
              <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--trip-base)]" />
            </div>
            <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-1.5">
              {stopsLabel}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[20px] font-semibold text-gray-900 dark:text-white tabular-nums leading-none">
              {last ? formatTime(last.arrival.time) : '—'}
            </div>
            <div className="text-[12px] font-mono font-semibold text-gray-700 dark:text-gray-300 mt-1">
              {last?.arrival.id ?? ''}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[110px]">
              {last ? formatDate(last.arrival.time) : ''}
            </div>
          </div>
        </div>

        {/* Metadata chips */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {flight.type && <Chip tone="blue">{flight.type}</Chip>}
          {cabin && <Chip>{cabin}</Chip>}
          {legroom && (
            <Chip>
              <ArmchairIcon size={10} className="-mt-0.5" /> {legroom}
            </Chip>
          )}
          {co2Kg != null && (
            <Chip
              tone={
                co2Diff != null && co2Diff < -5
                  ? 'green'
                  : co2Diff != null && co2Diff > 5
                    ? 'amber'
                    : 'neutral'
              }
            >
              <Leaf size={10} className="-mt-0.5" />
              {co2Kg} kg CO₂
              {co2Diff != null && (
                <span className="ml-0.5 opacity-80">
                  {co2Diff > 0 ? '+' : ''}{co2Diff}%
                </span>
              )}
            </Chip>
          )}
          {flight.tier === 'best' && <Chip tone="green">Best value</Chip>}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleAdd}
            disabled={busy || alreadySaved}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-[13px] font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50"
            style={{ backgroundColor: alreadySaved ? 'rgb(107 114 128)' : 'var(--trip-base)' }}
          >
            {alreadySaved ? <><Check size={13} /> Added to trip</> : <><Plus size={13} /> Add to trip</>}
          </button>
          <span className="text-[12px] text-gray-400 dark:text-gray-500">
            Click for full itinerary{flight.legs.length > 1 ? ` · ${flight.legs.length} legs` : ''}
          </span>
        </div>
      </div>

      {open && (
        <FlightDetailModal
          flight={flight}
          alreadySaved={alreadySaved}
          busy={busy}
          onClose={() => setOpen(false)}
          onAdd={onAdd}
          formatPrice={formatPrice}
        />
      )}
    </div>
  )
}

function Chip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'blue'
}) {
  const toneClasses =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
        : tone === 'blue'
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
          : 'bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-300'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${toneClasses}`}>
      {children}
    </span>
  )
}
