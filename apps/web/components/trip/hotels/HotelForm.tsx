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
  initial?: Partial<HotelData> & { id?: string }
  defaultCurrency?: string
  onSubmit: (data: HotelData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function HotelForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: HotelFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [checkIn, setCheckIn] = useState(initial?.check_in ?? '')
  const [checkOut, setCheckOut] = useState(initial?.check_out ?? '')
  const [pricePerNight, setPricePerNight] = useState(initial?.price_per_night?.toString() ?? '')
  const [totalPrice, setTotalPrice] = useState(initial?.total_price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial?.booking_ref ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '')
  const [offerId, setOfferId] = useState(initial?.offer_id ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ name?: boolean; checkIn?: boolean; checkOut?: boolean }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!name.trim()) next.name = true
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
        name: name.trim(),
        address: address.trim() || null,
        latitude: initial?.latitude ?? null,
        longitude: initial?.longitude ?? null,
        check_in: checkIn,
        check_out: checkOut,
        price_per_night: pricePerNight ? Number(pricePerNight) : null,
        total_price: totalPrice ? Number(totalPrice) : null,
        currency: (pricePerNight || totalPrice) ? currency : null,
        rating: initial?.rating ?? null,
        star_rating: initial?.star_rating ?? null,
        image_url: imageUrl.trim() || null,
        booking_ref: bookingRef.trim() || null,
        offer_id: offerId.trim() || null,
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
        <div className="md:col-span-6">
          <FieldLabel>Hotel name</FieldLabel>
          <Input value={name} onChange={setName} autoFocus invalid={errors.name} />
        </div>
        <div className="md:col-span-6">
          <FieldLabel>Address</FieldLabel>
          <Input value={address} onChange={setAddress} placeholder="Street, City" />
        </div>
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
        <div className="md:col-span-2">
          <FieldLabel>Booking ref</FieldLabel>
          <Input value={bookingRef} onChange={setBookingRef} placeholder="Optional" />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Offer ID</FieldLabel>
          <Input value={offerId} onChange={setOfferId} placeholder="Optional" />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Image URL</FieldLabel>
          <Input value={imageUrl} onChange={setImageUrl} placeholder="Optional" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            Delete hotel
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>{initial?.id ? 'Save' : 'Add hotel'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
