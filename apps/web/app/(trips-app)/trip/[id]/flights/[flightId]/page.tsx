'use client'

import { use } from 'react'
import { Plane, Clock, Hash, CreditCard } from 'lucide-react'
import { useFlights } from '@travyl/shared'
import { EntityBreadcrumb } from '@/components/entity/EntityBreadcrumb'
import { EntitySection } from '@/components/entity/EntitySection'
import { EntityActionsBar } from '@/components/entity/EntityActionsBar'

function computeDuration(departure: string, arrival: string): string {
  const ms = new Date(arrival).getTime() - new Date(departure).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.round((ms % (1000 * 60 * 60)) / (1000 * 60))
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

export default function FlightDetailPage({
  params,
}: {
  params: Promise<{ id: string; flightId: string }>
}) {
  const { id: tripId, flightId } = use(params)
  const { data: flights, isLoading } = useFlights(tripId)

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="w-full h-[180px] bg-gray-200 dark:bg-gray-700 rounded-xl mb-6" />
        <div className="h-7 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-4" />
        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-4" />
        <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  const flight = flights?.find((f) => f.id === flightId)

  if (!flight) {
    return (
      <div className="max-w-3xl mx-auto py-6">
        <EntityBreadcrumb
          items={[{ label: 'Trip', href: `/trip/${tripId}` }]}
          current="Flight not found"
        />
        <p className="text-gray-500 dark:text-gray-400 px-6 py-4">Flight not found.</p>
      </div>
    )
  }

  const data = flight.data

  const departureDate = data.departure_at ? new Date(data.departure_at) : null
  const arrivalDate = data.arrival_at ? new Date(data.arrival_at) : null

  const duration =
    data.departure_at && data.arrival_at
      ? computeDuration(data.departure_at, data.arrival_at)
      : null

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <EntityBreadcrumb
        items={[{ label: 'Trip', href: `/trip/${tripId}` }, { label: 'Flights', href: `/trip/${tripId}/flights` }]}
        current={`${data.origin_iata} → ${data.dest_iata}`}
      />

      {/* Hero — full-width gradient banner */}
      <div className="w-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-6 mb-0 relative overflow-hidden">
        {/* Airline + flight number row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-white/90">{data.airline}</span>
          {data.flight_number && (
            <span className="text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">
              {data.flight_number}
            </span>
          )}
        </div>

        {/* IATA route row */}
        <div className="flex items-center justify-between">
          {/* Origin */}
          <div className="text-center">
            <p className="text-4xl font-bold text-white tracking-wider">{data.origin_iata}</p>
            {data.origin_name && (
              <p className="text-xs text-white/75 mt-1 max-w-[100px] truncate">{data.origin_name}</p>
            )}
          </div>

          {/* Center plane icon */}
          <div className="flex flex-col items-center gap-1 flex-1 px-4">
            <div className="flex items-center w-full">
              <div className="flex-1 border-t border-dashed border-white/40" />
              <div className="mx-2 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 border-t border-dashed border-white/40" />
            </div>
            {duration && (
              <span className="text-xs text-white/70">{duration}</span>
            )}
          </div>

          {/* Destination */}
          <div className="text-center">
            <p className="text-4xl font-bold text-white tracking-wider">{data.dest_iata}</p>
            {data.dest_name && (
              <p className="text-xs text-white/75 mt-1 max-w-[100px] truncate">{data.dest_name}</p>
            )}
          </div>
        </div>
      </div>

      <EntityActionsBar
        entityId={flightId}
        entityType="activity"
        entityName={`${data.airline} ${data.flight_number ?? ''} ${data.origin_iata}–${data.dest_iata}`}
      />

      {/* Flight Info */}
      <EntitySection title="Flight Info">
        <div className="flex flex-col gap-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium">{data.airline}</span>
            {data.flight_number && (
              <span className="text-gray-500 dark:text-gray-400">· {data.flight_number}</span>
            )}
          </div>
          {data.cabin_class && (
            <div className="pl-6">
              <span className="inline-block text-xs font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-full capitalize">
                {data.cabin_class}
              </span>
            </div>
          )}
        </div>
      </EntitySection>

      {/* Route Details */}
      <EntitySection title="Route Details">
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
          {/* Departure */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Departure
            </p>
            {departureDate && (
              <>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {departureDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </>
            )}
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {data.origin_iata}
              {data.origin_name && (
                <span className="text-gray-500 dark:text-gray-400 font-normal"> · {data.origin_name}</span>
              )}
            </p>
          </div>

          {/* Arrival */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Arrival
            </p>
            {arrivalDate && (
              <>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {arrivalDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </>
            )}
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {data.dest_iata}
              {data.dest_name && (
                <span className="text-gray-500 dark:text-gray-400 font-normal"> · {data.dest_name}</span>
              )}
            </p>
          </div>
        </div>

        {/* Duration row */}
        {duration && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            <span>Duration: <span className="font-medium text-gray-800 dark:text-gray-200">{duration}</span></span>
          </div>
        )}
      </EntitySection>

      {/* Pricing */}
      {data.price !== null && data.price !== undefined && (
        <EntitySection title="Pricing">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium">
              {data.currency ? `${data.currency} ` : ''}
              {data.price.toFixed(2)}
            </span>
          </div>
        </EntitySection>
      )}

      {/* Booking */}
      {data.booking_ref && (
        <EntitySection title="Booking">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Hash className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-medium">Reference:</span>
            <span className="font-mono">{data.booking_ref}</span>
          </div>
        </EntitySection>
      )}
    </div>
  )
}
