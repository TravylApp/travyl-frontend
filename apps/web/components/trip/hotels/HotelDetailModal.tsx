'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Building2,
  Star,
  MapPin,
  Phone,
  Globe,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ExternalLink,
} from 'lucide-react'
import type { HotelViewModel, HotelData } from '@travyl/shared'

interface MapsHotelInfo {
  name: string | null
  image: string | null
  images: string[]
  rating: number | null
  reviewCount: number | null
  address: string | null
  description: string | null
  website: string | null
  phone: string | null
  hours: string | null
  latitude: number | null
  longitude: number | null
}

async function fetchHotelInfo(name: string, address: string | null): Promise<MapsHotelInfo | null> {
  try {
    const q = `${name} ${address ?? ''}`.trim()
    if (!q) return null
    const res = await fetch(`/api/search/maps?q=${encodeURIComponent(q)}`)
    if (!res.ok) return null
    const arr = await res.json()
    if (!Array.isArray(arr) || arr.length === 0) return null
    const top = arr[0]
    return {
      name: top.name || null,
      image: top.image || null,
      images: Array.isArray(top.images) ? top.images.slice(0, 6) : [],
      rating: typeof top.rating === 'number' && top.rating > 0 ? top.rating : null,
      reviewCount: typeof top.reviewCount === 'number' && top.reviewCount > 0 ? top.reviewCount : null,
      address: top.address || null,
      description: top.description || null,
      website: top.website || null,
      phone: top.phone || null,
      hours: top.hours || null,
      latitude: typeof top.latitude === 'number' ? top.latitude : null,
      longitude: typeof top.longitude === 'number' ? top.longitude : null,
    }
  } catch {
    return null
  }
}

export interface HotelDetailModalProps {
  hotel: HotelViewModel
  data: HotelData
  formatPrice: (n: number, currency?: string | null) => string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export function HotelDetailModal({ hotel, data, formatPrice, onClose, onEdit, onDelete }: HotelDetailModalProps) {
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

  // Enriched metadata via Google Maps (photos, description, website, phone).
  // Cached for 24h since hotels don't move and SerpAPI is paid.
  const { data: info, isLoading } = useQuery<MapsHotelInfo | null>({
    queryKey: ['hotel-info', data.name, data.address],
    queryFn: () => fetchHotelInfo(data.name, data.address),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  // Combined gallery: prefer enriched images, fall back to the saved image_url.
  const images = useMemo(() => {
    const fromInfo = info?.images ?? []
    const seed = data.image_url ? [data.image_url] : []
    const merged: string[] = []
    for (const url of [...seed, ...fromInfo]) {
      if (url && !merged.includes(url)) merged.push(url)
    }
    return merged
  }, [info?.images, data.image_url])

  const star = data.star_rating ?? null
  const guestRating = info?.rating ?? data.rating ?? null
  const reviewCount = info?.reviewCount ?? null
  const address = info?.address ?? data.address ?? null
  const description = info?.description ?? null
  const website = info?.website ?? null
  const phone = info?.phone ?? null

  const mapsQuery = encodeURIComponent(`${data.name} ${address ?? ''}`.trim())
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

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
                {data.name}
              </h2>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {hotel.checkInDisplay} → {hotel.checkOutDisplay} · {hotel.nightsLabel}
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
                alt={data.name}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed((m) => ({ ...m, [imgIdx]: true }))}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : isLoading && images.length === 0 ? (
              <div className="absolute inset-0 shimmer-skeleton" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
                <Building2 size={48} />
              </div>
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

          {/* Headline meta + CTA */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {star != null && star > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: star }).map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </span>
                )}
                {guestRating != null && guestRating > 0 && (
                  <span className="text-[13px] text-gray-700 dark:text-gray-300 tabular-nums">
                    <span className="font-semibold text-gray-900 dark:text-white">{guestRating.toFixed(1)}</span>
                    {reviewCount != null && reviewCount > 0 && (
                      <span className="text-gray-400 dark:text-gray-500"> ({reviewCount.toLocaleString()})</span>
                    )}
                    <span className="text-gray-400 dark:text-gray-500"> guest rating</span>
                  </span>
                )}
              </div>
              {address && (
                <p className="mt-1.5 text-[12px] text-gray-500 dark:text-gray-400 inline-flex items-start gap-1">
                  <MapPin size={11} className="mt-0.5 shrink-0" />
                  <span>{address}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {hotel.priceDisplay && (
                <div className="text-right">
                  <div className="text-[24px] font-semibold text-gray-900 dark:text-white tabular-nums leading-none">
                    {hotel.priceDisplay}
                  </div>
                  {data.price_per_night != null && data.total_price != null && data.total_price !== data.price_per_night && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      {formatPrice(data.price_per_night, data.currency)} / night
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-[13px] font-semibold text-white shadow-sm hover:shadow-md transition"
                style={{ backgroundColor: 'var(--trip-base)' }}
              >
                <Pencil size={13} /> Edit details
              </button>
            </div>
          </div>

          {/* External links row */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-[12px] font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://www.google.com/s2/favicons?domain=maps.google.com&sz=32"
                alt=""
                width={14}
                height={14}
                className="rounded-sm"
              />
              View on Google Maps
              <ExternalLink size={10} className="text-gray-400" />
            </a>
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-[12px] font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
              >
                <Globe size={12} className="text-gray-400" />
                Hotel website
                <ExternalLink size={10} className="text-gray-400" />
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-[12px] font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
              >
                <Phone size={12} className="text-gray-400" />
                {phone}
              </a>
            )}
          </div>

          {/* Booking summary card */}
          <section className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50/60 dark:bg-white/[0.02] p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCell label="Check-in" value={hotel.checkInDisplay} />
            <SummaryCell label="Check-out" value={hotel.checkOutDisplay} />
            <SummaryCell label="Nights" value={hotel.nightsLabel} />
            <SummaryCell
              label="Confirmation"
              value={data.booking_ref || '—'}
              mono={!!data.booking_ref}
            />
          </section>

          {description && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                About
              </h3>
              <p className="text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {description}
              </p>
            </section>
          )}

          {info?.hours && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                Hours
              </h3>
              <p className="text-[12px] text-gray-700 dark:text-gray-300">{info.hours}</p>
            </section>
          )}

          {/* Delete affordance — small, low-contrast at the bottom */}
          <div className="pt-2 border-t border-gray-100 dark:border-white/[0.06] flex">
            <button
              onClick={onDelete}
              className="text-[12px] font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Delete hotel
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function SummaryCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="leading-tight">
      <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 font-semibold">
        {label}
      </div>
      <div
        className={`text-[13px] font-semibold text-gray-900 dark:text-white mt-1 ${
          mono ? 'font-mono tracking-wider' : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}
