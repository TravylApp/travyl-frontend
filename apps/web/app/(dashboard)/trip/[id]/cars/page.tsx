'use client'

import { use } from 'react'
import { Plus } from 'lucide-react'
import { useItineraryScreen, useHomeCurrency } from '@travyl/shared'
import { Module } from '@/components/trip/Module'
import { CarsModule } from '@/components/trip/cars/CarsModule'
import type { CarRental } from '@/components/trip/cars/types'

function totalDays(cars: CarRental[]): number {
  return cars.reduce((sum, c) => {
    const ms = new Date(c.data.dropoff_at).getTime() - new Date(c.data.pickup_at).getTime()
    if (!isFinite(ms) || ms <= 0) return sum
    return sum + Math.max(1, Math.ceil(ms / 86400000))
  }, 0)
}

export default function CarsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { trip, isLoading } = useItineraryScreen(id)
  const { format: formatHome } = useHomeCurrency()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cars = (((trip?.trip_context as any)?.cars as CarRental[] | undefined) ?? [])

  const formatPrice = (n: number, currency?: string | null) => formatHome(n, currency ?? tripCurrency)

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <Module title="Car rentals" description="Loading…">
          <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
        </Module>
      </div>
    )
  }

  const days = totalDays(cars)
  const description = cars.length === 0
    ? 'No car rentals yet'
    : `${cars.length} ${cars.length === 1 ? 'rental' : 'rentals'}${days > 0 ? ` · ${days} ${days === 1 ? 'day' : 'days'} total` : ''}`

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <Module
        title="Car rentals"
        description={description}
        action={
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('cars:add'))}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: 'var(--trip-base)' }}
          >
            <Plus size={13} /> Rental
          </button>
        }
      >
        <CarsModule
          tripId={id}
          cars={cars}
          defaultCurrency={tripCurrency}
          formatPrice={formatPrice}
        />
      </Module>
    </div>
  )
}
