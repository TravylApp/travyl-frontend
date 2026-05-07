'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueries } from '@tanstack/react-query'
import {
  X,
  Plane,
  Clock,
  Leaf,
  ArmchairIcon,
  Plus,
  Check,
  MapPin,
  Star,
  ExternalLink,
  Building2,
} from 'lucide-react'
import type { SerpFlight } from './flightSearch'

interface AirportInfo {
  iata: string
  name: string
  image: string | null
  images: string[]
  rating: number | null
  reviewCount: number | null
  address: string | null
  description: string | null
  website: string | null
  latitude: number | null
  longitude: number | null
}

async function fetchAirportInfo(iata: string, fallbackName: string): Promise<AirportInfo> {
  try {
    const q = `${iata} airport ${fallbackName ?? ''}`.trim()
    const res = await fetch(`/api/search/maps?q=${encodeURIComponent(q)}`)
    if (!res.ok) throw new Error('lookup failed')
    const arr = await res.json()
    const top = Array.isArray(arr) && arr.length > 0 ? arr[0] : null
    if (!top) throw new Error('no result')
    return {
      iata,
      name: top.name || fallbackName || iata,
      image: top.image || null,
      images: Array.isArray(top.images) ? top.images.slice(0, 4) : [],
      rating: typeof top.rating === 'number' && top.rating > 0 ? top.rating : null,
      reviewCount: typeof top.reviewCount === 'number' && top.reviewCount > 0 ? top.reviewCount : null,
      address: top.address || null,
      description: top.description || null,
      website: top.website || null,
      latitude: typeof top.latitude === 'number' ? top.latitude : null,
      longitude: typeof top.longitude === 'number' ? top.longitude : null,
    }
  } catch {
    return {
      iata,
      name: fallbackName || iata,
      image: null,
      images: [],
      rating: null,
      reviewCount: null,
      address: null,
      description: null,
      website: null,
      latitude: null,
      longitude: null,
    }
  }
}

export interface FlightDetailModalProps {
  flight: SerpFlight
  alreadySaved: boolean
  busy: boolean
  onClose: () => void
  onAdd: (flight: SerpFlight) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
}

