'use client';
import React from 'react';
import { PrimaryButton, SecondaryButton, FieldLabel, Input, DateInput } from '@/components/trip/BookingFormPrimitives';

export interface TransitSearchParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  departureTime: string;
  originLabel: string;
  destLabel: string;
}

interface TransitSearchPanelProps {
  onSearch: (params: TransitSearchParams) => void;
  onCancel: () => void;
  isSearching: boolean;
}

async function geocode(place: string): Promise<{ lat: number; lng: number; label: string }> {
  const coordMatch = place.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]), label: place };
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`,
      { headers: { 'User-Agent': 'Travyl/1.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
      }
    }
  } catch {
    // fall through
  }

  return { lat: 0, lng: 0, label: place };
}

export function TransitSearchPanel({ onSearch, onCancel, isSearching }: TransitSearchPanelProps) {
  const [origin, setOrigin] = React.useState('');
  const [destination, setDestination] = React.useState('');
  const [departureDate, setDepartureDate] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [geocoding, setGeocoding] = React.useState(false);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!origin.trim()) e.origin = 'Enter origin';
    if (!destination.trim()) e.destination = 'Enter destination';
    if (!departureDate) e.departureDate = 'Select date';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setGeocoding(true);
    try {
      const [originGeo, destGeo] = await Promise.all([
        geocode(origin.trim()),
        geocode(destination.trim()),
      ]);
      onSearch({
        originLat: originGeo.lat,
        originLng: originGeo.lng,
        destLat: destGeo.lat,
        destLng: destGeo.lng,
        departureTime: new Date(departureDate).toISOString(),
        originLabel: originGeo.label,
        destLabel: destGeo.label,
      });
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Origin</FieldLabel>
          <Input value={origin} onChange={(v) => setOrigin(v)} placeholder="Station name or address" invalid={!!errors.origin} />
        </div>
        <div>
          <FieldLabel>Destination</FieldLabel>
          <Input value={destination} onChange={(v) => setDestination(v)} placeholder="Station name or address" invalid={!!errors.destination} />
        </div>
      </div>
      <div className="w-48">
        <FieldLabel>Departure Date</FieldLabel>
        <DateInput value={departureDate} onChange={(v) => setDepartureDate(v)} invalid={!!errors.departureDate} />
      </div>
      <div className="flex items-center justify-end gap-2">
        <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
        <PrimaryButton type="submit" disabled={isSearching || geocoding}>
          {isSearching || geocoding ? 'Searching...' : 'Search Routes'}
        </PrimaryButton>
      </div>
    </form>
  );
}
