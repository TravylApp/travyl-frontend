'use client'

import { useState } from 'react'
import { Building2, MapPin, Star, MoreHorizontal } from 'lucide-react'
import type { HotelViewModel } from '@travyl/shared'

export interface HotelCardProps {
  hotel: HotelViewModel
  onEdit: () => void
  onDelete: () => void
}

export function HotelCard({ hotel, onEdit, onDelete }: HotelCardProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = hotel.imageUrl && !imgFailed
  return (
    <div
      onClick={onEdit}
      className="group rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]"
    >
      <div className="flex gap-4">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.imageUrl!}
            alt={hotel.name}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-[88px] h-[88px] rounded-xl object-cover shrink-0 bg-gray-100 dark:bg-white/[0.04]"
          />
        ) : (
          <div
            className="w-[88px] h-[88px] rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
          >
            <Building2 size={28} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
              {hotel.name}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded text-gray-400 hover:text-red-500"
              aria-label="Delete hotel"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
          {hotel.address && (
            <p className="flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{hotel.address}</span>
            </p>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
              {hotel.checkInDisplay} → {hotel.checkOutDisplay}
            </span>
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
              {hotel.nightsLabel}
            </span>
            {hotel.starRating != null && hotel.starRating > 0 && (
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                <Star size={10} fill="currentColor" />
                {hotel.starRating}
              </span>
            )}
            {hotel.rating != null && hotel.rating > 0 && (
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                {hotel.rating} guest rating
              </span>
            )}
            {hotel.priceDisplay && (
              <span className="ml-auto text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {hotel.priceDisplay}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
