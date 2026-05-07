'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { HotelViewModel, HotelData, Trip } from '@travyl/shared'
import { supabase } from '@travyl/shared'
import { HotelCard } from './HotelCard'
import { HotelForm } from './HotelForm'
import { HotelSearchPanel } from './HotelSearchPanel'
import { HotelResultsList, type HotelSearchState } from './HotelResultsList'
import { mapSerpHotelToHotelData, type SerpHotel } from './hotelSearch'
import { addHotel, updateHotel, deleteHotel } from './hotelMutations'

export interface HotelsModuleProps {
  tripId: string
  hotels: HotelViewModel[]
  rawHotels: { id: string; data: HotelData }[]
  defaultCurrency: string
  formatPrice: (n: number, currency?: string | null) => string
}

export function HotelsModule({ tripId, hotels, rawHotels, defaultCurrency, formatPrice }: HotelsModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searching, setSearching] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchState, setSearchState] = useState<HotelSearchState>({
    loading: false, results: [], error: null, hasSearched: false,
  })
  const [searchInputs, setSearchInputs] = useState({ check_in: '', check_out: '', guests: 2 })
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null)
  const hasExpandedRef = useRef(false)

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

  useEffect(() => {
    if (hasExpandedRef.current) return
    const expandId = searchParams.get('expand')
    if (expandId && hotels.some((h) => h.id === expandId)) { setEditingId(expandId); hasExpandedRef.current = true }
  }, [searchParams, hotels])

  useEffect(() => {
    const onAdd = () => setSearching(true)
    window.addEventListener('hotels:add', onAdd)
    return () => window.removeEventListener('hotels:add', onAdd)
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
    try { await updateHotel(id, data); invalidate(); setEditingId(null); if (searchParams.get('expand')) router.replace(`/trip/${tripId}/hotels`, { scroll: false }) } catch (e) { console.error(e); toast.error("Couldn't save — try again") }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this hotel booking?')) return
    try { await deleteHotel(id); invalidate(); setEditingId(null); if (searchParams.get('expand')) router.replace(`/trip/${tripId}/hotels`, { scroll: false }) } catch (e) { console.error(e); toast.error("Couldn't delete — try again") }
  }

  const tripForPanel = {
    id: tripId,
    destination: trip?.destination ?? '',
    start_date: trip?.start_date ?? '',
    end_date: trip?.end_date ?? '',
  }

  return (
    <div className="space-y-4">
      {searching && (
        <>
          <HotelSearchPanel
            trip={tripForPanel}
            onResultsChange={setSearchState}
            onInputsChange={setSearchInputs}
            onClose={() => {
              setSearching(false)
              setSearchState({ loading: false, results: [], error: null, hasSearched: false })
            }}
          />
          <HotelResultsList
            state={searchState}
            savedOfferIds={savedOfferIds}
            busyOfferId={busyOfferId}
            onAdd={handleAddFromSearch}
            formatPrice={formatPrice}
          />
        </>
      )}

      {hotels.length === 0 && !searching && (
        <div className="flex flex-col items-center text-center py-12">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V7l9-4 9 4v14h-6v-6h-6v6H3z"/></svg>
          </div>
          <p className="text-[15px] font-serif text-gray-700 dark:text-gray-200">No hotels booked yet</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
            Search live inventory to add a stay to your trip.
          </p>
          <button
            onClick={() => setSearching(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium text-white shadow-sm hover:shadow-md transition"
            style={{ backgroundColor: 'var(--trip-base)' }}
          >
            Search hotels
          </button>
        </div>
      )}

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
              onEdit={() => setEditingId(h.id)}
              onDelete={() => handleDelete(h.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
