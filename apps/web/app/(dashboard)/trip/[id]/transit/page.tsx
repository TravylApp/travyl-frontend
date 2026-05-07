'use client'

import { use } from 'react'
import { Plus } from 'lucide-react'
import { useItineraryScreen } from '@travyl/shared'
import { TransitsModule } from '@/components/trip/transit/TransitsModule'

export default function TransitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { trip } = useItineraryScreen(id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD'

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight">
            Transit
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">Add transit legs to your trip</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('transit:add'))}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'var(--trip-base)' }}
        >
          <Plus size={13} /> Transit
        </button>
      </div>

      <TransitsModule tripId={id} defaultCurrency={tripCurrency} />
    </div>
  )
}
