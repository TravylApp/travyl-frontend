'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Building2,
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  ExternalLink,
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

export interface HotelResultDetailModalProps {
  hotel: SerpHotel
  alreadySaved: boolean
  busy: boolean
  onClose: () => void
  onAdd: (hotel: SerpHotel) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
}

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

export function HotelResultDetailModal({
  hotel,
  alreadySaved,
  busy,
  onClose,
  onAdd,
  formatPrice,
}: HotelResultDetailModalProps) {
  const [mounted, setMounted] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const [imgFailed, setImgFailed] = useState<Record<number, boolean>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const images = hotel.images.filter(Boolean)
  const currentImage = images[imgIdx]
  const imageBroken = !!imgFailed[imgIdx]

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIdx((i) => (i - 1 + images.length) % images.length)
  }
  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIdx((i) => (i + 1) % images.length)
  }

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await onAdd(hotel)
  }

  if (!mounted) return null

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hotel details"
        className="relative w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0e1620] shadow-2xl"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-6 pt-5 pb-4 bg-white/95 dark:bg-[#0e1620]/95 backdrop-blur border-b border-gray-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-gray-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[18px] font-serif tracking-tight text-gray-900 dark:text-white truncate">
                {hotel.name}
              </h2>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {hotel.neighborhood || hotel.address || ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Hero gallery */}
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/[0.03] dark:to-white/[0.06]">
            {currentImage && !imageBroken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentImage}
                alt={hotel.name}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed((m) => ({ ...m, [imgIdx]: true }))}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
                <Building2 size={48} />
              </div>
            )}

            {hotel.propertyType && (
              <span className="absolute top-3 left-3 px-2 h-7 inline-flex items-center rounded-full bg-white/95 dark:bg-black/70 backdrop-blur text-[11px] font-bold uppercase tracking-[0.08em] text-[#1e3a5f] dark:text-white">
                {hotel.propertyType}
              </span>
            )}
            {hotel.deal && (
              <span className="absolute top-3 right-3 px-2 h-7 inline-flex items-center rounded-full bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider">
                {hotel.deal}
              </span>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImg}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-gray-800 shadow-md backdrop-blur flex items-center justify-center"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={nextImg}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-gray-800 shadow-md backdrop-blur flex items-center justify-center"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`rounded-full transition-all ${
                        i === imgIdx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'
                      }`}
                    />
                  ))}
                </div>
                <span className="absolute bottom-3 right-3 px-2 h-6 inline-flex items-center rounded-md bg-black/60 backdrop-blur text-white text-[10px] font-medium tabular-nums">
                  {imgIdx + 1} / {images.length}
                </span>
              </>
            )}
          </div>

          {/* Headline meta + price/CTA */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {hotel.stars > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: hotel.stars }).map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </span>
                )}
                {hotel.rating > 0 && (
                  <span className="text-[13px] text-gray-700 dark:text-gray-300 tabular-nums">
                    <span className="font-semibold text-gray-900 dark:text-white">{hotel.rating.toFixed(1)}</span>
                    {hotel.reviews > 0 && (
                      <span className="text-gray-400 dark:text-gray-500"> ({hotel.reviews.toLocaleString()})</span>
                    )}
                    <span className="text-gray-400 dark:text-gray-500"> guest rating</span>
                  </span>
                )}
              </div>
              {hotel.address && (
                <p className="mt-1.5 text-[12px] text-gray-500 dark:text-gray-400 inline-flex items-start gap-1">
                  <MapPin size={11} className="mt-0.5 shrink-0" />
                  <span>{hotel.address}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {hotel.price != null && (
                <div className="text-right">
                  <div className="text-[26px] font-bold text-gray-900 dark:text-white tabular-nums leading-none">
                    {formatPrice(hotel.price, hotel.currency)}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1.5">
                    per night
                  </div>
                </div>
              )}
              <button
                onClick={handleAdd}
                disabled={busy || alreadySaved}
                className={`inline-flex items-center gap-1.5 px-4 h-10 rounded-lg text-[13px] font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50 ${
                  alreadySaved ? 'bg-gray-500' : ''
                }`}
                style={!alreadySaved ? { backgroundColor: 'var(--trip-base)' } : undefined}
              >
                {alreadySaved ? (
                  <>
                    <Check size={14} /> Added to trip
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Add to trip
                  </>
                )}
              </button>
            </div>
          </div>

          {/* External link */}
          {hotel.link && (
            <a
              href={hotel.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-[12px] font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition w-fit"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://www.google.com/s2/favicons?domain=google.com&sz=32"
                alt=""
                width={14}
                height={14}
                className="rounded-sm"
              />
              View on Google
              <ExternalLink size={10} className="text-gray-400" />
            </a>
          )}

          {hotel.description && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                About
              </h3>
              <p className="text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {hotel.description}
              </p>
            </section>
          )}

          {hotel.amenities.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                Amenities
              </h3>
              <div className="flex flex-wrap gap-2">
                {hotel.amenities.map((a) => {
                  const { Icon, label } = amenityIcon(a)
                  return (
                    <span
                      key={a}
                      className="text-[12px] text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2.5 py-1 rounded-md inline-flex items-center gap-1.5"
                      title={a}
                    >
                      <Icon size={12} /> {label}
                    </span>
                  )
                })}
              </div>
            </section>
          )}

          {hotel.dealDescription && (
            <section className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
              <p className="text-[12px] font-medium text-emerald-800 dark:text-emerald-300">
                {hotel.dealDescription}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
