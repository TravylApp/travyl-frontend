'use client'

import { use } from 'react'
import { Plus } from 'lucide-react'
import { useItineraryScreen } from '@travyl/shared'
import { TransitsModule } from '@/components/trip/transit/TransitsModule'

export default function TransitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading, trip, days, hotels } = useItineraryScreen(id);
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD';
  const tripStartDate = (trip as any)?.start_date ?? '';

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        <div className="h-8 w-24 bg-gray-100 dark:bg-white/[0.04] rounded animate-pulse mb-6" />
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight">Transit</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">Trains, buses, subways & more</p>
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('transit:add'))}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'var(--trip-base)' }}
        >
          <Plus size={13} /> Transit
        </button>
      </div>
      <TransitsModule tripId={id} defaultCurrency={tripCurrency} days={days} hotels={hotels} tripStartDate={tripStartDate} />
    </div>
  );
}
