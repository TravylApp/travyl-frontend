'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Calendar, Plane, Plus, Compass, Globe, ExternalLink } from 'lucide-react'
import { useTrips, useAuthStore, formatDateRange } from '@travyl/shared'
import type { Trip } from '@travyl/shared'

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false })

interface Props {
  params: Promise<{ name: string }>
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  address?: {
    country?: string
    country_code?: string
    state?: string
    county?: string
  }
  boundingbox?: [string, string, string, string]
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  planning: { label: 'Planning', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  booked: { label: 'Booked', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  active: { label: 'Active', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  completed: { label: 'Completed', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  abandoned: { label: 'Cancelled', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600 dark:text-red-300' },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DestinationSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero skeleton */}
      <div className="relative min-h-[50vh] bg-gray-200 dark:bg-gray-800 animate-pulse" />
      {/* Content skeleton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            {[80, 60, 70, 50].map((w, i) => (
              <div key={i} className={`h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse`} style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-6 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Trip card ────────────────────────────────────────────────────────────────

function DestinationTripCard({ trip }: { trip: Trip }) {
  const badge = STATUS_BADGE[trip.status] ?? STATUS_BADGE.planning
  const dateRange = formatDateRange(trip.start_date, trip.end_date)

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="group block rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 hover:shadow-lg hover:border-[#1e3a5f]/30 dark:hover:border-blue-500/30 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#1e3a5f] dark:group-hover:text-blue-400 transition-colors leading-tight line-clamp-2">
          {trip.title}
        </h3>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-3">
        <MapPin size={13} className="shrink-0" />
        <span className="line-clamp-1">{trip.destination}</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <Calendar size={12} className="shrink-0" />
        <span>{dateRange}</span>
      </div>
    </Link>
  )
}

// ─── Quick fact card ──────────────────────────────────────────────────────────

function QuickFactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
      <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/10 dark:bg-blue-500/10 flex items-center justify-center text-[#1e3a5f] dark:text-blue-400 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DestinationPage({ params }: Props) {
  const { name: rawName } = use(params)
  const destination = decodeURIComponent(rawName)
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  // ── Cover image ────────────────────────────────────────────────────────────
  const { data: imageData, isLoading: imageLoading } = useQuery({
    queryKey: ['destination-image', destination],
    queryFn: async () => {
      const res = await fetch(`/api/destination-image?destination=${encodeURIComponent(destination)}`)
      if (!res.ok) return { url: null }
      return res.json() as Promise<{ url: string | null }>
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })

  // ── Nominatim location data ────────────────────────────────────────────────
  const { data: locationData } = useQuery({
    queryKey: ['nominatim', destination],
    queryFn: async () => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      if (!res.ok) return null
      const results: NominatimResult[] = await res.json()
      return results.length > 0 ? results[0] : null
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  })

  // ── User's trips ───────────────────────────────────────────────────────────
  const { data: trips, isLoading: tripsLoading } = useTrips()

  const matchingTrips: Trip[] = (trips ?? []).filter((trip) =>
    trip.destination.toLowerCase().includes(destination.toLowerCase()) ||
    destination.toLowerCase().includes(trip.destination.toLowerCase())
  )

  // ── Derived data ───────────────────────────────────────────────────────────
  const heroImageUrl = imageData?.url ?? null
  const lat = locationData ? parseFloat(locationData.lat) : null
  const lng = locationData ? parseFloat(locationData.lon) : null
  const country = locationData?.address?.country ?? null
  const state = locationData?.address?.state ?? null
  const displayName = locationData?.display_name?.split(',').slice(0, 2).join(',').trim() ?? destination

  // Build quick facts from Nominatim
  const quickFacts: { icon: React.ReactNode; label: string; value: string }[] = []
  if (country) quickFacts.push({ icon: <Globe size={16} />, label: 'Country', value: country })
  if (state) quickFacts.push({ icon: <MapPin size={16} />, label: 'Region', value: state })
  if (lat !== null && lng !== null) {
    quickFacts.push({
      icon: <Compass size={16} />,
      label: 'Coordinates',
      value: `${lat.toFixed(2)}° N, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`,
    })
  }

  const handlePlanTrip = () => {
    router.push(`/?destination=${encodeURIComponent(destination)}`)
  }

  const isPageLoading = imageLoading

  if (isPageLoading) return <DestinationSkeleton />

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[50vh] flex items-end overflow-hidden bg-gray-900">
        {/* Background image or gradient fallback */}
        {heroImageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center bg-fixed"
            style={{ backgroundImage: `url(${heroImageUrl})` }}
            aria-hidden="true"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 50%, #1a2d45 100%)' }}
            aria-hidden="true"
          />
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" aria-hidden="true" />

        {/* Hero content */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-10 pt-24">
          <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/90">Destination</span>
            <span>/</span>
            <span className="text-white">{destination}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-normal text-white leading-tight tracking-wide drop-shadow-lg">
            {destination}
          </h1>
          {displayName && displayName !== destination && (
            <p className="mt-2 text-white/70 text-base font-medium">{displayName}</p>
          )}
        </div>
      </section>

      {/* ─── Main content ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-14">

        {/* ── Quick facts + map grid ───────────────────────────────────────── */}
        {(lat !== null && lng !== null || quickFacts.length > 0) && (
          <section>
            <h2 className="text-xl font-serif font-normal text-gray-900 dark:text-white mb-6 tracking-wide flex items-center gap-2">
              <MapPin size={18} className="text-[#1e3a5f] dark:text-blue-400" />
              About this Destination
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Map */}
              {lat !== null && lng !== null && (
                <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                  <LeafletMap
                    lat={lat}
                    lng={lng}
                    label={destination}
                    zoom={10}
                    height={280}
                  />
                </div>
              )}

              {/* Quick facts */}
              {quickFacts.length > 0 && (
                <div className="grid grid-cols-1 gap-3">
                  {quickFacts.map((fact, i) => (
                    <QuickFactCard key={i} icon={fact.icon} label={fact.label} value={fact.value} />
                  ))}
                  {locationData && (
                    <a
                      href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(destination)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#1e3a5f] dark:text-blue-400 hover:underline mt-1 font-medium"
                    >
                      <ExternalLink size={12} />
                      View on OpenStreetMap
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Your trips here ──────────────────────────────────────────────── */}
        {user && (
          <section>
            <h2 className="text-xl font-serif font-normal text-gray-900 dark:text-white mb-6 tracking-wide flex items-center gap-2">
              <Plane size={18} className="text-[#1e3a5f] dark:text-blue-400" />
              Your Trips to {destination}
            </h2>

            {tripsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : matchingTrips.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matchingTrips.map((trip) => (
                  <DestinationTripCard key={trip.id} trip={trip} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                  <Plane size={20} className="text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">No trips to {destination} yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Be the first to plan one!</p>
              </div>
            )}
          </section>
        )}

        {/* ── Plan a trip CTA ──────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-gradient-to-br from-[#1e3a5f] to-[#2d6a9f] p-10 text-center relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" aria-hidden="true" />

          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-5">
              <Plane size={24} className="text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-normal text-white mb-3 tracking-wide">
              Plan a Trip to {destination}
            </h2>
            <p className="text-white/70 text-sm mb-8 max-w-md mx-auto leading-relaxed">
              Build your perfect itinerary with day-by-day planning, activity scheduling, and real-time collaboration.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {user ? (
                <button
                  onClick={handlePlanTrip}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-[#1e3a5f] font-semibold text-sm hover:bg-gray-50 transition-colors shadow-lg shadow-black/20"
                >
                  <Plus size={16} />
                  Plan a Trip
                </button>
              ) : (
                <>
                  <Link
                    href={`/signup?destination=${encodeURIComponent(destination)}`}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-[#1e3a5f] font-semibold text-sm hover:bg-gray-50 transition-colors shadow-lg shadow-black/20"
                  >
                    <Plus size={16} />
                    Sign up to Plan
                  </Link>
                  <Link
                    href={`/login?destination=${encodeURIComponent(destination)}`}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 text-white border border-white/30 font-semibold text-sm hover:bg-white/20 transition-colors"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
