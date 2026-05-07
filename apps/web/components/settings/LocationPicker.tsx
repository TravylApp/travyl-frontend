'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin, Search, Crosshair, X } from 'lucide-react';

interface GeoSearchResult {
  id: string;
  label: string;
  city: string;
  region: string | null;
  country: string;
  countryCode: string | null;
  lat: number;
  lng: number;
}

const LeafletMap = dynamic(
  () => import('@/components/leaflet-map'),
  { ssr: false, loading: () => <div className="w-full h-[180px] rounded-xl bg-gray-100 animate-pulse" /> },
);

export interface LocationValue {
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  /** Disable while parent is saving etc. */
  disabled?: boolean;
}

export function LocationPicker({ value, onChange, disabled }: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [autoLocating, setAutoLocating] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data: GeoSearchResult[] = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  function selectResult(r: GeoSearchResult) {
    onChange({ city: r.city, country: r.country, lat: r.lat, lng: r.lng });
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  async function useMyLocation() {
    setAutoLocating(true);
    setOpen(false);
    try {
      const res = await fetch('/api/geo/me');
      if (!res.ok) return;
      const data = await res.json();
      if (data?.city && data?.country) {
        onChange({
          city: data.city,
          country: data.country,
          lat: typeof data.lat === 'number' ? data.lat : null,
          lng: typeof data.lng === 'number' ? data.lng : null,
        });
      }
    } catch {
      // fail silently — user can type
    } finally {
      setAutoLocating(false);
    }
  }

  function clearLocation() {
    onChange({ city: '', country: '', lat: null, lng: null });
  }

  const hasValue = !!value.city || !!value.country;
  const hasCoords = value.lat !== null && value.lng !== null;

  return (
    <div className="space-y-3" ref={wrapRef}>
      <label className="block text-sm font-medium text-gray-700">Where you live</label>

      <div className="relative">
        {/* Selected pill */}
        {hasValue && !open && (
          <div className="flex items-center gap-2 px-3.5 h-11 rounded-xl border border-gray-200 bg-white">
            <MapPin size={16} className="text-[#1e3a5f] shrink-0" />
            <span className="text-sm text-gray-900 truncate flex-1">
              {value.city}
              {value.country ? `, ${value.country}` : ''}
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={disabled}
              className="text-xs font-medium text-[#1e3a5f] hover:text-[#16314f] disabled:opacity-50"
            >
              Change
            </button>
            <button
              type="button"
              onClick={clearLocation}
              disabled={disabled}
              aria-label="Clear location"
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Search input */}
        {(!hasValue || open) && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="Search a city…"
              disabled={disabled}
              autoComplete="off"
              className="w-full h-11 pl-9 pr-32 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={useMyLocation}
              disabled={disabled || autoLocating}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 h-7 text-xs font-medium text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded-md transition-colors disabled:opacity-50"
            >
              {autoLocating ? <Loader2 size={12} className="animate-spin" /> : <Crosshair size={12} />}
              Use current
            </button>
          </div>
        )}

        {/* Dropdown */}
        {open && (query.length >= 2 || searching) && (
          <div className="absolute z-20 mt-1.5 w-full max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {searching && (
              <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Searching…
              </div>
            )}
            {!searching && results.length === 0 && query.length >= 2 && (
              <div className="px-4 py-3 text-sm text-gray-500">No matching cities.</div>
            )}
            {!searching && results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectResult(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-0"
              >
                <MapPin size={14} className="text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 truncate">{r.city}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {r.region ? `${r.region}, ` : ''}{r.country}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map preview */}
      {hasCoords && (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <LeafletMap
            lat={value.lat!}
            lng={value.lng!}
            label={`${value.city}, ${value.country}`}
            zoom={10}
            height={180}
          />
        </div>
      )}

      <p className="text-xs text-gray-500">
        We use this to suggest nearby trips and tailor inspiration. Your exact coordinates are never shown to other users.
      </p>
    </div>
  );
}
