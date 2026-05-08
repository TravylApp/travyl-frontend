'use client'

import { useState } from 'react'
import type { CarRentalData } from './types'
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

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export interface CarFormProps {
  initial?: Partial<CarRentalData> & { id?: string }
  defaultCurrency?: string
  onSubmit: (data: CarRentalData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function CarForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: CarFormProps) {
  const [vendor, setVendor] = useState(initial?.vendor ?? '')
  const [vehicle, setVehicle] = useState(initial?.vehicle ?? '')
  const [pickupLocation, setPickupLocation] = useState(initial?.pickup_location ?? '')
  const [dropoffLocation, setDropoffLocation] = useState(initial?.dropoff_location ?? '')
  const [pickupLocal, setPickupLocal] = useState(isoToLocalInput(initial?.pickup_at))
  const [dropoffLocal, setDropoffLocal] = useState(isoToLocalInput(initial?.dropoff_at))
  const [price, setPrice] = useState(initial?.price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial?.booking_ref ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ vendor?: boolean; pickupLocation?: boolean; pickup?: boolean; dropoff?: boolean }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!vendor.trim()) next.vendor = true
    if (!pickupLocation.trim()) next.pickupLocation = true
    if (!pickupLocal) next.pickup = true
    if (!dropoffLocal) next.dropoff = true
    else if (pickupLocal && dropoffLocal < pickupLocal) next.dropoff = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const pickupIso = localInputToIso(pickupLocal)
      const dropoffIso = localInputToIso(dropoffLocal)
      if (!pickupIso || !dropoffIso) {
        return
      }
      const data: CarRentalData = {
        vendor: vendor.trim(),
        vehicle: vehicle.trim() || null,
        pickup_location: pickupLocation.trim(),
        dropoff_location: dropoffLocation.trim() || pickupLocation.trim(),
        pickup_at: pickupIso,
        dropoff_at: dropoffIso,
        price: price ? Number(price) : null,
        currency: price ? currency : null,
        booking_ref: bookingRef.trim() || null,
        // Preserve supplier metadata captured at search time — these aren't
        // editable in the form but must survive save/edit round-trips.
        supplier_logo: initial?.supplier_logo ?? null,
        booking_url: initial?.booking_url ?? null,
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
        <div className="md:col-span-3">
          <FieldLabel>Vendor</FieldLabel>
          <Input value={vendor} onChange={setVendor} autoFocus invalid={errors.vendor} placeholder="Hertz, Enterprise, etc." />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Vehicle</FieldLabel>
          <Input value={vehicle} onChange={setVehicle} placeholder="Toyota Camry, Compact SUV" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Pickup location</FieldLabel>
          <Input value={pickupLocation} onChange={setPickupLocation} invalid={errors.pickupLocation} placeholder="SFO airport, address, etc." />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Dropoff location</FieldLabel>
          <Input value={dropoffLocation} onChange={setDropoffLocation} placeholder="Same as pickup if blank" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Pickup</FieldLabel>
          <DateTimeInput value={pickupLocal} onChange={setPickupLocal} invalid={errors.pickup} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Dropoff</FieldLabel>
          <DateTimeInput value={dropoffLocal} onChange={setDropoffLocal} invalid={errors.dropoff} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Price</FieldLabel>
          <Input type="number" value={price} onChange={setPrice} placeholder="0" min={0} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Currency</FieldLabel>
          <Select value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Booking ref</FieldLabel>
          <Input value={bookingRef} onChange={setBookingRef} placeholder="Optional" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            Delete rental
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>{initial?.id ? 'Save' : 'Add rental'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