function formatTime(iso: string): string {
  const m = iso.match(/(\d{2}:\d{2})$/)
  return m ? m[1] : iso
}
function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/)
  if (!m) return ''
  const d = new Date(`${m[1]}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function FlightDetailModal({ flight, alreadySaved, busy, onClose, onAdd, formatPrice }: FlightDetailModalProps) {
  const first = flight.legs[0]
  const last = flight.legs[flight.legs.length - 1]
  const [mounted, setMounted] = useState(false)

  // Portal target only available client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Esc closes + body scroll lock
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

  // Unique airports across all legs (preserve order)
  const airports = useMemo(() => {
    const seen = new Map<string, { iata: string; name: string }>()
    for (const leg of flight.legs) {
      if (leg.departure.id && !seen.has(leg.departure.id)) {
        seen.set(leg.departure.id, { iata: leg.departure.id, name: leg.departure.airport })
      }
      if (leg.arrival.id && !seen.has(leg.arrival.id)) {
        seen.set(leg.arrival.id, { iata: leg.arrival.id, name: leg.arrival.airport })
      }
    }
    return Array.from(seen.values())
  }, [flight.legs])

  // Fetch enriched airport metadata in parallel (cached by IATA)
  const airportQueries = useQueries({
    queries: airports.map((a) => ({
      queryKey: ['airport-info', a.iata] as const,
      queryFn: () => fetchAirportInfo(a.iata, a.name),
      staleTime: 24 * 60 * 60 * 1000, // 24h — airports don't move
      gcTime: 24 * 60 * 60 * 1000,
    })),
  })

  const co2Kg = flight.carbonEmissions?.this_flight != null
    ? Math.round(flight.carbonEmissions.this_flight / 1000)
    : null
  const co2Diff = flight.carbonEmissions?.difference_percent ?? null

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await onAdd(flight)
  }

  if (!mounted) return null

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      // Stop clicks from bubbling up to whatever parent (e.g., the search
      // result card's onClick that opened the modal) would otherwise
      // re-trigger us right after onClose runs.
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop — click anywhere outside the panel closes the modal */}
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Flight details"
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0e1620] shadow-2xl"
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-6 pt-5 pb-4 bg-white/95 dark:bg-[#0e1620]/95 backdrop-blur border-b border-gray-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3 min-w-0">
            {flight.airlineLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={flight.airlineLogo}
                alt={first?.airline ?? 'airline'}
                className="w-11 h-11 rounded-lg object-contain bg-white border border-gray-100 dark:border-white/[0.06] p-1 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                <Plane size={18} className="text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-[18px] font-serif tracking-tight text-gray-900 dark:text-white truncate">
                {first?.airline ?? 'Flight'} · {first?.departure.id} → {last?.arrival.id}
              </h2>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                {flight.type} · {formatDuration(flight.totalDuration)} · {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
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
          {/* Price + Add CTA */}
          {flight.price != null && (
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[28px] font-semibold text-gray-900 dark:text-white tabular-nums leading-none">
                  {formatPrice(flight.price, 'USD')}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1.5">
                  per traveler
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={busy || alreadySaved}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-lg text-[13px] font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50"
                style={{ backgroundColor: alreadySaved ? 'rgb(107 114 128)' : 'var(--trip-base)' }}
              >
                {alreadySaved ? <><Check size={14} /> Added to trip</> : <><Plus size={14} /> Add to trip</>}
              </button>
            </div>
          )}

          {/* Leg-by-leg breakdown */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
              Itinerary
            </h3>
            <ol className="space-y-4">
              {flight.legs.map((leg, i) => {
                const layover = flight.layovers[i]
                return (
                  <li key={i} className="space-y-3">
                    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {leg.airlineLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={leg.airlineLogo}
                            alt={leg.airline}
                            className="w-7 h-7 rounded object-contain bg-white border border-gray-100 dark:border-white/[0.06] p-0.5 shrink-0"
                          />
                        ) : (
                          <Plane size={14} className="text-gray-400 shrink-0" />
                        )}
                        <div className="text-[13px] font-medium text-gray-900 dark:text-white">
                          {leg.airline} {leg.flightNumber}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 ml-auto inline-flex items-center gap-1">
                          <Clock size={10} /> {formatDuration(leg.duration)}
                        </div>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div>
                          <div className="font-serif text-[24px] text-[var(--trip-base)] tabular-nums leading-none">
                            {formatTime(leg.departure.time)}
                          </div>
                          <div className="font-mono text-[12px] font-semibold text-gray-700 dark:text-gray-300 mt-1">
                            {leg.departure.id}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {leg.departure.airport}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {formatDate(leg.departure.time)}
                          </div>
                        </div>
                        <div className="flex flex-col items-center text-gray-300 dark:text-gray-600">
                          <Plane size={14} className="rotate-90" />
                        </div>
                        <div className="text-right">
                          <div className="font-serif text-[24px] text-[var(--trip-base)] tabular-nums leading-none">
                            {formatTime(leg.arrival.time)}
                          </div>
                          <div className="font-mono text-[12px] font-semibold text-gray-700 dark:text-gray-300 mt-1">
                            {leg.arrival.id}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {leg.arrival.airport}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {formatDate(leg.arrival.time)}
                          </div>
                        </div>
                      </div>

                      {(leg.airplane || leg.travelClass || leg.legroom) && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06] flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                          {leg.airplane && <span>{leg.airplane}</span>}
                          {leg.travelClass && <span>· {leg.travelClass}</span>}
                          {leg.legroom && (
                            <span className="inline-flex items-center gap-1">
                              · <ArmchairIcon size={11} /> {leg.legroom}
                            </span>
                          )}
                          {leg.overnight && (
                            <span className="text-amber-600 dark:text-amber-400">· Overnight</span>
                          )}
                        </div>
                      )}
                    </div>

                    {layover && i < flight.legs.length - 1 && (
                      <div className="ml-4 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400 inline-flex items-center gap-2">
                        <Clock size={11} />
                        Layover at {layover.airport} ({layover.id}) · {formatDuration(layover.duration)}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>

          {/* Airports referenced in this itinerary — enriched cards */}
          {airports.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                Airports
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {airports.map((a, i) => (
                  <AirportCard
                    key={a.iata}
                    fallback={a}
                    info={airportQueries[i]?.data ?? null}
                    loading={airportQueries[i]?.isLoading ?? false}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Carbon footprint */}
          {co2Kg != null && (
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                Carbon footprint
              </h3>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/[0.04] text-[12px] text-gray-700 dark:text-gray-300">
                <Leaf
                  size={14}
                  className={
                    co2Diff != null && co2Diff < -5
                      ? 'text-emerald-600'
                      : co2Diff != null && co2Diff > 5
                        ? 'text-amber-600'
                        : 'text-gray-500'
                  }
                />
                <span className="font-semibold">{co2Kg} kg CO₂</span>
                {co2Diff != null && (
                  <span
                    className={
                      co2Diff < -5
                        ? 'text-emerald-600'
                        : co2Diff > 5
                          ? 'text-amber-600'
                          : 'text-gray-500'
                    }
                  >
                    ({co2Diff > 0 ? '+' : ''}
                    {co2Diff}% vs typical)
                  </span>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

function AirportCard({
  fallback,
  info,
  loading,
}: {
  fallback: { iata: string; name: string }
  info: AirportInfo | null
  loading: boolean
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const name = info?.name || fallback.name || fallback.iata
  const image = info?.image && !imgFailed ? info.image : null

  return (
    <li className="rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden bg-white dark:bg-white/[0.02]">
      {/* Image */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/[0.03] dark:to-white/[0.06]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : loading ? (
          <div className="absolute inset-0 shimmer-skeleton" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600">
            <Building2 size={28} />
          </div>
        )}
        <span className="absolute top-2 left-2 inline-flex items-center px-2 h-6 rounded-md bg-white/95 dark:bg-black/70 backdrop-blur font-mono text-[11px] font-bold text-[var(--trip-base)] tabular-nums">
          {fallback.iata}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-1.5">
        <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">
          {name}
        </h4>
        {info?.address && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 inline-flex items-start gap-1 leading-snug">
            <MapPin size={10} className="mt-0.5 shrink-0" />
            <span className="line-clamp-1" title={info.address}>{info.address}</span>
          </p>
        )}
        <div className="flex items-center gap-3 text-[11px]">
          {info?.rating != null && (
            <span className="inline-flex items-center gap-0.5 text-gray-700 dark:text-gray-300">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              <span className="tabular-nums font-medium">{info.rating.toFixed(1)}</span>
              {info.reviewCount != null && info.reviewCount > 0 && (
                <span className="text-gray-400 ml-0.5">
                  ({info.reviewCount.toLocaleString()})
                </span>
              )}
            </span>
          )}
          {info?.website && (
            <a
              href={info.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[var(--trip-base)] hover:underline ml-auto"
            >
              Website <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>
    </li>
  )
}
