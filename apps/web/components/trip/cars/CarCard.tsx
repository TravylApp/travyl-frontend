'use client'

import { useState } from 'react'
import { Car, MoreHorizontal, ArrowUpRight } from 'lucide-react'
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

// Best-effort supplier homepage lookup keyed off vendor name. Used as a
// fallback when the search result didn't carry a deep-link booking_url.
const SUPPLIER_HOMES: Record<string, string> = {
  avis: 'https://www.avis.com',
  hertz: 'https://www.hertz.com',
  budget: 'https://www.budget.com',
  enterprise: 'https://www.enterprise.com',
  alamo: 'https://www.alamo.com',
  national: 'https://www.nationalcar.com',
  sixt: 'https://www.sixt.com',
  thrifty: 'https://www.thrifty.com',
  dollar: 'https://www.dollar.com',
  europcar: 'https://www.europcar.com',
  ace: 'https://www.acerentacar.com',
  fox: 'https://www.foxrentacar.com',
  payless: 'https://www.paylesscar.com',
}

function cleanVendor(vendor: string): string {
  // First word, lowercased, normalized for diacritics. Most car-rental brand
  // names ("Avis Rent a Car", "Hertz Gold Plus", "Enterprise Holdings") share
  // a single distinctive first token, so this is more reliable than trying to
  // strip suffixes with a regex.
  const first = vendor.toLowerCase().split(/\s+/)[0] ?? ''
  return first.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function supplierUrl(vendor: string): string | null {
  if (!vendor) return null
  const key = cleanVendor(vendor)
  if (key && SUPPLIER_HOMES[key]) return SUPPLIER_HOMES[key]
  return `https://www.google.com/search?q=${encodeURIComponent(`${vendor} car rental`)}`
}

function vendorLabel(vendor: string): string {
  // Display label for the "View on <vendor>" button. Use the first word
  // capitalized so "Avis Rent a Car" → "Avis", "HERTZ" → "Hertz".
  const first = vendor.split(/\s+/)[0] ?? ''
  if (!first) return 'supplier'
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

export function CarCard({ car, formatPrice, onEdit, onDelete }: CarCardProps) {
  const { data } = car
  const [logoFailed, setLogoFailed] = useState(false)
  const titleParts = [data.vendor, data.vehicle].filter(Boolean) as string[]
  const days = computeDays(data.pickup_at, data.dropoff_at)
  const dateRange = `${formatShortDate(data.pickup_at)} → ${formatShortDate(data.dropoff_at)}`
  const externalUrl = data.booking_url || supplierUrl(data.vendor)

  return (
    <div
      onClick={onEdit}
      className="group rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-4">
        {data.supplier_logo && !logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.supplier_logo}
            alt={data.vendor}
            referrerPolicy="no-referrer"
            onError={() => setLogoFailed(true)}
            className="w-11 h-11 rounded-lg object-contain bg-white border border-gray-100 dark:border-white/[0.06] p-1 shrink-0"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
          >
            <Car size={18} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
              {titleParts.join(' · ')}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              {externalUrl && (
                <a
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-[var(--trip-base)] transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                  title={`Open ${vendorLabel(data.vendor)} site`}
                >
                  View on {vendorLabel(data.vendor)}
                  <ArrowUpRight size={12} />
                </a>
              )}
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
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            {data.booking_ref ? (
              <div className="leading-tight">
                <div className="text-[9px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 font-semibold">
                  Confirmation
                </div>
                <div className="font-mono text-[12px] font-semibold text-gray-700 dark:text-gray-300 tracking-wider mt-0.5">
                  {data.booking_ref}
                </div>
              </div>
            ) : (
              <span />
            )}
            {data.price != null && (
              <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                {formatPrice(data.price, data.currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
