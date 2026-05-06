'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { HotelViewModel, HotelData } from '@travyl/shared'
import { HotelCard } from './HotelCard'
import { HotelForm } from './HotelForm'
import { addHotel, updateHotel, deleteHotel } from './hotelMutations'

export interface HotelsModuleProps {
  tripId: string
  hotels: HotelViewModel[]
  rawHotels: { id: string; data: HotelData }[]
  defaultCurrency: string
}

export function HotelsModule({ tripId, hotels, rawHotels, defaultCurrency }: HotelsModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Sort hotels by check-in date (ISO date strings sort lexicographically === chronologically)
  // Defensive `?? ''` in case checkIn ever becomes nullable.
  const sorted = useMemo(
    () => [...hotels].sort((a, b) => (a.checkIn ?? '').localeCompare(b.checkIn ?? '')),
    [hotels],
  )

  // Auto-expand a record if URL ?expand=<id> is present (deep link from itinerary cards)
  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId && hotels.some((h) => h.id === expandId)) {
      setEditingId(expandId)
    }
  }, [searchParams, hotels])

  // Listen for the page-header "+ Hotel" CustomEvent to open the add form.
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
    try {
      await addHotel(tripId, data)
      invalidate()
      setAdding(false)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleUpdate = async (id: string, data: HotelData) => {
    try {
      await updateHotel(id, data)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/hotels`, { scroll: false })
      }
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
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete — try again")
    }
  }

  if (hotels.length === 0 && !adding) {
    return (
      <div className="flex flex-col items-center text-center py-12">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Building2 size={20} />
        </div>
        <p className="text-[15px] font-serif text-gray-700 dark:text-gray-200">No hotels booked yet</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
          Add your check-in and check-out to track your stay.
        </p>
        <button
          onClick={() => setAdding(true)}
          className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition"
        >
          <Plus size={13} /> Add hotel
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {adding && (
        <HotelForm
          defaultCurrency={defaultCurrency}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

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
  )
}
