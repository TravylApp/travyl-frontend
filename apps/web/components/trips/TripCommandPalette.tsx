'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { usePaletteOpen } from '@/contexts/PaletteOpenContext';
import { useRealtimeTripsContext } from '@/contexts/RealtimeTripsContext';
import type { CalendarTrip } from '@travyl/shared';

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', {
    ...opts,
    year: 'numeric',
  })}`;
}

const STATUS_BADGE: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-600',
  booked: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-800',
  abandoned: 'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  planning: 'Planning',
  booked: 'Booked',
  active: 'Active',
  completed: 'Completed',
  abandoned: 'Abandoned',
};

export function TripCommandPalette() {
  const { isOpen, close } = usePaletteOpen();
  const router = useRouter();
  const { trips } = useRealtimeTripsContext();
  const [search, setSearch] = useState('');

  // Snapshot taken once on open — not updated while palette is open
  const snapshot = useRef<CalendarTrip[]>([]);

  useEffect(() => {
    if (isOpen) {
      snapshot.current = trips.map((t) => ({ ...t }));
      setSearch('');
    }
    // intentionally omits `trips` from deps — snapshot must not refresh while open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  const query = search.trim().toLowerCase();
  const filtered = snapshot.current.filter(
    (t) =>
      t.title.toLowerCase().includes(query) ||
      t.destination.toLowerCase().includes(query)
  );

  function handleSelect(trip: CalendarTrip) {
    router.push('/trip/' + trip.id);
    close();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={close} />

      {/* Palette panel */}
      <Command
        className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-10"
        shouldFilter={false}
      >
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search trips…"
          className="w-full px-4 py-3 text-sm outline-none border-b border-gray-100 placeholder:text-gray-400"
          autoFocus
        />
        <Command.List className="max-h-[320px] overflow-y-auto py-1">
          <Command.Empty className="px-4 py-8 text-center text-sm text-gray-500">
            No trips found.
          </Command.Empty>
          {filtered.map((trip) => (
            <Command.Item
              key={trip.id}
              value={trip.id}
              onSelect={() => handleSelect(trip)}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 aria-selected:bg-gray-50 transition-colors"
            >
              {/* Destination placeholder thumbnail */}
              <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center text-xl font-semibold text-gray-400 select-none">
                {trip.destination.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold text-gray-900 truncate"
                  style={{ fontFamily: 'Satoshi, system-ui, sans-serif' }}
                >
                  {trip.title}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {formatDateRange(trip.start_date, trip.end_date)}
                </p>
              </div>

              <span
                className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                  STATUS_BADGE[trip.status] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {STATUS_LABEL[trip.status] ?? trip.status}
              </span>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
