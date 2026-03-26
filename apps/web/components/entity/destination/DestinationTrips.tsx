'use client'

import Link from 'next/link'
import { Plus, MapPin, Calendar, Airplane } from 'iconoir-react'
import { useTrips, useAuthStore, formatDateRange } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import { EntitySection } from '@/components/entity/EntitySection'

interface Props {
  destinationName: string
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  planning: { label: 'Planning', className: 'bg-blue-100 text-blue-700' },
  booked: { label: 'Booked', className: 'bg-amber-100 text-amber-700' },
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600' },
  abandoned: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
}

function TripCard({ trip }: { trip: Trip }) {
  const badge = STATUS_BADGE[trip.status] ?? STATUS_BADGE.planning
  const dateRange = formatDateRange(trip.start_date, trip.end_date)

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="group block rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-gray-900 group-hover:text-[#1e3a5f] transition-colors leading-tight line-clamp-2 text-sm">
          {trip.title}
        </h3>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="line-clamp-1">{trip.destination}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Calendar className="w-3 h-3 shrink-0" />
        <span>{dateRange}</span>
      </div>
    </Link>
  )
}

export function DestinationTrips({ destinationName }: Props) {
  const user = useAuthStore((s) => s.user)
  const { data: trips, isLoading } = useTrips()

  if (!user) return null

  const matchingTrips: Trip[] = (trips ?? []).filter((trip) =>
    trip.destination.toLowerCase().includes(destinationName.toLowerCase()) ||
    destinationName.toLowerCase().includes(trip.destination.toLowerCase())
  )

  return (
    <EntitySection title="Your Trips Here">
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : matchingTrips.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {matchingTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
          <Link
            href={`/?destination=${encodeURIComponent(destinationName)}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#003594] hover:text-[#002B7A] transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Plan a new trip to {destinationName}
          </Link>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Airplane className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-1">No trips to {destinationName} yet</p>
          <Link
            href={`/?destination=${encodeURIComponent(destinationName)}`}
            className="inline-flex items-center gap-1.5 text-sm text-[#003594] hover:text-[#002B7A] transition-colors font-medium mt-2"
          >
            <Plus className="w-4 h-4" />
            Plan a trip to {destinationName}
          </Link>
        </div>
      )}
    </EntitySection>
  )
}
