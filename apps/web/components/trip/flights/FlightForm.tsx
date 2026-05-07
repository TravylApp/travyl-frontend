'use client'

import { useState } from 'react'
import type { FlightData } from '@travyl/shared'
import { FieldLabel, Input, Select, PrimaryButton, SecondaryButton, DateTimeInput } from '@/components/trip/BookingFormPrimitives'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'MXN', label: 'MXN ($)' },
]

const CABIN_OPTIONS = [
  { value: '', label: '—' },
  { value: 'Economy', label: 'Economy' },
  { value: 'Premium economy', label: 'Premium economy' },
  { value: 'Business', label: 'Business' },
  { value: 'First', label: 'First' },
]

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toLocalDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  // datetime-local expects YYYY-MM-DDTHH:mm in local time
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export interface FlightFormProps {
  /** Existing flight to edit. Omit when creating a new one. */
  initial?: Partial<FlightData> & { id: string }
  defaultCurrency?: string
  onSubmit: (data: FlightData) => Promise<void>
  onCancel: () => void
  /** Only relevant when editing an existing flight. */
  onDelete?: () => Promise<void>
}

export function FlightForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: FlightFormProps) {
  const data = initial ?? ({} as Partial<FlightData>)
  const isEditing = !!initial

  const [airline, setAirline] = useState(data.airline ?? '')
  const [flightNumber, setFlightNumber] = useState(data.flight_number ?? '')
  const [originIata, setOriginIata] = useState(data.origin_iata ?? '')
  const [destIata, setDestIata] = useState(data.dest_iata ?? '')
  const [departureAt, setDepartureAt] = useState(toLocalDateTime(data.departure_at))
  const [arrivalAt, setArrivalAt] = useState(toLocalDateTime(data.arrival_at))
  const [cabinClass, setCabinClass] = useState(data.cabin_class ?? '')
  const [price, setPrice] = useState(data.price?.toString() ?? '')
  const [currency, setCurrency] = useState(data.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(data.booking_ref ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ airline?: boolean; origin?: boolean; dest?: boolean; departureAt?: boolean }>({})

  const validate = () => {
    if (isEditing) return true
    const next: typeof errors = {}
    if (!airline.trim()) next.airline = true
    if (!originIata.trim() || originIata.trim().length !== 3) next.origin = true
    if (!destIata.trim() || destIata.trim().length !== 3) next.dest = true
    if (!departureAt) next.departureAt = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const out: FlightData = {
        airline: isEditing ? (data.airline ?? '') : airline.trim(),
        flight_number: isEditing ? (data.flight_number ?? null) : (flightNumber.trim() || null),
        origin_iata: isEditing ? (data.origin_iata ?? '') : originIata.trim().toUpperCase(),
        origin_name: data.origin_name ?? null,
        dest_iata: isEditing ? (data.dest_iata ?? '') : destIata.trim().toUpperCase(),
        dest_name: data.dest_name ?? null,
        departure_at: isEditing ? (data.departure_at ?? null) : (departureAt ? new Date(departureAt).toISOString() : null),
        arrival_at: isEditing ? (data.arrival_at ?? null) : (arrivalAt ? new Date(arrivalAt).toISOString() : null),
        price: price ? Number(price) : null,
        currency: price ? currency : null,
        cabin_class: isEditing ? (data.cabin_class ?? null) : (cabinClass || null),
        booking_ref: bookingRef.trim() || null,
        offer_id: data.offer_id ?? null,
      }
      await onSubmit(out)
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
      {isEditing ? (
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
            {data.airline} {data.flight_number ?? ''}
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">
            <span className="font-mono">{data.origin_iata}</span> → <span className="font-mono">{data.dest_iata}</span>
            {' · '}{formatTime(data.departure_at)} → {formatTime(data.arrival_at)}
            {data.cabin_class && <> · {data.cabin_class}</>}
          </p>
        </div>
      ) : (
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Add a flight</h3>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        {!isEditing && (
          <>
            <div className="md:col-span-4">
              <FieldLabel>Airline</FieldLabel>
              <Input value={airline} onChange={setAirline} placeholder="e.g. United" autoFocus />
              {errors.airline && <p className="text-[11px] text-red-500 mt-1">Required</p>}
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Flight #</FieldLabel>
              <Input value={flightNumber} onChange={setFlightNumber} placeholder="e.g. UA 123" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>From (IATA)</FieldLabel>
              <Input value={originIata} onChange={(v) => setOriginIata(v.toUpperCase())} placeholder="JFK" />
              {errors.origin && <p className="text-[11px] text-red-500 mt-1">3-letter code required</p>}
            </div>
            <div className="md:col-span-3">
              <FieldLabel>To (IATA)</FieldLabel>
              <Input value={destIata} onChange={(v) => setDestIata(v.toUpperCase())} placeholder="LAX" />
              {errors.dest && <p className="text-[11px] text-red-500 mt-1">3-letter code required</p>}
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Departure</FieldLabel>
              <DateTimeInput value={departureAt} onChange={setDepartureAt} invalid={errors.departureAt} />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Arrival</FieldLabel>
              <DateTimeInput value={arrivalAt} onChange={setArrivalAt} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Cabin</FieldLabel>
              <Select value={cabinClass} onChange={setCabinClass} options={CABIN_OPTIONS} />
            </div>
          </>
        )}
        <div className={`${isEditing ? 'md:col-span-2' : 'md:col-span-2'}`}>
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
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            Delete flight
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>{isEditing ? 'Save' : 'Add flight'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
