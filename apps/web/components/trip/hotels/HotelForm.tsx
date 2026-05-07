'use client'

import { useState } from 'react'
import type { HotelData } from '@travyl/shared'
import { FieldLabel, Input, Select, DateInput, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'MXN', label: 'MXN ($)' },
]

export interface HotelFormProps {
  /** Existing booking to edit. Omit when creating a new one. */
  initial?: Partial<HotelData> & { id: string }
  defaultCurrency?: string
  onSubmit: (data: HotelData) => Promise<void>
  onCancel: () => void
  /** Only relevant when editing an existing booking. */
  onDelete?: () => Promise<void>
}

export function HotelForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: HotelFormProps) {
  const initialData = initial ?? ({} as Partial<HotelData>)
  const isEditing = !!initial
  const [name, setName] = useState(initialData.name ?? '')
  const [address, setAddress] = useState(initialData.address ?? '')
  const [checkIn, setCheckIn] = useState(initialData.check_in ?? '')
  const [checkOut, setCheckOut] = useState(initialData.check_out ?? '')
  const [pricePerNight, setPricePerNight] = useState(initialData.price_per_night?.toString() ?? '')
  const [totalPrice, setTotalPrice] = useState(initialData.total_price?.toString() ?? '')
  const [currency, setCurrency] = useState(initialData.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initialData.booking_ref ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ name?: boolean; checkIn?: boolean; checkOut?: boolean }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!isEditing && !name.trim()) next.name = true
    if (!checkIn) next.checkIn = true
    if (!checkOut) next.checkOut = true
    else if (checkIn && checkOut < checkIn) next.checkOut = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const data: HotelData = {
        name: isEditing ? (initialData.name ?? '') : name.trim(),
        address: isEditing ? (initialData.address ?? null) : (address.trim() || null),
        latitude: initialData.latitude ?? null,
        longitude: initialData.longitude ?? null,
        check_in: checkIn,
        check_out: checkOut,
        price_per_night: pricePerNight ? Number(pricePerNight) : null,
        total_price: totalPrice ? Number(totalPrice) : null,
        currency: (pricePerNight || totalPrice) ? currency : null,
        rating: initialData.rating ?? null,
        star_rating: initialData.star_rating ?? null,
        image_url: initialData.image_url ?? null,
        booking_ref: bookingRef.trim() || null,
        offer_id: initialData.offer_id ?? null,
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
      {isEditing ? (
        <div className="space-y-2">
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{initialData.name}</h3>
          {initialData.address && <p className="text-[12px] text-gray-500 dark:text-gray-400">{initialData.address}</p>}
        </div>
      ) : (
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Add a hotel</h3>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        {!isEditing && (
          <>
            <div className="md:col-span-6">
              <FieldLabel>Hotel name</FieldLabel>
              <Input value={name} onChange={setName} placeholder="e.g. Park Hyatt Tokyo" autoFocus />
              {errors.name && <p className="text-[11px] text-red-500 mt-1">Required</p>}
            </div>
            <div className="md:col-span-6">
              <FieldLabel>Address (optional)</FieldLabel>
              <Input value={address} onChange={setAddress} placeholder="Street, city" />
            </div>
          </>
        )}
        <div className="md:col-span-3">
          <FieldLabel>Check-in</FieldLabel>
          <DateInput value={checkIn} onChange={setCheckIn} invalid={errors.checkIn} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Check-out</FieldLabel>
          <DateInput value={checkOut} onChange={setCheckOut} invalid={errors.checkOut} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Per night</FieldLabel>
          <Input type="number" value={pricePerNight} onChange={setPricePerNight} placeholder="0" min={0} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Total</FieldLabel>
          <Input type="number" value={totalPrice} onChange={setTotalPrice} placeholder="0" min={0} />
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
            className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            Delete hotel
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>{isEditing ? 'Save' : 'Add hotel'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
