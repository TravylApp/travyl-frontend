'use client'

import { MoreHorizontal } from 'lucide-react'
import type { TransitViewModel } from '@travyl/shared'

const VEHICLE_ICONS: Record<string, string> = {
  train: '\u{1F686}', subway: '\u{1F687}', tram: '\u{1F68B}', light_rail: '\u{1F68A}',
  bus: '\u{1F68C}', ferry: '\u{26F4}\uFE0F', cable_car: '\u{1F6A0}', funicular: '\u{1F6A1}',
  rideshare: '\u{1F695}', shuttle: '\u{1F690}',
}

export interface TransitCardProps {
  transit: TransitViewModel
  formatPrice: (n: number, currency?: string | null) => string
  onEdit: () => void
  onDelete: () => void
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '\u2014'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '\u2014'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TransitCard({ transit, formatPrice, onEdit, onDelete }: TransitCardProps) {
  const d = transit
  const titleParts = [d.provider, d.routeName].filter(Boolean) as string[]

  return (
    <div
      onClick={onEdit}
      className="group rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-lg"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          {VEHICLE_ICONS[d.vehicleType] ?? '\u{1F686}'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
              {titleParts.length > 0 ? titleParts.join(' \u00B7 ') : d.route}
            </h3>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded text-gray-400 hover:text-red-500"
              aria-label="Delete transit"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
              {d.route}
            </span>
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
              {formatShortDate(d.departureAt)} {'\u2192'} {formatShortDate(d.arrivalAt)}
            </span>
            {d.price != null && (
              <span className="ml-auto text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {formatPrice(d.price, d.currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
