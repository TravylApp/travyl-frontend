'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Pencil, X, Check, Calendar, Users } from 'lucide-react';
import { formatDateRange, updateTripDetails } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

export function CompactTripHeader({
  tripId,
  trip,
  onTripUpdate,
}: {
  tripId: string;
  trip: Trip | null;
  onTripUpdate?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editTravelers, setEditTravelers] = useState(1);
  const [saving, setSaving] = useState(false);

  const rawCover = trip?.trip_context?.hero_image_url;
  const coverImage = rawCover?.includes('googleusercontent.com')
    ? rawCover.replace(/=w\d+-h\d+[^&]*/, '=w1600-h600-k-no')
    : rawCover;

  const destination = trip?.destination;
  const cityName = destination ? destination.split(',')[0].trim() : '';
  const countryName = destination ? destination.split(',').slice(1).join(',').trim() : '';
  const dateStr = trip?.start_date && trip?.end_date ? formatDateRange(trip.start_date, trip.end_date) : null;
  const travelersCount = trip?.travelers || 1;

  const countryFlag = trip?.trip_context?.country?.flag as string | undefined;
  const countryCca2 = trip?.trip_context?.country?.cca2 as string | undefined;
  const flagUrl = countryFlag || (countryCca2 ? `https://flagcdn.com/24x18/${countryCca2.toLowerCase()}.png` : null);

  const openEditor = useCallback(() => {
    setEditTitle(trip?.title || '');
    setEditStart(trip?.start_date || '');
    setEditEnd(trip?.end_date || '');
    setEditTravelers(trip?.travelers || 1);
    setEditing(true);
  }, [trip]);

  const saveEdits = useCallback(async () => {
    if (!tripId || saving) return;
    setSaving(true);
    try {
      await updateTripDetails(tripId, {
        title: editTitle || undefined,
        start_date: editStart || undefined,
        end_date: editEnd || undefined,
        travelers: editTravelers,
      });
      setEditing(false);
      onTripUpdate?.();
    } catch (e) {
      console.error('Failed to update trip:', e);
    } finally {
      setSaving(false);
    }
  }, [tripId, editTitle, editStart, editEnd, editTravelers, saving, onTripUpdate]);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 180 }}>
      {/* Background image */}
      {coverImage ? (
        <Image
          src={coverImage}
          alt={destination || ''}
          fill
          referrerPolicy="no-referrer"
          className="object-cover"
          style={{ objectPosition: 'center 30%' }}
          sizes="100vw"
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end max-w-7xl mx-auto px-6 sm:px-10 md:pl-24 pb-5">
        {/* Country tag */}
        <p className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-semibold mb-1.5"
          style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {flagUrl && <img src={flagUrl} alt="flag" width={20} height={15} className="rounded-[2px]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />}
          <span>{countryName || ''}</span>
        </p>

        {/* Title row */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-white leading-tight font-serif"
              style={{ letterSpacing: '0.02em', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              {cityName || trip?.title || 'Untitled Trip'}
            </h1>

            {/* Meta row */}
            {!editing && (
              <div className="flex items-center gap-3 mt-1.5 text-[13px] text-white/80">
                {dateStr && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-white/50" />
                    {dateStr}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users size={12} className="text-white/50" />
                  {travelersCount} {travelersCount === 1 ? 'traveler' : 'travelers'}
                </span>
                <button
                  onClick={openEditor}
                  className="ml-1 p-1 rounded-full hover:bg-white/15 text-white/50 hover:text-white transition-colors"
                  title="Edit trip details"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Inline editor */}
        {editing && (
          <div className="flex flex-wrap items-end gap-2.5 mt-2">
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Trip title"
              className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 w-40" />
            <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 [color-scheme:dark]" />
            <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 [color-scheme:dark]" />
            <input type="number" min={1} max={20} value={editTravelers} onChange={(e) => setEditTravelers(Number(e.target.value))}
              className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 w-16" />
            <button onClick={saveEdits} disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white text-[#0f1f33] text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50">
              <Check size={13} /> {saving ? '...' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors border border-white/20">
              <X size={13} /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
