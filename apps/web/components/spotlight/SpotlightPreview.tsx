'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Building2, Plane, MapPin, Calendar, Star, DollarSign, Users, ArrowRight, Image as ImageIcon } from 'lucide-react'
import type { SpotlightResult } from '@travyl/shared'

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false })

interface Props {
  result: SpotlightResult
}

const PREVIEW_TYPES = new Set(['trip', 'hotel', 'flight', 'restaurant', 'activity', 'destination'])

export function hasPreview(result: SpotlightResult | null | undefined): boolean {
  return !!result && PREVIEW_TYPES.has(result.type)
}

export function SpotlightPreview({ result }: Props) {
  switch (result.type) {
    case 'trip':
      return <TripPreview result={result} />
    case 'hotel':
      return <HotelPreview result={result} />
    case 'flight':
      return <FlightPreview result={result} />
    case 'restaurant':
      return <RestaurantPreview result={result} />
    case 'activity':
      return <ActivityPreview result={result} />
    case 'destination':
      return <DestinationPreview result={result} />
    default:
      return null
  }
}

function TripPreview({ result }: { result: SpotlightResult }) {
  const [imgError, setImgError] = useState(false)
  const meta = result.metadata as Record<string, unknown> | undefined
  const startDate = meta?.startDate as string | undefined
  const endDate = meta?.endDate as string | undefined
  const status = meta?.status as string | undefined
  const activityCount = meta?.activityCount as number | undefined

  return (
    <div className="flex flex-col h-full">
      {result.imageUrl && !imgError ? (
        <div className="w-full h-32 overflow-hidden rounded-lg mb-3">
          <img src={result.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        </div>
      ) : (
        <div className="w-full h-32 rounded-lg mb-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-blue-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
        {result.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
        {result.subtitle}
      </p>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {status && (
          <StatusBadge status={status} />
        )}
        {startDate && endDate && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            {formatDateRange(startDate, endDate)}
          </span>
        )}
      </div>
      {typeof activityCount === 'number' && (
        <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-2">
          <Users className="w-3 h-3" />
          {activityCount} activit{activityCount === 1 ? 'y' : 'ies'}
        </span>
      )}
      <div className="mt-auto pt-4">
        <a
          href={result.href}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Open Trip
          <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

function HotelPreview({ result }: { result: SpotlightResult }) {
  const [imgError, setImgError] = useState(false)
  const meta = result.metadata as Record<string, unknown> | undefined
  const stars = meta?.stars as number | undefined
  const pricePerNight = meta?.pricePerNight as string | undefined
  const address = meta?.address as string | undefined
  const checkIn = meta?.checkIn as string | undefined
  const checkOut = meta?.checkOut as string | undefined
  const rating = meta?.rating as number | undefined
  const lat = meta?.latitude as number | undefined
  const lng = meta?.longitude as number | undefined

  return (
    <div className="flex flex-col h-full">
      {result.imageUrl && !imgError ? (
        <div className="w-full h-32 overflow-hidden rounded-lg mb-3">
          <img src={result.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        </div>
      ) : (
        <div className="w-full h-32 rounded-lg mb-3 bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-950 dark:to-blue-950 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-sky-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
        {result.title}
      </h3>
      {stars && (
        <div className="flex items-center gap-0.5 mt-1">
          {Array.from({ length: stars }).map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
      )}
      {(address || result.subtitle) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
          {address || result.subtitle}
        </p>
      )}
      <div className="flex flex-col gap-1.5 mt-3">
        {checkIn && checkOut && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            {checkIn} &mdash; {checkOut}
          </span>
        )}
        {pricePerNight && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
            <DollarSign className="w-3 h-3" />
            {pricePerNight}/night
          </span>
        )}
        {typeof rating === 'number' && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <Star className="w-3 h-3 fill-current" />
            {rating.toFixed(1)}
          </span>
        )}
      </div>
      {lat && lng && (
        <div className="mt-3 h-[120px] rounded-lg overflow-hidden border border-white/10">
          <LeafletMap lat={lat} lng={lng} label={result.title} height={120} zoom={15} />
        </div>
      )}
    </div>
  )
}

function FlightPreview({ result }: { result: SpotlightResult }) {
  const meta = result.metadata as Record<string, unknown> | undefined
  const airline = meta?.airline as string | undefined
  const flightNumber = meta?.flightNumber as string | undefined
  const origin = meta?.origin as string | undefined
  const destination = meta?.destination as string | undefined
  const departure = meta?.departure as string | undefined
  const arrival = meta?.arrival as string | undefined
  const cabin = meta?.cabin as string | undefined
  const price = meta?.price as string | undefined

  return (
    <div className="flex flex-col h-full">
      <div className="w-full rounded-lg mb-3 bg-gradient-to-br from-cyan-100 to-sky-100 dark:from-cyan-950 dark:to-sky-950 p-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {origin || '---'}
            </div>
            {departure && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{departure}</div>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center px-3">
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
            <Plane className="w-4 h-4 mx-2 text-sky-500 -rotate-12" />
            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {destination || '---'}
            </div>
            {arrival && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{arrival}</div>
            )}
          </div>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
        {result.title}
      </h3>
      {airline && flightNumber && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {airline} &middot; {flightNumber}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {cabin && (
          <span className="inline-flex px-2 py-0.5 text-[10px] font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full">
            {cabin}
          </span>
        )}
        {price && (
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {price}
          </span>
        )}
      </div>
    </div>
  )
}

function RestaurantPreview({ result }: { result: SpotlightResult }) {
  const [imgError, setImgError] = useState(false)
  const meta = result.metadata as Record<string, unknown> | undefined
  const cuisine = meta?.cuisine as string | undefined
  const priceLevel = meta?.priceLevel as string | undefined
  const rating = meta?.rating as number | undefined
  const lat = meta?.latitude as number | undefined
  const lng = meta?.longitude as number | undefined

  return (
    <div className="flex flex-col h-full">
      {result.imageUrl && !imgError ? (
        <div className="w-full h-32 overflow-hidden rounded-lg mb-3">
          <img src={result.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        </div>
      ) : (
        <div className="w-full h-32 rounded-lg mb-3 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-950 dark:to-violet-950 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-purple-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
        {result.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
        {result.subtitle}
      </p>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {cuisine && (
          <span className="inline-flex px-2 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full">
            {cuisine}
          </span>
        )}
        {priceLevel && (
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {priceLevel}
          </span>
        )}
        {typeof rating === 'number' && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <Star className="w-3 h-3 fill-current" />
            {rating.toFixed(1)}
          </span>
        )}
      </div>
      {lat && lng && (
        <div className="mt-3 h-[120px] rounded-lg overflow-hidden border border-white/10">
          <LeafletMap lat={lat} lng={lng} label={result.title} height={120} zoom={15} />
        </div>
      )}
    </div>
  )
}

function ActivityPreview({ result }: { result: SpotlightResult }) {
  const [imgError, setImgError] = useState(false)
  const meta = result.metadata as Record<string, unknown> | undefined
  const category = meta?.category as string | undefined
  const rating = meta?.rating as number | undefined
  const lat = meta?.latitude as number | undefined
  const lng = meta?.longitude as number | undefined

  return (
    <div className="flex flex-col h-full">
      {result.imageUrl && !imgError ? (
        <div className="w-full h-32 overflow-hidden rounded-lg mb-3">
          <img src={result.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        </div>
      ) : (
        <div className="w-full h-32 rounded-lg mb-3 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 flex items-center justify-center">
          <Calendar className="w-8 h-8 text-emerald-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
        {result.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
        {result.subtitle}
      </p>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {category && (
          <span className="inline-flex px-2 py-0.5 text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
            {category}
          </span>
        )}
        {typeof rating === 'number' && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <Star className="w-3 h-3 fill-current" />
            {rating.toFixed(1)}
          </span>
        )}
      </div>
      {lat && lng && (
        <div className="mt-3 h-[120px] rounded-lg overflow-hidden border border-white/10">
          <LeafletMap lat={lat} lng={lng} label={result.title} height={120} zoom={15} />
        </div>
      )}
    </div>
  )
}

function DestinationPreview({ result }: { result: SpotlightResult }) {
  const [imgError, setImgError] = useState(false)
  const meta = result.metadata as Record<string, unknown> | undefined
  const lat = meta?.latitude as number | undefined
  const lng = meta?.longitude as number | undefined

  return (
    <div className="flex flex-col h-full">
      {result.imageUrl && !imgError ? (
        <div className="w-full h-32 overflow-hidden rounded-lg mb-3">
          <img src={result.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        </div>
      ) : (
        <div className="w-full h-32 rounded-lg mb-3 bg-gradient-to-br from-rose-100 to-orange-100 dark:from-rose-950 dark:to-orange-950 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-rose-400" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
        {result.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
        {result.subtitle}
      </p>
      {lat && lng && (
        <div className="mt-3 h-[120px] rounded-lg overflow-hidden border border-white/10">
          <LeafletMap lat={lat} lng={lng} label={result.title} height={120} zoom={10} />
        </div>
      )}
      <div className="mt-auto pt-4">
        <a
          href={result.href}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
        >
          Explore Destination
          <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    planning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    booked: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    active: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    completed: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full capitalize ${styles[status] ?? styles.planning}`}>
      {status}
    </span>
  )
}

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start)
    const e = new Date(end)
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
    return `${fmt.format(s)} - ${fmt.format(e)}`
  } catch {
    return `${start} - ${end}`
  }
}
