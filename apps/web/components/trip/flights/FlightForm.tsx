'use client'

import { useState } from 'react'
import type { FlightData } from '@travyl/shared'
import { FieldLabel, Input, Select, DateTimeInput, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives'

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
  { value: 'economy', label: 'Economy' },
  { value: 'premium', label: 'Premium economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
]

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export interface FlightFormProps {
  initial?: Partial<FlightData> & { id?: string }
  defaultCurrency?: string
  onSubmit: (data: FlightData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function FlightForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: FlightFormProps) {
  const [airline, setAirline] = useState(initial?.airline ?? '')
  const [flightNumber, setFlightNumber] = useState(initial?.flight_number ?? '')
  const [originIata, setOriginIata] = useState(initial?.origin_iata ?? '')
  const [destIata, setDestIata] = useState(initial?.dest_iata ?? '')
  const [departureLocal, setDepartureLocal] = useState(isoToLocalInput(initial?.departure_at))
  const [arrivalLocal, setArrivalLocal] = useState(isoToLocalInput(initial?.arrival_at))
  const [cabinClass, setCabinClass] = useState(initial?.cabin_class ?? '')
  const [price, setPrice] = useState(initial?.price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial?.booking_ref ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ airline?: boolean; origin?: boolean; dest?: boolean }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!airline.trim()) next.airline = true
    if (originIata.length !== 3) next.origin = true
    if (destIata.length !== 3) next.dest = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const data: FlightData = {
        airline: airline.trim(),
        flight_number: flightNumber.trim() || null,
        origin_iata: originIata.toUpperCase(),
        origin_name: initial?.origin_name ?? null,
        dest_iata: destIata.toUpperCase(),
        dest_name: initial?.dest_name ?? null,
        departure_at: localInputToIso(departureLocal),
        arrival_at: localInputToIso(arrivalLocal),
        price: price ? Number(price) : null,
        currency: price ? currency : null,
        cabin_class: cabinClass || null,
        booking_ref: bookingRef.trim() || null,
        offer_id: initial?.offer_id ?? null,
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        <div className="md:col-span-4">
          <FieldLabel>Airline</FieldLabel>
          <Input value={airline} onChange={setAirline} autoFocus invalid={errors.airline} placeholder="e.g. American Airlines" />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Flight number</FieldLabel>
          <Input value={flightNumber} onChange={setFlightNumber} placeholder="AA 1234" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Origin (IATA)</FieldLabel>
          <Input value={originIata} onChange={(v) => setOriginIata(v.toUpperCase())} maxLength={3} invalid={errors.origin} placeholder="JFK" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Destination (IATA)</FieldLabel>
          <Input value={destIata} onChange={(v) => setDestIata(v.toUpperCase())} maxLength={3} invalid={errors.dest} placeholder="LHR" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Departure</FieldLabel>
          <DateTimeInput value={departureLocal} onChange={setDepartureLocal} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Arrival</FieldLabel>
          <DateTimeInput value={arrivalLocal} onChange={setArrivalLocal} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Cabin</FieldLabel>
          <Select value={cabinClass} onChange={setCabinClass} options={CABIN_OPTIONS} />
        </div>
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
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            Delete flight
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>{initial?.id ? 'Save' : 'Add flight'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
