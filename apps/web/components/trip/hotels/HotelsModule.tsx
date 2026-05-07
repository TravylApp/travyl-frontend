'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { HotelViewModel, HotelData, Trip } from '@travyl/shared'
import { supabase } from '@travyl/shared'
import { HotelCard } from './HotelCard'
import { HotelForm } from './HotelForm'
import { HotelDetailModal } from './HotelDetailModal'
import { HotelSearchPanel } from './HotelSearchPanel'
import { mapSerpHotelToHotelData, type SerpHotel } from './hotelSearch'
import { addHotel, updateHotel, deleteHotel } from './hotelMutations'

export interface HotelsModuleProps {
  tripId: string
  hotels: HotelViewModel[]
  rawHotels: { id: string; data: HotelData }[]
  defaultCurrency: string
  formatPrice: (n: number, currency?: string | null) => string
  tripDestination?: string
  tripStartDate?: string
  tripEndDate?: string
}

export function HotelsModule({
  tripId,
  hotels,
  rawHotels,
  defaultCurrency,
  formatPrice,
  tripDestination,
  tripStartDate,
  tripEndDate,
}: HotelsModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [addingManually, setAddingManually] = useState(false)
  const [searchInputs, setSearchInputs] = useState({ check_in: '', check_out: '', guests: 2 })
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null)

  const { data: trip } = useQuery<Trip | null>({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const { data } = await supabase.from('trips').select('*').eq('id', tripId).single()
      return data as Trip | null
    },
    enabled: !!tripId,
    staleTime: 60_000,
  })

  const sorted = useMemo(
    () => [...hotels].sort((a, b) => (a.checkIn ?? '').localeCompare(b.checkIn ?? '')),
    [hotels],
  )

  const savedOfferIds = useMemo(
    () => new Set(rawHotels.map((r) => r.data.offer_id).filter(Boolean) as string[]),
    [rawHotels],
  )

  // Open the manual form on `?expand=` deep-link (e.g., from itinerary)
  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId && hotels.some((h) => h.id === expandId)) setEditingId(expandId)
  }, [searchParams, hotels])

  // Page header "Add manually" button dispatches this
  useEffect(() => {
    const onAdd = () => setAddingManually(true)
    window.addEventListener('hotels:add-manual', onAdd)
    return () => window.removeEventListener('hotels:add-manual', onAdd)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['hotels', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAddFromSearch = async (serpHotel: SerpHotel) => {
    setBusyOfferId(serpHotel.id)
    try {
      const data = mapSerpHotelToHotelData(serpHotel, searchInputs)
      await addHotel(tripId, data)
      invalidate()
      toast.success(`Added ${serpHotel.name}`)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't add — try again")
    } finally {
      setBusyOfferId(null)
    }
  }
  const handleUpdate = async (id: string, data: HotelData) => {
    try {
      await updateHotel(id, data)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) router.replace(`/trip/${tripId}/hotels`, { scroll: false })
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this hotel booking?')) return
    try {
      await deleteHotel(id)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) router.replace(`/trip/${tripId}/hotels`, { scroll: false })
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete — try again")
    }
  }
  const handleAddManual = async (data: HotelData) => {
    try {
      await addHotel(tripId, data)
      invalidate()
      setAddingManually(false)
      toast.success('Hotel added')
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const tripForPanel = {
    id: tripId,
    destination: trip?.destination ?? tripDestination ?? '',
    start_date: trip?.start_date ?? tripStartDate ?? '',
    end_date: trip?.end_date ?? tripEndDate ?? '',
  }

  return (
    <div className="space-y-6">
      {/* Manual-entry form (opt-in) */}
      {addingManually && (
        <HotelForm
          defaultCurrency={defaultCurrency}
          onSubmit={handleAddManual}
          onCancel={() => setAddingManually(false)}
        />
      )}

      {/* Saved bookings — show as a strip above search when present */}
      {hotels.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-serif text-gray-700 dark:text-gray-200">Your bookings</h2>
          <div className="space-y-3">
            {sorted.map((h) => {
              const raw = rawHotels.find((r) => r.id === h.id)
              if (editingId === h.id && raw) {
                return (
                  <HotelForm
                    key={h.id}
                    initial={{ ...raw.data, id: h.id }}
                    defaultCurrency={defaultCurrency}
                    onSubmit={(data) => handleUpdate(h.id, data)}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => handleDelete(h.id)}
                  />
                )
              }
              return (
                <HotelCard
                  key={h.id}
                  hotel={h}
                  onEdit={() => setViewingId(h.id)}
                  onDelete={() => handleDelete(h.id)}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Detail modal — opens on HotelCard click. "Edit details" inside the
          modal swaps in the inline HotelForm. */}
      {viewingId && (() => {
        const vm = hotels.find((h) => h.id === viewingId)
        const raw = rawHotels.find((r) => r.id === viewingId)
        if (!vm || !raw) return null
        return (
          <HotelDetailModal
            hotel={vm}
            data={raw.data}
            formatPrice={formatPrice}
            onClose={() => setViewingId(null)}
            onEdit={() => {
              setEditingId(viewingId)
              setViewingId(null)
            }}
            onDelete={async () => {
              setViewingId(null)
              await handleDelete(viewingId)
            }}
          />
        )
      })()}

      {/* Always-on search */}
      <section className="space-y-3">
        {hotels.length > 0 && (
          <h2 className="text-[15px] font-serif text-gray-700 dark:text-gray-200">Find more</h2>
        )}
        <HotelSearchPanel
          trip={tripForPanel}
          savedOfferIds={savedOfferIds}
          busyOfferId={busyOfferId}
          onAdd={handleAddFromSearch}
          formatPrice={formatPrice}
          onSearchInputs={setSearchInputs}
          onAddManually={() => setAddingManually(true)}
        />
      </section>
    </div>
  )
}
