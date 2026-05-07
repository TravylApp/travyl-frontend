'use client'

import { useState } from 'react'
import type { FlightData } from '@travyl/shared'
import { FieldLabel, Input, Select, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'MXN', label: 'MXN ($)' },
]

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export interface FlightFormProps {
  initial: Partial<FlightData> & { id: string }
  defaultCurrency?: string
  onSubmit: (data: FlightData) => Promise<void>
  onCancel: () => void
  onDelete: () => Promise<void>
}

export function FlightForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: FlightFormProps) {
  const [price, setPrice] = useState(initial.price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial.booking_ref ?? '')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async () => {
    setBusy(true)
    try {
      const data: FlightData = {
        airline: initial.airline ?? '',
        flight_number: initial.flight_number ?? null,
        origin_iata: initial.origin_iata ?? '',
        origin_name: initial.origin_name ?? null,
        dest_iata: initial.dest_iata ?? '',
        dest_name: initial.dest_name ?? null,
        departure_at: initial.departure_at ?? null,
        arrival_at: initial.arrival_at ?? null,
        price: price ? Number(price) : null,
        currency: price ? currency : null,
        cabin_class: initial.cabin_class ?? null,
        booking_ref: bookingRef.trim() || null,
        offer_id: initial.offer_id ?? null,
      }
      await onSubmit(data)
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div onKeyDown={handleKey} className="rounded-xl border border-[var(--trip-base)]/30 bg-white dark:bg-white/[0.04] p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
          {initial.airline} {initial.flight_number ?? ''}
        </h3>
        <p className="text-[12px] text-gray-500 dark:text-gray-400">
          <span className="font-mono">{initial.origin_iata}</span> → <span className="font-mono">{initial.dest_iata}</span>
          {' · '}{formatTime(initial.departure_at)} → {formatTime(initial.arrival_at)}
          {initial.cabin_class && <> · {initial.cabin_class}</>}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        <div className="md:col-span-2">
          <FieldLabel>Price</FieldLabel>
          <Input type="number" value={price} onChange={setPrice} placeholder="0" min={0} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Currency</FieldLabel>
          <Select value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
        </div>
        <div className="md:col-span-6">
          <FieldLabel>Booking ref</FieldLabel>
          <Input value={bookingRef} onChange={setBookingRef} placeholder="Confirmation number (optional)" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onDelete}
          disabled={busy}
          className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
        >
          Delete flight
        </button>
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>Save</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
