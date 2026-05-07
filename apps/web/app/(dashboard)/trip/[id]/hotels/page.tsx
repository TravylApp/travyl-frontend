'use client'

import { use } from 'react'
import { Plus } from 'lucide-react'
import { useItineraryScreen, useHotels, useHomeCurrency } from '@travyl/shared'
import { Module } from '@/components/trip/Module'
import { HotelsModule } from '@/components/trip/hotels/HotelsModule'

export default function Hotels({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { hotels, trip } = useItineraryScreen(id)
  const rawHotelsQuery = useHotels(id)
  const rawHotels = rawHotelsQuery.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD'
  const { format: formatHome } = useHomeCurrency()
  const formatPrice = (n: number, currency?: string | null) => formatHome(n, currency ?? tripCurrency)

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <Module title="Hotels" description="Loading…">
          <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
        </Module>
      </div>
    )
  }

  const totalNights = hotels.reduce((sum, h) => sum + h.nights, 0)
  const description = hotels.length === 0 ? 'No hotels booked yet' : `${hotels.length} ${hotels.length === 1 ? 'booking' : 'bookings'} · ${totalNights} ${totalNights === 1 ? 'night' : 'nights'} total`

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <Module title="Hotels" description={description}
        action={
          <button onClick={() => window.dispatchEvent(new CustomEvent('hotels:add'))}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: 'var(--trip-base)' }}>
            <Plus size={13} /> Hotel
          </button>
        }
      >
        <HotelsModule
          tripId={id}
          hotels={hotels}
          rawHotels={rawHotels}
          defaultCurrency={tripCurrency}
          formatPrice={formatPrice}
        />
      </Module>
    </div>
  )
}
