'use client'

import { use } from 'react'
import { Plus } from 'lucide-react'
import { useItineraryScreen, useFlights } from '@travyl/shared'
import { Module } from '@/components/trip/Module'
import { FlightsModule } from '@/components/trip/flights/FlightsModule'

function formatTotalDuration(flights: { departureAt: string | null; arrivalAt: string | null }[]): string {
  const totalMs = flights.reduce((sum, f) => {
    if (!f.departureAt || !f.arrivalAt) return sum
    return sum + Math.max(0, new Date(f.arrivalAt).getTime() - new Date(f.departureAt).getTime())
  }, 0)
  if (totalMs === 0) return ''
  const h = Math.floor(totalMs / 3600000)
  const m = Math.round((totalMs % 3600000) / 60000)
  return `${h}h ${m}m`
}

export default function Flights({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { flights, isLoading, trip } = useItineraryScreen(id)
  const rawFlightsQuery = useFlights(id)
  const rawFlights = rawFlightsQuery.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripDestination = (trip as any)?.destination as string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripStartDate = (trip as any)?.start_date as string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripEndDate = (trip as any)?.end_date as string | undefined

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <Module title="Flights" description="Loading…">
          <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
        </Module>
      </div>
    )
  }

  const totalDuration = formatTotalDuration(flights)
  const description = flights.length === 0 ? 'No flights booked yet' : `${flights.length} ${flights.length === 1 ? 'flight' : 'flights'}${totalDuration ? ` · ${totalDuration} total` : ''}`

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <Module title="Flights" description={description}
        action={
          <button onClick={() => window.dispatchEvent(new CustomEvent('flights:add'))}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: 'var(--trip-base)' }}>
            <Plus size={13} /> Flight
          </button>
        }>
        <FlightsModule tripId={id} flights={flights} rawFlights={rawFlights} defaultCurrency={tripCurrency}
          tripDestination={tripDestination} tripStartDate={tripStartDate} tripEndDate={tripEndDate} />
      </Module>
    </div>
  )
}
