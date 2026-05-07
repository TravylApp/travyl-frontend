'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
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
  Clock,
  LogIn,
  LogOut,
  Wifi,
  Waves,
  Utensils,
  Coffee,
  Car as CarIcon,
  Dumbbell,
  Dog,
  Snowflake,
  Sparkles,
  Footprints,
  Train,
  Plane,
  Leaf,
} from 'lucide-react'
import type { SerpHotel } from './hotelSearch'

// Same Leaflet/CARTO map used on /explore and elsewhere — ssr disabled
// because Leaflet touches `window` at import time.
const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false })

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

function transportIcon(type: string): typeof Footprints {
  const t = type.toLowerCase()
  if (/walk|foot/.test(t)) return Footprints
  if (/train|subway|metro|rail/.test(t)) return Train
  if (/taxi|car|drive/.test(t)) return CarIcon
  if (/plane|flight|air/.test(t)) return Plane
  return Clock
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

  const hasCoords = hotel.lat !== 0 && hotel.lng !== 0
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lng}`

  if (!mounted) return null

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Hotel details"
        className="relative w-full max-w-6xl xl:max-w-7xl max-h-[92vh] overflow-hidden rounded-2xl bg-white dark:bg-[#0e1620] shadow-2xl flex flex-col"
      >
        {/* Sticky header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 bg-white dark:bg-[#0e1620] border-b border-gray-100 dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-serif tracking-tight text-gray-900 dark:text-white truncate">
                  {hotel.name}
                </h2>
                {hotel.propertyType && (
                  <span className="px-1.5 h-5 inline-flex items-center rounded text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/[0.10] shrink-0">
                    {hotel.propertyType}
                  </span>
                )}
                {hotel.ecoCertified && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 shrink-0">
                    <Leaf size={10} /> Eco
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                {hotel.stars > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: hotel.stars }).map((_, i) => (
                      <Star key={i} size={11} fill="currentColor" />
                    ))}
                  </span>
                )}
                {hotel.rating > 0 && (
                  <span className="tabular-nums">
                    <span className="font-semibold text-gray-900 dark:text-white">{hotel.rating.toFixed(1)}</span>
                    {hotel.reviews > 0 && (
                      <span className="text-gray-400"> ({hotel.reviews.toLocaleString()})</span>
                    )}
                  </span>
                )}
                {hotel.address && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <MapPin size={11} className="shrink-0" />
                    <span className="truncate">{hotel.address}</span>
                  </span>
                )}
              </div>
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

        {/* Two-column body */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] flex-1 min-h-0 overflow-hidden">
          {/* LEFT — gallery + content (scrolls) */}
          <div className="overflow-y-auto px-6 py-5 space-y-6">
            {/* Hero gallery */}
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/[0.03] dark:to-white/[0.06]">
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

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImg}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md backdrop-blur flex items-center justify-center"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={nextImg}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-md backdrop-blur flex items-center justify-center"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <span className="absolute bottom-3 right-3 px-2.5 h-7 inline-flex items-center rounded-md bg-black/65 backdrop-blur text-white text-[11px] font-semibold tabular-nums">
                    {imgIdx + 1} / {images.length}
                  </span>
                </>
              )}
            </div>

            {/* Thumbnail strip — scroll horizontally to jump */}
            {images.length > 1 && (
              <div className="-mt-3 flex gap-1.5 overflow-x-auto scrollbar-thin pb-1">
                {images.map((url, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation()
                      setImgIdx(i)
                    }}
                    className={`relative w-20 h-14 rounded-md overflow-hidden shrink-0 ring-2 transition ${
                      i === imgIdx ? 'ring-[var(--trip-base)]' : 'ring-transparent hover:ring-gray-200 dark:hover:ring-white/[0.10]'
                    }`}
                    aria-label={`Photo ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            {hotel.description && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  About this property
                </h3>
                <p className="text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {hotel.description}
                </p>
              </section>
            )}

            {/* Amenities */}
            {hotel.amenities.length > 0 && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                  Amenities · {hotel.amenities.length}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                  {hotel.amenities.map((a) => {
                    const { Icon, label } = amenityIcon(a)
                    return (
                      <div
                        key={a}
                        className="flex items-center gap-2 text-[12.5px] text-gray-700 dark:text-gray-300"
                      >
                        <Icon size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate" title={a}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Excluded amenities (factual, useful) */}
            {hotel.excludedAmenities.length > 0 && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  Not offered
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {hotel.excludedAmenities.map((a) => (
                    <span
                      key={a}
                      className="text-[11.5px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] px-2 py-0.5 rounded-md line-through decoration-gray-300"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Nearby places with transportation */}
            {hotel.nearbyPlaces.length > 0 && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                  What's nearby
                </h3>
                <ul className="space-y-2">
                  {hotel.nearbyPlaces.map((np) => (
                    <li key={np.name} className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-100 dark:border-white/[0.06] last:border-0">
                      <span className="text-[13px] text-gray-800 dark:text-gray-200 truncate">{np.name}</span>
                      <div className="flex items-center gap-2 text-[11.5px] text-gray-500 dark:text-gray-400 shrink-0">
                        {np.transportations.map((t, i) => {
                          const Icon = transportIcon(t.type)
                          return (
                            <span key={i} className="inline-flex items-center gap-1 tabular-nums">
                              <Icon size={11} className="text-gray-400" />
                              {t.duration}
                            </span>
                          )
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* RIGHT — booking + facts. Flex column so the map fills the
              remaining height down to the modal floor. */}
          <aside className="lg:border-l border-gray-100 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02] flex flex-col min-h-0">
            <div className="p-5 space-y-5 shrink-0">
              {/* Price + CTA card */}
              <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] p-4 space-y-3 shadow-sm">
                {hotel.price != null ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-bold text-gray-900 dark:text-white tabular-nums leading-none">
                      {formatPrice(hotel.price, hotel.currency)}
                    </span>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">/ night</span>
                  </div>
                ) : (
                  <p className="text-[13px] text-gray-400">Price not available</p>
                )}
                {hotel.totalRate != null && hotel.price != null && hotel.totalRate !== hotel.price && (
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 tabular-nums">
                    {formatPrice(hotel.totalRate, hotel.currency)} total
                  </p>
                )}
                <button
                  onClick={handleAdd}
                  disabled={busy || alreadySaved}
                  className={`w-full inline-flex items-center justify-center gap-1.5 px-4 h-11 rounded-lg text-[14px] font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50 ${
                    alreadySaved
                      ? 'bg-gray-500'
                      : 'bg-[#1e3a5f] hover:bg-[#162d4a]'
                  }`}
                >
                  {alreadySaved ? (
                    <>
                      <Check size={15} /> Added to trip
                    </>
                  ) : (
                    <>
                      <Plus size={15} /> Add to trip
                    </>
                  )}
                </button>
                {hotel.link && (
                  <a
                    href={hotel.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg border border-gray-200 dark:border-white/[0.10] text-[12.5px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
                  >
                    View on Google
                    <ExternalLink size={11} className="text-gray-400" />
                  </a>
                )}
              </div>

              {/* Quick facts */}
              <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] divide-y divide-gray-100 dark:divide-white/[0.06]">
                <FactRow icon={LogIn} label="Check-in" value={hotel.checkIn} />
                <FactRow icon={LogOut} label="Check-out" value={hotel.checkOut} />
                {hotel.neighborhood && (
                  <FactRow icon={MapPin} label="Neighborhood" value={hotel.neighborhood} />
                )}
                {hotel.reviews > 0 && (
                  <FactRow
                    icon={Star}
                    label="Reviews"
                    value={`${hotel.reviews.toLocaleString()} on Google`}
                  />
                )}
              </div>
            </div>

            {/* Map fills remaining vertical space down to the modal floor */}
            {hasCoords && (
              <div className="px-5 pb-5 flex-1 min-h-[260px] flex flex-col">
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] flex-1 flex flex-col min-h-0">
                  <div className="flex-1 min-h-0 relative">
                    <LeafletMap
                      lat={hotel.lat}
                      lng={hotel.lng}
                      label={hotel.name}
                      height="100%"
                      zoom={15}
                    />
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-white/[0.06]">
                    <span className="text-[10.5px] text-gray-400 dark:text-gray-500 tabular-nums">
                      {hotel.lat.toFixed(4)}, {hotel.lng.toFixed(4)}
                    </span>
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#1e3a5f] dark:text-blue-400 hover:underline"
                    >
                      Open in Maps
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function FactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof LogIn
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <Icon size={14} className="text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
          {label}
        </span>
        <span className="text-[12.5px] font-medium text-gray-900 dark:text-white truncate">{value}</span>
      </div>
    </div>
  )
}
