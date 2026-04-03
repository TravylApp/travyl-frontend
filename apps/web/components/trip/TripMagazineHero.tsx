'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Cloud, Droplets, Sun, ChevronDown, Shield, Pencil, X, Check } from 'lucide-react';
import { formatDateRange, useExchangeRates, updateTripDetails } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

function QuickFactRow({ facts, className }: { facts: (string | undefined)[]; className?: string }) {
  const valid = facts.filter(Boolean) as string[];
  if (!valid.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] ${className ?? ''}`}
      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3)' }}>
      {valid.map((fact, i) => {
        const [label, ...rest] = fact.split(' · ');
        return (
          <span key={i} className="text-white/80">
            <span className="font-semibold text-white">{label}</span>
            {rest.length > 0 && ` · ${rest.join(' · ')}`}
          </span>
        );
      })}
    </div>
  );
}

function SafetyBadge({ safety }: { safety: { score: number; message: string } }) {
  const score = safety.score;
  // Travel advisory scores: 0-2.5 = safe, 2.5-3.5 = caution, 3.5-5 = danger
  const level = score <= 2.5 ? 'safe' : score <= 3.5 ? 'caution' : 'danger';
  const config = {
    safe:    { bg: 'rgba(34,197,94,0.25)', border: 'rgba(34,197,94,0.5)', text: '#4ade80', label: 'Safe' },
    caution: { bg: 'rgba(234,179,8,0.25)',  border: 'rgba(234,179,8,0.5)',  text: '#facc15', label: 'Caution' },
    danger:  { bg: 'rgba(239,68,68,0.25)',  border: 'rgba(239,68,68,0.5)',  text: '#f87171', label: 'Danger' },
  }[level];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: config.bg, border: `1px solid ${config.border}`, color: config.text }}
      title={safety.message}
    >
      <Shield size={12} />
      {config.label} ({score.toFixed(1)})
    </span>
  );
}

function useQuote() {
  const [quote, setQuote] = useState<{ content: string; author: string } | null>(null);
  useEffect(() => {
    fetch('/api/quote?tag=travel')
      .then((r) => r.json())
      .then((d) => { if (d?.content) setQuote(d); })
      .catch(() => {});
  }, []);
  return quote;
}

export function TripMagazineHero({ tripId, trip, overrideImage, compact, onTripUpdate, suppressFallback }: { tripId?: string; trip?: Trip | null; overrideImage?: string; compact?: boolean; onTripUpdate?: () => void; suppressFallback?: boolean }) {
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return;
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        el.style.transform = `translateY(${window.scrollY * 0.15}px)`;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const [editing, setEditing] = useState(false);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editTravelers, setEditTravelers] = useState(1);
  const [editTitle, setEditTitle] = useState('');
  const [editDest, setEditDest] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditor = useCallback(() => {
    setEditStart(trip?.start_date || '');
    setEditEnd(trip?.end_date || '');
    setEditTravelers(trip?.travelers || 1);
    setEditTitle(trip?.title || '');
    setEditDest(trip?.destination || '');
    setEditing(true);
  }, [trip]);

  const saveEdits = useCallback(async () => {
    if (!tripId || saving) return;
    setSaving(true);
    try {
      const destChanged = editDest && editDest !== trip?.destination;
      await updateTripDetails(tripId, {
        title: editTitle || undefined,
        destination: editDest || undefined,
        start_date: editStart || undefined,
        end_date: editEnd || undefined,
        travelers: editTravelers,
      });
      setEditing(false);
      onTripUpdate?.();
      // If destination changed, trigger re-enrichment to repopulate all data
      if (destChanged) {
        fetch(`/api/trips/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId }),
        }).then(() => onTripUpdate?.()).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to update trip:', e);
    } finally {
      setSaving(false);
    }
  }, [tripId, editTitle, editStart, editEnd, editTravelers, saving, onTripUpdate]);

  const [essentialsOpen, setEssentialsOpen] = useState(true);
  const [convertAmount, setConvertAmount] = useState<number | string>(1);
  const [convertEditing, setConvertEditing] = useState(false);
  const [useFahrenheit, setUseFahrenheit] = useState(false);
  useEffect(() => {
    try {
      const region = new Intl.Locale(navigator.language).region;
      setUseFahrenheit(['US', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH', 'LR'].includes(region ?? ''));
    } catch { /* default to Celsius */ }
  }, []);
  const fmtTemp = (c: number) => useFahrenheit ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`;
  const weather = trip?.trip_context?.weather?.current;
  const forecast = trip?.trip_context?.weather?.forecast;
  const rawCover = overrideImage || (suppressFallback ? undefined : trip?.trip_context?.hero_image_url);
  const coverImage = rawCover?.includes('googleusercontent.com')
    ? rawCover.replace(/=w\d+-h\d+[^&]*/, '=w1600-h1000-k-no')
    : rawCover;
  const destination = trip?.destination;
  const cityName = destination ? destination.split(',')[0].trim() : '';
  const countryName = destination ? destination.split(',').slice(1).join(',').trim() : '';
  const dateStr = trip?.start_date && trip?.end_date ? formatDateRange(trip.start_date, trip.end_date) : null;
  const travelersStr = trip ? `${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}` : null;

  const conditions = weather?.conditions?.toLowerCase() ?? '';
  const WeatherIcon = conditions.includes('cloud') ? Cloud : conditions.includes('rain') ? Droplets : Sun;

  // Quote removed per #547 — keep hero focused on trip data
  const rawWiki = trip?.trip_context?.wiki;
  const wiki = typeof rawWiki === 'string' ? { extract: rawWiki } : rawWiki;

  // Currency conversion — inline with quick facts
  const destCurrency = trip?.trip_context?.country?.currency;
  const tripCurrency = trip?.currency || 'USD';
  const { rates } = useExchangeRates(tripCurrency);
  const destCode = destCurrency?.code;
  const exchangeRate = destCode && rates ? rates[destCode] : null;
  const sameCurrency = destCode === tripCurrency;

  // Exchange rate: interactive converter replaces the static string
  const exchangeFact = exchangeRate && !sameCurrency && destCode
    ? `${convertAmount || 1} ${tripCurrency} · = ${destCurrency?.symbol ?? ''}${(exchangeRate * (Number(convertAmount) || 1)).toFixed(2)} ${destCode}`
    : undefined;

  // Country flag — use direct URL from REST Countries, fallback to cca2 construction
  const countryFlag = trip?.trip_context?.country?.flag as string | undefined;
  const countryCca2 = trip?.trip_context?.country?.cca2 as string | undefined;
  const flagUrl = countryFlag || (countryCca2 ? `https://flagcdn.com/24x18/${countryCca2.toLowerCase()}.png` : null);

  // Safety advisory
  const safety = trip?.trip_context?.safety as { score: number; message: string } | undefined;

  // Sunrise / sunset
  const sunrise = trip?.trip_context?.sunrise as { sunrise?: string; sunset?: string; golden_hour?: string; day_length?: string } | undefined;

  // Holidays during trip dates
  const holidays = trip?.trip_context?.holidays as { date: string; name: string; localName?: string }[] | undefined;
  const tripHolidays = holidays?.filter((h) => {
    if (!trip?.start_date || !trip?.end_date) return false;
    return h.date >= trip.start_date && h.date <= trip.end_date;
  });

  // Timezone / local time
  const tzInfo = trip?.trip_context?.timezone_info as { timezone?: string; currentTime?: string; utcOffset?: string; abbreviation?: string } | undefined;

  // Calling code
  const callingCode = trip?.trip_context?.country?.callingCode as string | undefined;

  // Air quality
  const aqi = trip?.trip_context?.aqi as { aqi: number; level: string; pm25?: number; pm10?: number } | undefined;

  // Essential phrases
  const phrases = trip?.trip_context?.phrases as Record<string, string> | undefined;
  const phraseEntries = phrases ? Object.entries(phrases).slice(0, 4) : [];

  const hasEssentials = !!(trip?.trip_context?.quick_facts || weather || wiki || exchangeFact || safety || sunrise || tripHolidays?.length || aqi || phraseEntries.length);
  const essentialsMaxH = 'max-h-[1200px]';

  return (
    <>
      {/* Background image — bleeds behind nav and all content */}
      {coverImage && (
        <div className="absolute inset-x-0 top-0 z-0 pointer-events-none overflow-hidden" style={{ height: '160vh' }}>
          <div ref={bgRef} className="absolute inset-0" style={{ willChange: 'transform' }}>
            <Image src={coverImage} alt="" fill  className="object-cover"
              style={{ objectPosition: 'center 30%' }} sizes="100vw" priority />
          </div>
          {/* Gradient overlay — longer fade so hero bleeds through Things to Do */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.25) 10%, rgba(0,0,0,0.35) 20%, rgba(0,0,0,0.45) 30%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.65) 50%, var(--magazine-bg, var(--background)) 75%, var(--magazine-bg, var(--background)) 100%)' }} />
        </div>
      )}

      {/* Hero text — aligned with content area (max-w-7xl + spine offset) */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 md:pl-24 pt-[68px] pb-4">
        <p className="flex items-center gap-2 text-[10px] tracking-[0.4em] uppercase font-semibold mb-1" style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {flagUrl && <img src={flagUrl} alt="flag" width={24} height={18} className="rounded-[2px]" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />}
          <span>{countryName || (trip ? 'Your Trip Guide' : '')}</span>
        </p>
        <div className="flex items-center gap-4">
          {cityName ? (
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[0.95] font-serif"
              style={{ letterSpacing: '0.02em', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
              {cityName.toUpperCase()}
            </h1>
          ) : (
            <div className="h-14 sm:h-16 md:h-20 w-[60%] rounded-lg bg-white/15 animate-pulse" />
          )}
          {hasEssentials && (
            <button
              onClick={() => setEssentialsOpen((v) => !v)}
              className="p-1.5 rounded-full transition-all shrink-0 hover:bg-white/15 active:scale-90"
              title={essentialsOpen ? 'Hide trip info' : 'Show trip info'}
            >
              <ChevronDown size={16} className={`text-white/60 transition-transform duration-300 ${essentialsOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible trip info */}
      {hasEssentials && (
        <div className={`relative z-10 max-w-7xl mx-auto px-6 sm:px-10 md:pl-24 transition-all duration-300 ${essentialsOpen ? 'mb-6' : 'mb-0'}`}>
          <div className={`transition-all duration-300 overflow-hidden ${essentialsOpen ? `${essentialsMaxH} opacity-100` : 'max-h-0 opacity-0'}`}
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3)' }}>

            {/* Dates + travelers — inline editable */}
            {editing ? (
              <div className="flex flex-wrap items-end gap-3 mb-4 animate-[fadeSlideIn_0.2s_ease-out]">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">Destination</label>
                  <input type="text" value={editDest} onChange={(e) => setEditDest(e.target.value)}
                    placeholder="City, Country"
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 w-48" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">Title</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/40 w-48" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">Start</label>
                  <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">End</label>
                  <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">Travelers</label>
                  <input type="number" min={1} max={20} value={editTravelers} onChange={(e) => setEditTravelers(Number(e.target.value))}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/40 w-20" />
                </div>
                <button onClick={saveEdits} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0f1f33] text-sm font-semibold hover:bg-white/90 transition-colors disabled:opacity-50">
                  <Check size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors border border-white/20">
                  <X size={14} /> Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-[14px] sm:text-[15px] text-white/80 font-medium mb-4">
                {dateStr && <span>{dateStr}</span>}
                {dateStr && travelersStr && <span className="text-white/30">&middot;</span>}
                {travelersStr && <span>{travelersStr}</span>}
                {tripId && (
                  <button onClick={openEditor} className="ml-1 p-1 rounded-full hover:bg-white/15 text-white/50 hover:text-white transition-colors" title="Edit trip details">
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            )}

            {/* Quick facts, holidays, weather */}
            <div className="space-y-2.5 mb-4">
            {/* Quick facts — currency, language, timezone, emergency, sunrise/sunset */}
            {(trip?.trip_context?.quick_facts || exchangeFact || sunrise) && (() => {
              const qf = trip?.trip_context?.quick_facts;
              const emergencyFact = qf?.emergency
                ? `${qf.emergency}${callingCode ? ` (${callingCode})` : ''} · Emergency`
                : undefined;
              const fmtTime = (iso: string) => {
                try {
                  const d = new Date(iso);
                  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                } catch { return ''; }
              };
              const sunriseFact = sunrise?.sunrise && sunrise?.sunset
                ? `\u2600\uFE0F ${fmtTime(sunrise.sunrise)} · \u{1F305} ${fmtTime(sunrise.sunset)}`
                : undefined;
              return (
                <>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px]"
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3)' }}>
                    {qf?.currency && <span className="text-white/80"><span className="font-semibold text-white">{qf.currency.split(' · ')[0]}</span>{qf.currency.includes(' · ') ? ` · ${qf.currency.split(' · ').slice(1).join(' · ')}` : ''}</span>}
                    {/* Interactive currency converter */}
                    {exchangeRate && !sameCurrency && destCode && (
                      <span className="text-white/80">
                        {convertEditing ? (
                          <input
                            type="number"
                            autoFocus
                            min={0}
                            step={1}
                            value={convertAmount}
                            onChange={(e) => setConvertAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            onBlur={() => { if (convertAmount === '' || Number(convertAmount) <= 0) setConvertAmount(1); setConvertEditing(false); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') setConvertEditing(false); }}
                            className="w-20 bg-white/20 rounded px-2 py-0.5 text-[13px] font-semibold text-white text-center border border-white/30 focus:outline-none focus:border-white/60"
                            style={{ textShadow: 'none' }}
                          />
                        ) : (
                          <button onClick={() => setConvertEditing(true)} className="font-semibold text-white underline decoration-dotted underline-offset-2 hover:text-[var(--magazine-accent)] transition-colors cursor-pointer" title="Click to change amount">
                            {convertAmount}
                          </button>
                        )}
                        {' '}{tripCurrency} · = {destCurrency?.symbol ?? ''}{(exchangeRate * (Number(convertAmount) || 0)).toFixed(2)} {destCode}
                      </span>
                    )}
                    {qf?.language && <span className="text-white/80"><span className="font-semibold text-white">{qf.language.split(' · ')[0]}</span></span>}
                    {qf?.timezone && <span className="text-white/80"><span className="font-semibold text-white">{qf.timezone.split(' · ')[0]}</span></span>}
                    {emergencyFact && <span className="text-white/80"><span className="font-semibold text-red-400">{emergencyFact.split(' · ')[0]}</span> · {emergencyFact.split(' · ').slice(1).join(' · ')}</span>}
                    {qf?.power && <span className="text-white/80"><span className="font-semibold text-white">{qf.power.split(' · ')[0]}</span></span>}
                    {aqi && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style={{
                          textShadow: 'none',
                          backgroundColor: aqi.aqi <= 50 ? 'rgba(34,197,94,0.25)' : aqi.aqi <= 100 ? 'rgba(234,179,8,0.25)' : 'rgba(239,68,68,0.25)',
                          border: `1px solid ${aqi.aqi <= 50 ? 'rgba(34,197,94,0.5)' : aqi.aqi <= 100 ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.5)'}`,
                          color: aqi.aqi <= 50 ? '#4ade80' : aqi.aqi <= 100 ? '#facc15' : '#f87171',
                        }}
                        title={`PM2.5: ${aqi.pm25 ?? '–'} · PM10: ${aqi.pm10 ?? '–'}`}
                      >
                        Air {aqi.level}
                      </span>
                    )}
                  </div>
                  <QuickFactRow facts={[qf?.transport, qf?.taxi, qf?.tipping, qf?.water]} />
                </>
              );
            })()}

            {/* Badges: Safety + Holidays */}
            {(safety?.score != null && safety.score > 0 || (tripHolidays && tripHolidays.length > 0)) && (
            <div className="flex items-center gap-2 flex-wrap" style={{ textShadow: 'none' }}>
              {safety && safety.score > 0 && (
                <SafetyBadge safety={safety} />
              )}
              {tripHolidays && tripHolidays.length > 0 && tripHolidays.map((h) => (
                <span key={h.date}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: 'rgba(234,179,8,0.2)', border: '1px solid rgba(234,179,8,0.4)', color: '#fbbf24' }}>
                  {h.name} · {new Date(h.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              ))}
            </div>
            )}

            {/* Weather + forecast + sunrise — only render row if there's real data */}
            {(typeof weather?.temp === 'number' || (forecast && forecast.length > 0) || (sunrise?.sunrise && sunrise?.sunset)) && (
            <div className="flex items-center gap-4 sm:gap-6 text-[12px] tracking-wider uppercase overflow-x-auto scrollbar-hide">
              {typeof weather?.temp === 'number' && (
                <span className="flex items-center gap-2 shrink-0 font-semibold" style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
                  <WeatherIcon size={16} />
                  <span className="font-bold">{fmtTemp(weather.temp)}</span>
                  {weather.conditions && <span className="text-[10px] normal-case" style={{ opacity: 0.7 }}>{weather.conditions}</span>}
                </span>
              )}
              {typeof weather?.temp === 'number' && forecast && forecast.length > 0 && (
                <span className="text-white/30">|</span>
              )}
              {forecast && forecast.length > 0 && (
                forecast.slice(0, 5).filter((d: any) => typeof d.high === 'number').map((d: any) => {
                  const day = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                  const icon = d.icon?.includes('rain') ? '\u{1F327}' : d.icon?.includes('cloud') ? '\u2601\uFE0F' : d.icon?.includes('snow') ? '\u2744\uFE0F' : '\u2600\uFE0F';
                  return (
                    <span key={d.date} className="flex items-center gap-1.5 shrink-0">
                      <span className="font-semibold text-white/60">{day}</span>
                      <span className="text-[14px]">{icon}</span>
                      <span className="font-bold text-white">{fmtTemp(d.high)}</span>
                    </span>
                  );
                })
              )}
              {sunrise?.sunrise && sunrise?.sunset && (
                <>
                  {(typeof weather?.temp === 'number' || (forecast && forecast.length > 0)) && <span className="text-white/30">|</span>}
                  <span className="flex items-center gap-3 shrink-0 text-white/80 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Sun size={12} className="text-amber-400 shrink-0" />
                      <span className="font-semibold text-white/50 normal-case text-[11px]">Rise</span>
                      <span className="font-bold text-white whitespace-nowrap">{(() => { try { return new Date(sunrise.sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return ''; } })()}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Sun size={12} className="text-orange-400 shrink-0" />
                      <span className="font-semibold text-white/50 normal-case text-[11px]">Set</span>
                      <span className="font-bold text-white whitespace-nowrap">{(() => { try { return new Date(sunrise.sunset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return ''; } })()}</span>
                    </span>
                  </span>
                </>
              )}
            </div>
            )}
            </div>

            {/* Wiki summary — frosted glass backdrop for readability */}
            {wiki?.extract && (
              <div className="rounded-xl px-4 py-3"
                style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                <p className="text-[13px] sm:text-[14px] leading-[1.7] text-white/90 font-serif line-clamp-3">
                  {wiki.extract}
                </p>
              </div>
            )}

          </div>{/* end collapsible */}
        </div>
      )}
    </>
  );
}
