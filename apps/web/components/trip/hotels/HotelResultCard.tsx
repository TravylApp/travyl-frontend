'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Star,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  Building2,
  Wifi,
  Waves,
  Utensils,
  Coffee,
  Car as CarIcon,
  Dumbbell,
  Dog,
  Snowflake,
  Sparkles,
} from 'lucide-react'
import type { SerpHotel } from './hotelSearch'

export interface HotelResultCardProps {
  hotel: SerpHotel
  alreadySaved: boolean
  busy: boolean
  onAdd: (hotel: SerpHotel) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
  /** Open the detail modal. The card body is clickable; the Add and View
      links inside stop propagation so they keep working. */
  onOpen?: () => void
}

// Map common amenity strings → icon. Falls back to a sparkle for unknown ones.
function amenityIcon(name: string): { Icon: typeof Wifi; label: string } {
  const n = name.toLowerCase()
  if (/wifi|wi-fi|internet/.test(n)) return { Icon: Wifi, label: 'Wifi' }
  if (/pool/.test(n)) return { Icon: Waves, label: 'Pool' }
  if (/breakfast/.test(n)) return { Icon: Coffee, label: 'Breakfast' }
  if (/restaurant|dining/.test(n)) return { Icon: Utensils, label: 'Restaurant' }
  if (/parking|valet/.test(n)) return { Icon: CarIcon, label: 'Parking' }
  if (/gym|fitness/.test(n)) return { Icon: Dumbbell, label: 'Gym' }
  if (/pet/.test(n)) return { Icon: Dog, label: 'Pet-friendly' }
  if (/air condition|^a\/c$/.test(n)) return { Icon: Snowflake, label: 'A/C' }
  return { Icon: Sparkles, label: name }
}

export function HotelResultCard({ hotel, alreadySaved, busy, onAdd, formatPrice, onOpen }: HotelResultCardProps) {
  const [imgIdx, setImgIdx] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)
  const images = hotel.images.filter(Boolean)
  const currentImage = images[imgIdx]

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await onAdd(hotel)
  }

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIdx((i) => (i - 1 + images.length) % images.length)
    setImgFailed(false)
  }
  const next = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIdx((i) => (i + 1) % images.length)
    setImgFailed(false)
  }

  const topAmenities = hotel.amenities.slice(0, 4)

  return (
    <div
      onClick={onOpen}
      className={`group rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden hover:border-gray-300 dark:hover:border-white/[0.12] hover:shadow-sm transition-all flex flex-col ${onOpen ? 'cursor-pointer' : ''}`}
    >
      {/* Image carousel */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/[0.03] dark:to-white/[0.06]">
        {currentImage && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImage}
            alt={hotel.name}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 size={32} className="text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Carousel arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 hover:bg-white text-gray-700 shadow-sm backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 hover:bg-white text-gray-700 shadow-sm backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <ChevronRight size={14} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`rounded-full transition-all ${
                    i === imgIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Property type pill */}
        {hotel.propertyType && (
          <span className="absolute top-2 left-2 px-2 h-6 inline-flex items-center rounded-full bg-white/90 dark:bg-black/60 backdrop-blur text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1e3a5f] dark:text-white">
            {hotel.propertyType}
          </span>
        )}

        {/* Deal badge */}
        {hotel.deal && (
          <span className="absolute top-2 right-2 px-2 h-6 inline-flex items-center rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider">
            {hotel.deal}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate leading-tight">
              {hotel.name}
            </h3>
            {hotel.neighborhood && (
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{hotel.neighborhood}</p>
            )}
          </div>
        </div>

        {/* Stars + rating row */}
        <div className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-gray-300">
          {hotel.stars > 0 && (
            <span className="inline-flex items-center gap-0.5">
              {Array.from({ length: hotel.stars }).map((_, i) => (
                <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
              ))}
            </span>
          )}
          {hotel.rating > 0 && (
            <span className="tabular-nums">
              <span className="font-semibold text-gray-900 dark:text-white">{hotel.rating.toFixed(1)}</span>
              {hotel.reviews > 0 && <span className="text-gray-400 dark:text-gray-500"> ({hotel.reviews.toLocaleString()})</span>}
            </span>
          )}
        </div>

        {hotel.address && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-1" title={hotel.address}>
            {hotel.address}
          </p>
        )}

        {/* Amenity chips */}
        {topAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {topAmenities.map((a) => {
              const { Icon, label } = amenityIcon(a)
              return (
                <span
                  key={a}
                  className="text-[11px] text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                  title={a}
                >
                  <Icon size={11} /> {label}
                </span>
              )
            })}
          </div>
        )}

        {hotel.description && (
          <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{hotel.description}</p>
        )}

        {/* mt-auto pushes the divider + price row to the bottom regardless
            of description length, so all cards in a row have aligned prices */}
        <div className="border-t border-gray-100 dark:border-white/[0.06] mt-auto pt-2" />

        {/* Price + CTA */}
        <div className="flex items-end justify-between gap-2">
          <div>
            {hotel.price != null ? (
              <>
                <p className="text-[20px] font-bold text-gray-900 dark:text-white tabular-nums leading-none">
                  {formatPrice(hotel.price, hotel.currency)}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">per night</p>
              </>
            ) : (
              <p className="text-[12px] text-gray-400 dark:text-gray-500">Price not available</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleAdd}
              disabled={busy || alreadySaved}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50"
              style={{ backgroundColor: alreadySaved ? 'rgb(107 114 128)' : 'var(--trip-base)' }}
            >
              {alreadySaved ? (
                <>
                  <Check size={12} /> Added
                </>
              ) : (
                <>
                  <Plus size={12} /> Add to trip
                </>
              )}
            </button>
            {hotel.link && (
              <Link
                href={hotel.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-gray-400 dark:text-gray-500 hover:underline"
              >
                View on Google →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
