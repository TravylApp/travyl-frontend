'use client'

import { use } from 'react'
import { Plus } from 'lucide-react'
import { useItineraryScreen, useHotels, useHomeCurrency } from '@travyl/shared'
import { HotelsModule } from '@/components/trip/hotels/HotelsModule'

export default function Hotels({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { hotels, isLoading, trip } = useItineraryScreen(id)
  const rawHotelsQuery = useHotels(id)
  const rawHotels = rawHotelsQuery.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripDestination = (trip as any)?.destination as string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripStartDate = (trip as any)?.start_date as string | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripEndDate = (trip as any)?.end_date as string | undefined
  const { format: formatHome } = useHomeCurrency()
  const formatPrice = (n: number, currency?: string | null) => formatHome(n, currency ?? tripCurrency)

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
      </div>
    )
  }

  const totalNights = hotels.reduce((sum, h) => sum + h.nights, 0)
  const description =
    hotels.length === 0
      ? 'Search live inventory and add a stay to your trip'
      : `${hotels.length} ${hotels.length === 1 ? 'booking' : 'bookings'} · ${totalNights} ${totalNights === 1 ? 'night' : 'nights'} total`

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      {/* Page header — bare, no card wrapper */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight">
            Hotels
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('hotels:add-manual'))}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'var(--trip-base)' }}
        >
          <Plus size={13} /> Add manually
        </button>
      </div>

      <HotelsModule
        tripId={id}
        hotels={hotels}
        rawHotels={rawHotels}
        defaultCurrency={tripCurrency}
        formatPrice={formatPrice}
        tripDestination={tripDestination}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
      />
    </div>
  )
}
