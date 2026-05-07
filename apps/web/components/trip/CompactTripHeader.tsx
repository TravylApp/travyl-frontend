'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Pencil, X, Check, Calendar, Users, ChevronDown, Share2, Map } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatDateRange, updateTripDetails, useWeather, ensureShareLinkToken, updateTripVisibility } from '@travyl/shared';
import type { Trip } from '@travyl/shared';
import { useRailCollapsed } from '@/components/trip-rail';


export function CompactTripHeader({
  tripId,
  trip,
  onTripUpdate,
  overrideImage,
  mapOpen,
  onToggleMap,
}: {
  tripId: string;
  trip: Trip | null;
  onTripUpdate?: () => void;
  overrideImage?: string;
  mapOpen?: boolean;
  onToggleMap?: () => void;
}) {
  const [shareBusy, setShareBusy] = useState(false);

  const handleShare = useCallback(async () => {
    if (!trip?.id || shareBusy) return;
    setShareBusy(true);
    try {
      const token = await ensureShareLinkToken(trip.id);
      if (trip.visibility === 'private') {
        try { await updateTripVisibility(trip.id, 'link'); } catch {}
      }
      const url = `${window.location.origin}/trip/${trip.id}/share/${token}`;
      const message = `Join me planning my trip to ${trip.destination} on Travyl: ${url}`;
      const title = trip.title ?? `Trip to ${trip.destination}`;
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try { await (navigator as any).share({ title, text: message, url }); return; } catch {}
      }
      try {
        await navigator.clipboard.writeText(url);
        window.alert(`Link copied to clipboard:\n${url}`);
      } catch {
        window.alert(`Share link:\n${url}`);
      }
    } catch (e: any) {
      window.alert(`Share failed: ${e?.message ?? 'unknown error'}`);
    } finally {
      setShareBusy(false);
    }
  }, [trip?.id, trip?.destination, trip?.title, trip?.visibility, shareBusy]);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editTravelers, setEditTravelers] = useState(1);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [railCollapsed] = useRailCollapsed();

  // Best available image — Unsplash override first, then hero_images, then hero_image_url
  const heroImages = trip?.trip_context?.hero_images as string[] | undefined;
  const rawCover = overrideImage || heroImages?.[0] || trip?.trip_context?.hero_image_url;
  const coverImage = rawCover?.includes('googleusercontent.com')
    ? rawCover.replace(/=w\d+-h\d+[^&]*/, '=w1600-h600-k-no')
    : rawCover;

  const destination = trip?.destination;
  // Parse "City, [Region/State,] Country" so we can render region next to the
  // city in the title (e.g. "San Francisco, CA") — that's the common
  // travel-app convention and what users expect at a glance.
  const destParts = destination ? destination.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const cityName = destParts[0] || '';
  const rawRegionName = destParts.length >= 3 ? destParts[1] : '';
  const countryName = destParts.length >= 3
    ? destParts.slice(2).join(', ')
    : (destParts[1] || '');
  const dateStr = trip?.start_date && trip?.end_date ? formatDateRange(trip.start_date, trip.end_date) : null;
  const travelersCount = trip?.travelers || 1;

  const countryFlag = trip?.trip_context?.country?.flag as string | undefined;
  const countryCca2 = trip?.trip_context?.country?.cca2 as string | undefined;
  const flagUrl = countryFlag || (countryCca2 ? `https://flagcdn.com/24x18/${countryCca2.toLowerCase()}.png` : null);

  // Many trips were saved with destination = "City, Country" (no region).
  // When that's the case but we have lat/lng, reverse-geocode via BigDataCloud's
  // free CORS-enabled client API (no key, designed for browser use, much more
  // reliable than Nominatim which rate-limits hard). Coordinates don't change
  // for a trip, so cache forever.
  const lat = trip?.trip_context?.lat;
  const lng = trip?.trip_context?.lng;
  const needsRegionLookup = !rawRegionName && lat != null && lng != null;
  const { data: lookupRegion } = useQuery<string | null>({
    queryKey: ['reverse-region', lat, lng],
    queryFn: async () => {
      try {
        const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        // `principalSubdivision` is the state/province in full ("California",
        // "Ontario", "Île-de-France"). The abbreviation map below converts
        // US/CA names to 2-letter codes; everything else stays as-is.
        return (data?.principalSubdivision as string | undefined) || null;
      } catch {
        return null;
      }
    },
    enabled: needsRegionLookup,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const regionDisplay = (rawRegionName || lookupRegion || '').trim();

  // Quick info — prefer live weather, fall back to trip_context
  const ctx = trip?.trip_context as Record<string, any> | undefined;
  const { data: liveWeather } = useWeather(cityName || '');
  const weather = liveWeather?.current || ctx?.weather?.current;
  const safety = ctx?.safety;
  const tz = ctx?.country?.timezone;
  const aqi = ctx?.aqi?.aqi;
  const aqiLevel = ctx?.aqi?.level;
  const currency = ctx?.country?.currency;
  const nextHoliday = (ctx?.holidays as { name: string; date: string }[] | undefined)?.[0];
  const forecast = (liveWeather?.forecast || ctx?.weather?.forecast) as { date: string; high: number; low: number; conditions: string }[] | undefined;
  const wiki = ctx?.wiki?.extract as string | undefined;

  const infoPills: { label: string; color?: string }[] = [];
  const temp = weather?.temp_f ?? weather?.temp;
  if (temp != null) infoPills.push({ label: `${Math.round(temp)}°${weather?.temp_f ? 'F' : ''} ${weather?.conditions || weather?.condition || ''}`.trim() });
  else if (weather?.conditions) infoPills.push({ label: weather.conditions });
  if (currency) infoPills.push({ label: `${currency.symbol} ${currency.code}` });
  if (tz) infoPills.push({ label: tz });
  if (aqiLevel) infoPills.push({ label: `Air ${aqiLevel}`, color: aqi <= 50 ? '#4ade80' : aqi <= 100 ? '#facc15' : '#f87171' });
  if (safety) {
    const s = safety.score;
    infoPills.push({ label: `Safe (${s.toFixed(1)})`, color: s <= 2.5 ? '#4ade80' : s <= 3.5 ? '#facc15' : '#f87171' });
  }
  if (nextHoliday) infoPills.push({ label: `${nextHoliday.name} · ${new Date(nextHoliday.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` });

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

  const hasExpandContent = !!(forecast?.length || wiki);

  return (
    <div className="relative w-full">
      {/* Hero — grows when expanded to keep content on the image */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 300 }}>
        {/* Background image */}
        {coverImage ? (
          <Image
            src={coverImage}
            alt={destination || ''}
            fill
            className="object-cover"
            style={{ objectPosition: 'center center' }}
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
        )}

        {/* Gradient overlay — layered for readable text on bright/hazy hero photos.
            Vertical scrim provides bottom contrast; left side gets a horizontal
            wash so the country tag + city title remain crisp even on light skies. */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)',
        }} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 45%, transparent 70%)',
        }} />

        {/* Floating action buttons — circular Share + Map, overlaid on hero */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={!trip?.id || shareBusy}
            title="Share this trip"
            aria-label="Share this trip"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Share2 size={16} />
          </button>
          {onToggleMap && (
            <button
              onClick={onToggleMap}
              title={mapOpen ? 'Hide map' : 'Show map'}
              aria-label={mapOpen ? 'Hide map' : 'Show map'}
              aria-pressed={mapOpen}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border shadow-lg transition-all duration-200 hover:scale-105 ${
                mapOpen
                  ? 'bg-white text-gray-900 border-white'
                  : 'bg-white/15 hover:bg-white/25 border-white/25 text-white'
              }`}
            >
              <Map size={16} />
            </button>
          )}
        </div>

        {/* Content — all on the hero image */}
        <div className={`relative z-10 flex flex-col justify-end max-w-7xl mx-auto px-6 sm:px-10 ${railCollapsed ? 'md:pl-[76px]' : 'md:pl-[240px]'} pb-5 transition-[padding] duration-200 ease-out`} style={{ minHeight: 300 }}>
          {/* Country tag — flag + country only (region now lives in the title) */}
          {countryName && (
            <p
              className="flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase font-semibold mb-2 text-white/85"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {flagUrl && <img src={flagUrl} alt="flag" width={20} height={15} className="rounded-[2px] shadow-sm" />}
              <span>{countryName}</span>
            </p>
          )}

          {/* Title + expand toggle */}
          <div className="flex items-center gap-2">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-normal text-white leading-[1.05] tracking-tight font-serif"
              style={{ textShadow: '0 2px 18px rgba(0,0,0,0.45)' }}
            >
              {cityName || trip?.title || 'Untitled Trip'}
              {regionDisplay && (
                <span className="text-white/55 font-light">, {regionDisplay}</span>
              )}
            </h1>
            {hasExpandContent && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-white/50 hover:text-white/85 transition-colors mt-1"
                title={expanded ? 'Show less' : 'Show more'}
              >
                <ChevronDown size={18} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Meta row — dates + travelers + edit */}
          {!editing && (
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-[13px] text-white/90"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}
            >
              {dateStr && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-white/65" />
                  <span className="tabular-nums">{dateStr}</span>
                </span>
              )}
              <span aria-hidden className="text-white/30">·</span>
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-white/65" />
                {travelersCount} {travelersCount === 1 ? 'traveler' : 'travelers'}
              </span>
              <button
                onClick={openEditor}
                className="ml-0.5 p-1.5 rounded-full hover:bg-white/15 text-white/55 hover:text-white transition-colors"
                title="Edit trip details"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}

          {/* Quick info — glass-effect pills for readability */}
          {infoPills.length > 0 && !editing && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {infoPills.map((pill, i) => (
                <span
                  key={i}
                  className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-white/95"
                  style={pill.color ? { color: pill.color, borderColor: `${pill.color}55` } : undefined}
                >
                  {pill.label}
                </span>
              ))}
            </div>
          )}

          {/* Expanded details — forecast chips + wiki */}
          {hasExpandContent && (
            <div className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? 'max-h-[400px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="flex flex-col gap-3">
                {/* Forecast — glass chips per day */}
                {forecast && forecast.length > 0 && !isNaN(forecast[0]?.high) && (
                  <div className="flex flex-wrap items-center gap-2 text-white">
                    {temp != null && (
                      <span
                        className="text-2xl font-semibold tabular-nums"
                        style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
                      >
                        {Math.round(temp)}°
                      </span>
                    )}
                    {forecast.slice(0, 5).map((day) => (
                      <span
                        key={day.date}
                        className="inline-flex items-baseline gap-1 text-[12px] tabular-nums px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/15"
                      >
                        <span className="text-white/70 font-medium">
                          {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="font-semibold text-white">{Math.round(day.high)}°</span>
                        <span className="text-white/55">/{Math.round(day.low)}°</span>
                      </span>
                    ))}
                  </div>
                )}
                {/* Wiki */}
                {wiki && (
                  <p
                    className="text-[13px] leading-relaxed text-white/90 font-sans line-clamp-4 backdrop-blur-md bg-black/40 border border-white/10 rounded-xl px-4 py-3"
                    style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
                  >
                    {wiki}
                  </p>
                )}
              </div>
            </div>
          )}

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
    </div>
  );
}
