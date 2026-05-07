'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { TransitViewModel, TransitData } from '@travyl/shared'
import { TransitCard } from './TransitCard'
import { TransitForm } from './TransitForm'
import { addTransit, updateTransit, deleteTransit } from './transitMutations'

export interface TransitModuleProps {
  tripId: string
  transit: TransitViewModel[]
  defaultCurrency: string
  formatPrice: (n: number, currency?: string | null) => string
}

export function TransitModule({ tripId, transit, defaultCurrency, formatPrice }: TransitModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const hasExpandedRef = useRef(false)

  const sorted = useMemo(
    () => [...transit].sort((a, b) => (a.departureAt ?? '').localeCompare(b.departureAt ?? '')),
    [transit],
  )

  useEffect(() => {
    if (hasExpandedRef.current) return
    const expandId = searchParams.get('expand')
    if (expandId && transit.some((t) => t.id === expandId)) {
      setEditingId(expandId)
      hasExpandedRef.current = true
    }
  }, [searchParams, transit])

  useEffect(() => {
    const onAdd = () => setAdding(true)
    window.addEventListener('transit:add', onAdd)
    return () => window.removeEventListener('transit:add', onAdd)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transit', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAdd = async (data: TransitData) => {
    try {
      await addTransit(tripId, data)
      invalidate()
      setAdding(false)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save \u2014 try again")
    }
  }

  const handleUpdate = async (id: string, data: TransitData) => {
    try {
      await updateTransit(id, data)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/transit`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save \u2014 try again")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transit segment?')) return
    try {
      await deleteTransit(id)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/transit`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete \u2014 try again")
    }
  }

  return (
    <div className="space-y-3">
      {adding && (
        <TransitForm
          defaultCurrency={defaultCurrency}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
      {sorted.map((t) => {
        if (editingId === t.id) {
          return (
            <TransitForm
              key={t.id}
              initial={{
                vehicleType: t.vehicleType,
                provider: t.provider,
                routeName: t.routeName,
                originLabel: t.originLabel,
                destinationLabel: t.destinationLabel,
                departureAt: t.departureAt ?? undefined,
                arrivalAt: t.arrivalAt ?? undefined,
                price: t.price ?? undefined,
                currency: t.currency,
                bookingRef: t.bookingRef ?? undefined,
                confirmationCode: t.confirmationCode ?? undefined,
                notes: t.notes ?? undefined,
                id: t.id,
              }}
              defaultCurrency={defaultCurrency}
              onSubmit={(data) => handleUpdate(t.id, data)}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(t.id)}
            />
          )
        }
        return (
          <TransitCard
            key={t.id}
            transit={t}
            formatPrice={formatPrice}
            onEdit={() => setEditingId(t.id)}
            onDelete={() => handleDelete(t.id)}
          />
        )
      })}
    </div>
  )
}
