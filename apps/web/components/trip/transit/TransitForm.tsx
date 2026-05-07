'use client';
import React from 'react';
import { FieldLabel, Input, Select, DateTimeInput, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives';
import type { TransitData, VehicleType } from '@travyl/shared';

interface TransitFormProps {
  initial?: Partial<TransitData> & { id?: string };
  onSubmit: (data: TransitData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  defaultCurrency?: string;
}

const VEHICLE_OPTIONS = [
  { value: 'train', label: 'Train' },
  { value: 'bus', label: 'Bus' },
  { value: 'subway', label: 'Subway/Metro' },
  { value: 'tram', label: 'Tram' },
  { value: 'light_rail', label: 'Light Rail' },
  { value: 'ferry', label: 'Ferry' },
  { value: 'cable_car', label: 'Cable Car' },
  { value: 'funicular', label: 'Funicular' },
  { value: 'rideshare', label: 'Rideshare' },
  { value: 'shuttle', label: 'Shuttle' },
];

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function localInputToIso(local: string): string {
  if (!local) return '';
  return new Date(local).toISOString();
}

export function TransitForm({ initial, onSubmit, onCancel, onDelete, defaultCurrency = 'USD' }: TransitFormProps) {
  const isEditing = !!initial?.id;

  const [vehicleType, setVehicleType] = React.useState(initial?.vehicleType ?? 'train');
  const [provider, setProvider] = React.useState(initial?.provider ?? '');
  const [routeName, setRouteName] = React.useState(initial?.routeName ?? '');
  const [originLabel, setOriginLabel] = React.useState(initial?.originLabel ?? '');
  const [destinationLabel, setDestinationLabel] = React.useState(initial?.destinationLabel ?? '');
  const [departureAt, setDepartureAt] = React.useState(isoToLocalInput(initial?.departureAt));
  const [arrivalAt, setArrivalAt] = React.useState(isoToLocalInput(initial?.arrivalAt));
  const [bookingRef, setBookingRef] = React.useState(initial?.bookingRef ?? '');
  const [confirmationCode, setConfirmationCode] = React.useState(initial?.confirmationCode ?? '');
  const [price, setPrice] = React.useState(initial?.price?.toString() ?? '');
  const [currency, setCurrency] = React.useState(initial?.currency ?? defaultCurrency);
  const [notes, setNotes] = React.useState(initial?.notes ?? '');
  const [errors, setErrors] = React.useState<Record<string, boolean>>({});
  const [saving, setSaving] = React.useState(false);

  function validate(): boolean {
    const e: Record<string, boolean> = {};
    if (!originLabel.trim()) e.origin = true;
    if (!destinationLabel.trim()) e.destination = true;
    if (!departureAt) e.departureAt = true;
    if (!arrivalAt) e.arrivalAt = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({
        vehicleType: vehicleType as TransitData['vehicleType'],
        provider: provider.trim() || null,
        routeName: routeName.trim() || null,
        originLabel: originLabel.trim(),
        destinationLabel: destinationLabel.trim(),
        departureAt: localInputToIso(departureAt),
        arrivalAt: localInputToIso(arrivalAt),
        price: price ? parseFloat(price) : null,
        currency,
        bookingRef: bookingRef.trim() || null,
        confirmationCode: confirmationCode.trim() || null,
        notes: notes.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKey} className="rounded-xl border border-[var(--trip-base)]/30 bg-white dark:bg-white/[0.04] p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        <div className="md:col-span-3">
          <FieldLabel>Mode</FieldLabel>
          <Select value={vehicleType} onChange={(v) => setVehicleType(v as VehicleType)} options={VEHICLE_OPTIONS} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Provider/Operator</FieldLabel>
          <Input value={provider} onChange={setProvider} placeholder="Amtrak, JR East, MTA, SFMTA..." />
        </div>

        <div className="md:col-span-6">
          <FieldLabel>Route/Line Name</FieldLabel>
          <Input value={routeName} onChange={setRouteName} placeholder="Yamanote Line, N'EX, 38 Geary..." />
        </div>

        <div className="md:col-span-3">
          <FieldLabel>Origin Stop</FieldLabel>
          <Input value={originLabel} onChange={setOriginLabel} placeholder="Tokyo Station" invalid={!!errors.origin} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Destination Stop</FieldLabel>
          <Input value={destinationLabel} onChange={setDestinationLabel} placeholder="Shinjuku Station" invalid={!!errors.destination} />
        </div>

        <div className="md:col-span-3">
          <FieldLabel>Departure</FieldLabel>
          <DateTimeInput value={departureAt} onChange={setDepartureAt} invalid={!!errors.departureAt} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Arrival</FieldLabel>
          <DateTimeInput value={arrivalAt} onChange={setArrivalAt} invalid={!!errors.arrivalAt} />
        </div>

        <div className="md:col-span-2">
          <FieldLabel>Booking Ref</FieldLabel>
          <Input value={bookingRef} onChange={setBookingRef} placeholder="Confirmation #" />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Confirmation Code</FieldLabel>
          <Input value={confirmationCode} onChange={setConfirmationCode} placeholder="e-ticket #" />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Price</FieldLabel>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input type="number" min="0" step="0.01" value={price} onChange={setPrice} placeholder="0.00" />
            </div>
            <div className="w-20">
              <Input value={currency} onChange={setCurrency} placeholder="USD" />
            </div>
          </div>
        </div>

        <div className="md:col-span-6">
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/20 resize-none"
            rows={2}
            placeholder="Platform number, car number, transfer tips..."
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {isEditing && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
            >
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving} busy={saving}>
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Transit'}
          </PrimaryButton>
        </div>
      </div>
    </form>
  );
}
