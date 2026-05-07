'use client'

import { useState } from 'react'
import { Plane, MoreHorizontal } from 'lucide-react'
import type { FlightViewModel } from '@travyl/shared'

export interface FlightCardProps {
  flight: FlightViewModel
  onEdit: () => void
  onDelete: () => void
}

function isNextDay(departureAt: string | null, arrivalAt: string | null): boolean {
  if (!departureAt || !arrivalAt) return false
  return new Date(arrivalAt).getDate() !== new Date(departureAt).getDate()
}

export function FlightCard({ flight, onEdit, onDelete }: FlightCardProps) {
  const [logoFailed, setLogoFailed] = useState(false)
  const titleParts = [
    flight.airline,
    flight.flightNumber,
    flight.cabinClass ? flight.cabinClass.charAt(0).toUpperCase() + flight.cabinClass.slice(1) : null,
  ].filter(Boolean)

  let durationDisplay: string | null = null
  if (flight.departureAt && flight.arrivalAt) {
    const ms = new Date(flight.arrivalAt).getTime() - new Date(flight.departureAt).getTime()
    if (ms > 0) {
      const h = Math.floor(ms / 3600000)
      const m = Math.round((ms % 3600000) / 60000)
      durationDisplay = `${h}h ${m}m`
    }
  }

  const nextDay = isNextDay(flight.departureAt, flight.arrivalAt)

  return (
    <div
      onClick={onEdit}
      className="group rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-4">
        {flight.airlineLogo && !logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={flight.airlineLogo}
            alt={flight.airline}
            referrerPolicy="no-referrer"
            onError={() => setLogoFailed(true)}
            className="w-11 h-11 rounded-lg object-contain bg-white border border-gray-100 dark:border-white/[0.06] p-1 shrink-0"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
          >
            <Plane size={18} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
              {titleParts.join(' · ')}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded text-gray-400 hover:text-red-500"
              aria-label="Delete flight"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mt-3">
            <div>
              <div className="font-serif text-[22px] text-[var(--trip-base)] tabular-nums leading-none">{flight.originIata}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                {flight.departureDisplay ?? '—'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.10]" />
              <span className="text-[10px] uppercase tracking-wide text-gray-400">{durationDisplay ?? 'Flight'}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.10]" />
            </div>
            <div className="text-right">
              <div className="font-serif text-[22px] text-[var(--trip-base)] tabular-nums leading-none">{flight.destIata}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                {flight.arrivalDisplay ?? '—'}
                {nextDay && <span className="text-amber-600 dark:text-amber-400 ml-1">(+1)</span>}
              </div>
            </div>
          </div>

          {flight.priceDisplay && (
            <div className="text-right mt-3 text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">
              {flight.priceDisplay}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
