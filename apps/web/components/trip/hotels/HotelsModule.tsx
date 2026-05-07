'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { HotelViewModel, HotelData } from '@travyl/shared'
import { HotelCard } from './HotelCard'
import { HotelForm } from './HotelForm'
import { HotelSearchPanel } from './HotelSearchPanel'
import { addHotel, updateHotel, deleteHotel } from './hotelMutations'

export function HotelsModule({ tripId, hotels, rawHotels, defaultCurrency, tripDestination, tripCheckIn, tripCheckOut }: {
  tripId: string; hotels: HotelViewModel[]; rawHotels: { id: string; data: HotelData }[]; defaultCurrency: string
  tripDestination?: string; tripCheckIn?: string; tripCheckOut?: string
}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const hasExpandedRef = useRef(false)

  const sorted = useMemo(() => [...hotels].sort((a, b) => (a.checkIn ?? '').localeCompare(b.checkIn ?? '')), [hotels])

  useEffect(() => {
    if (hasExpandedRef.current) return
    const expandId = searchParams.get('expand')
    if (expandId && hotels.some((h) => h.id === expandId)) { setEditingId(expandId); hasExpandedRef.current = true }
  }, [searchParams, hotels])

  useEffect(() => {
    const onAdd = () => setAdding(true)
    window.addEventListener('hotels:add', onAdd)
    return () => window.removeEventListener('hotels:add', onAdd)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['hotels', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAdd = async (data: HotelData) => {
    try { await addHotel(tripId, data); invalidate(); setAdding(false) } catch (e) { console.error(e); toast.error("Couldn't save — try again") }
  }
  const handleUpdate = async (id: string, data: HotelData) => {
    try { await updateHotel(id, data); invalidate(); setEditingId(null); if (searchParams.get('expand')) router.replace(`/trip/${tripId}/hotels`, { scroll: false }) } catch (e) { console.error(e); toast.error("Couldn't save — try again") }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this hotel booking?')) return
    try { await deleteHotel(id); invalidate(); setEditingId(null); if (searchParams.get('expand')) router.replace(`/trip/${tripId}/hotels`, { scroll: false }) } catch (e) { console.error(e); toast.error("Couldn't delete — try again") }
  }

  // When no saved hotels, show the search panel. It will auto-fire if trip
  // destination + dates are pre-filled, or let the user type them in.
  if (hotels.length === 0 && !adding) {
    return (
      <HotelSearchPanel
        tripDestination={tripDestination}
        tripCheckIn={tripCheckIn}
        tripCheckOut={tripCheckOut}
        defaultCurrency={defaultCurrency}
        onAdd={handleAdd}
        onAddManually={() => setAdding(true)}
      />
    )
  }

  return (
    <div className="space-y-3">
      {adding && <HotelForm defaultCurrency={defaultCurrency} onSubmit={handleAdd} onCancel={() => setAdding(false)} />}
      {sorted.map((h) => {
        const raw = rawHotels.find((r) => r.id === h.id)
        if (editingId === h.id && raw) return <HotelForm key={h.id} initial={{ ...raw.data, id: h.id }} defaultCurrency={defaultCurrency} onSubmit={(data) => handleUpdate(h.id, data)} onCancel={() => setEditingId(null)} onDelete={() => handleDelete(h.id)} />
        return <HotelCard key={h.id} hotel={h} onEdit={() => setEditingId(h.id)} onDelete={() => handleDelete(h.id)} />
      })}
    </div>
  )
}
