'use client'

import { Car, MoreHorizontal } from 'lucide-react'
import type { CarRental } from './types'

export interface CarCardProps {
  car: CarRental
  formatPrice: (n: number, currency?: string | null) => string
  onEdit: () => void
  onDelete: () => void
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function computeDays(pickupAt: string | null, dropoffAt: string | null): number {
  if (!pickupAt || !dropoffAt) return 0
  const ms = new Date(dropoffAt).getTime() - new Date(pickupAt).getTime()
  if (!isFinite(ms) || ms <= 0) return 0
  return Math.max(1, Math.ceil(ms / 86400000))
}

export function CarCard({ car, formatPrice, onEdit, onDelete }: CarCardProps) {
  const { data } = car
  const titleParts = [data.vendor, data.vehicle].filter(Boolean) as string[]
  const days = computeDays(data.pickup_at, data.dropoff_at)
  const dateRange = `${formatShortDate(data.pickup_at)} → ${formatShortDate(data.dropoff_at)}`

  return (
    <div
      onClick={onEdit}
      className="group rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Car size={18} />
        </div>

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
              aria-label="Delete car rental"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
              {dateRange}
            </span>
            {days > 0 && (
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                {days} {days === 1 ? 'day' : 'days'}
              </span>
            )}
            {data.pickup_location && (
              <span
                className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full max-w-[160px] truncate"
                title={data.pickup_location}
              >
                {data.pickup_location}
              </span>
            )}
            {data.price != null && (
              <span className="ml-auto text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {formatPrice(data.price, data.currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
