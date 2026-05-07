'use client'

import { Star, Plus, Check } from 'lucide-react'
import type { SerpHotel } from './hotelSearch'

export interface HotelResultCardProps {
  hotel: SerpHotel
  alreadySaved: boolean
  busy: boolean
  onAdd: (hotel: SerpHotel) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
}

export function HotelResultCard({ hotel, alreadySaved, busy, onAdd, formatPrice }: HotelResultCardProps) {
  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await onAdd(hotel)
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden">
      <div className="flex gap-4 p-4">
        {hotel.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.images[0]}
            alt={hotel.name}
            className="w-28 h-24 object-cover rounded-lg shrink-0"
            referrerPolicy="no-referrer"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
              {hotel.name}
            </h3>
            {hotel.price != null && (
              <div className="text-right shrink-0">
                <div className="text-[15px] font-semibold text-gray-900 dark:text-white tabular-nums">
                  {formatPrice(hotel.price, hotel.currency)}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">/night</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-[12px] text-gray-600 dark:text-gray-400">
            {hotel.stars > 0 && (
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: hotel.stars }).map((_, i) => (
                  <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                ))}
              </span>
            )}
            {hotel.rating > 0 && (
              <span className="tabular-nums">
                {hotel.rating.toFixed(1)}
                {hotel.reviews > 0 && (
                  <span className="text-gray-400"> ({hotel.reviews})</span>
                )}
              </span>
            )}
          </div>

          {hotel.address && (
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1" title={hotel.address}>
              {hotel.address}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleAdd}
              disabled={busy || alreadySaved}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50"
              style={{ backgroundColor: alreadySaved ? 'rgb(107 114 128)' : 'var(--trip-base)' }}
            >
              {alreadySaved ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add to trip</>}
            </button>
            {hotel.link && (
              <a
                href={hotel.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-gray-500 dark:text-gray-400 hover:underline"
              >
                View on Google
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
