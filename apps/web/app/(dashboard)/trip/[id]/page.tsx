'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';

/** Safely format a date string — returns '' if invalid */
function safeDate(d: string | null | undefined): string {
  if (!d) return '';
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d);
  if (isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
import Image from 'next/image';
import { Plus, ChevronLeft, ChevronRight, MapPin, Languages, UtensilsCrossed, Coffee, Beer, Bus, Droplets, Volume2, LayoutGrid, LayoutList } from 'lucide-react';
import { useItineraryScreen, useWeather, useEvents, upscaleGoogleImage, supabase, useHomeCurrency } from '@travyl/shared';
import { useQuery } from '@tanstack/react-query';
import type { TripContextData, PlaceItem } from '@travyl/shared';
import { AnimatePresence } from 'motion/react';
import { PlaceDetailOverlay } from '@/components/PlaceDetailOverlay';
import { TripExploreSection } from './trip-layout-inner';
import OverviewBudgetSummary from '@/components/trip/OverviewBudgetSummary';
import { useTripPreload } from '@/lib/preload/useTripPreload';

// Hide broken images — no misleading fallback photos
const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none';
};

// ── Hooks ─────────────────────────────────────────────────────

function useRevealOnScroll(ready: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ready) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    const children = el.querySelectorAll('.reveal-on-scroll, .reveal-scale');
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [ready]);
  return ref;
}


// ── Reusable components ─────────────────────────────────────

function AddToTripButton({ isAdded, onToggle }: { isAdded: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-300 w-fit border ${
        isAdded
          ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/10'
          : ''
      }`}
      style={!isAdded ? {
        color: 'var(--trip-base)',
        borderColor: 'color-mix(in srgb, var(--trip-base) 25%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--trip-base) 10%, transparent)',
      } : undefined}>
      {isAdded ? <span>✓ Added to trip</span> : <><Plus size={13} /><span>Add to trip</span></>}
    </button>
  );
}

const NEWS_COLORS: [string, string][] = [
  ['#1a1a2e', '#16213e'],
  ['#0f3460', '#1a1a2e'],
  ['#2c3e50', '#1a1a2e'],
  ['#1b2838', '#0f3460'],
];

// ── Sections ─────────────────────────────────────────────────

function ThingsToDoSection({ items, addedItems, onToggleAdd, onItemClick }: {
  items: NonNullable<TripContextData['explore_items']>;
  addedItems: Set<string>;
  onToggleAdd: (id: string) => void;
  onItemClick?: (item: NonNullable<TripContextData['explore_items']>[number]) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [gridView, setGridView] = useState(false);
  const [flush, setFlush] = useState(false);

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white font-serif">Things to Do</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-white/[0.06]">
          {!gridView && (
            <>
              <span className="text-[11px] tabular-nums mr-1 text-gray-500 dark:text-white/80">
                {activeIdx + 1} / {items.length}
              </span>
              <button onClick={() => { const i = Math.max(0, activeIdx - 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === 0}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20 border border-gray-200 dark:border-white/[0.12]">
                <ChevronLeft size={14} className="text-gray-600 dark:text-white" />
              </button>
              <button onClick={() => { const i = Math.min(items.length - 1, activeIdx + 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === items.length - 1}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20 border border-gray-200 dark:border-white/[0.12]">
                <ChevronRight size={14} className="text-gray-600 dark:text-white" />
              </button>
            </>
          )}
        </div>
      </div>

      {!gridView ? (
        <>
          {/* Horizontal scroll cards — one card at a time, full width */}
          <div ref={scrollRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
            onScroll={(e) => {
              const el = e.currentTarget;
              const idx = Math.round(el.scrollLeft / (el.firstElementChild as HTMLElement)?.offsetWidth || 0);
              setActiveIdx(Math.min(idx, items.length - 1));
            }}>
            {items.map((item) => {
              const imgSrc = upscaleGoogleImage(item.image) || item.image || '';
              return (
                <div key={item.id} onClick={() => onItemClick?.(item)} className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start cursor-pointer" style={{ height: 360 }}>
                  {imgSrc ? <Image src={imgSrc} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 800px" onError={handleImgError} /> : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="text-[9px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full backdrop-blur-md bg-black/30 text-white border border-white/20">
                      {item.category}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-lg font-normal text-white leading-tight mb-1 font-serif">{item.title}</h3>
                    <p className="text-[12px] text-white/60 mb-3 line-clamp-2">{item.description}</p>
                    <AddToTripButton isAdded={addedItems.has(item.id)} onToggle={() => onToggleAdd(item.id)} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Dot indicators */}
          <div className="flex items-center gap-1.5 mt-3">
            {items.map((_, i) => (
              <button key={i} onClick={() => { setActiveIdx(i); scrollTo(i); }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === activeIdx ? 16 : 5, height: 5,
                  backgroundColor: i === activeIdx ? 'var(--trip-base)' : 'rgba(0,0,0,0.15)',
                }} />
            ))}
          </div>
        </>
      ) : (
        /* Grid view */
        <div className={`grid gap-3 ${flush ? 'grid-cols-2 sm:grid-cols-3' : ''}`}
          style={!flush ? { columns: '2 280px', columnGap: '0.75rem' } : undefined}>
          {items.filter(item => item.image).map((item) => {
            const upscaled = upscaleGoogleImage(item.image) || item.image;
            return (
            <div key={item.id} onClick={() => onItemClick?.(item)}
              className={`relative rounded-xl overflow-hidden cursor-pointer group ${flush ? '' : 'break-inside-avoid mb-3'}`}
              style={flush ? { height: 280 } : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={upscaled} alt={item.title} onError={handleImgError}
                className={`w-full object-cover group-hover:scale-105 transition-transform duration-500 ${flush ? 'h-full' : ''}`}
                style={!flush ? { minHeight: 200 } : undefined} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute top-2 left-2">
                <span className="text-[8px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full backdrop-blur-md bg-black/30 text-white border border-white/20">
                  {item.category}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-sm font-normal text-white leading-tight font-serif">{item.title}</h3>
              </div>
            </div>
          )})}
        </div>
      )}
    </section>
  );
}

function NewsSection({ news }: { news: NonNullable<TripContextData['news']> }) {
  const newsItems = news.filter(n => n.category === 'news' || n.category === 'advisory');
  if (newsItems.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white mb-4 font-serif">News</h2>

      {/* Scrollable news list capped to match What's Going On card height */}
      <div className="max-h-[360px] overflow-y-auto scrollbar-hide pr-1">
        <div className="divide-y divide-gray-200 dark:divide-white/[0.08]">
          {newsItems.map((item) => (
            <a key={item.id} href={item.url || '#'} target="_blank" rel="noopener noreferrer"
              className="flex gap-3 py-3.5 first:pt-0 hover:opacity-80 transition-opacity">
              {(item as any).image && (
                <div className="relative flex-shrink-0 w-[72px] h-[54px] rounded-lg overflow-hidden bg-gray-800">
                  <Image src={upscaleGoogleImage((item as any).image) || (item as any).image} alt="" fill className="object-cover" sizes="72px" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[color:var(--trip-base)]">{item.category}</span>
                  {item.source && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[color:var(--trip-base)] opacity-50">· {item.source}</span>
                  )}
                </div>
                <h3 className="text-[14px] font-normal leading-snug mb-0.5 line-clamp-2 text-gray-900 dark:text-white font-serif">{item.title}</h3>
                <p className="text-[12px] leading-relaxed line-clamp-1 text-gray-600 dark:text-gray-400 opacity-60">{item.snippet}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatsGoingOnSection({ addedItems, onToggleAdd, exploreItems, heroImages }: {
  addedItems: Set<string>;
  onToggleAdd: (id: string) => void;
  exploreItems: NonNullable<TripContextData['explore_items']>;
  heroImages?: string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const events = exploreItems.slice(0, 6);

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  if (events.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white font-serif">What&apos;s Going On</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-white/[0.06]">
          <span className="text-[11px] tabular-nums mr-1 text-gray-500 dark:text-white/80">
            {activeIdx + 1} / {events.length}
          </span>
          <button onClick={() => { const i = Math.max(0, activeIdx - 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === 0}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20 border border-gray-200 dark:border-white/[0.12]">
            <ChevronLeft size={14} className="text-gray-600 dark:text-white" />
          </button>
          <button onClick={() => { const i = Math.min(events.length - 1, activeIdx + 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === events.length - 1}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20 border border-gray-200 dark:border-white/[0.12]">
            <ChevronRight size={14} className="text-gray-600 dark:text-white" />
          </button>
        </div>
      </div>

      <div ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        onScroll={(e) => {
          const el = e.currentTarget;
          const cardWidth = (el.firstElementChild as HTMLElement)?.offsetWidth || 1;
          const idx = Math.round(el.scrollLeft / (cardWidth + 12));
          setActiveIdx(Math.min(idx, events.length - 1));
        }}>
        {events.map((item, i) => {
          const rawImg = item.image || '';
          // Skip low-res Google proxy thumbnails — use hero images as fallback instead
          const isLowRes = rawImg.includes('encrypted-tbn') || rawImg.includes('news.google.com/api') || (rawImg.includes('googleusercontent') && rawImg.includes('s100'));
          const bgImage = (rawImg && !isLowRes ? upscaleGoogleImage(rawImg) : null) || (heroImages?.[i % (heroImages?.length || 1)]);
          return (
            <div key={item.id}
              className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start"
              style={{ height: 300 }}>
              {bgImage ? (
                <>
                  <Image src={bgImage} alt={item.title} fill className="object-cover" style={{ objectPosition: 'center 30%' }} sizes="(max-width: 768px) 100vw, 800px" onError={handleImgError} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
                </>
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${NEWS_COLORS[i % NEWS_COLORS.length][0]}, ${NEWS_COLORS[i % NEWS_COLORS.length][1]})` }} />
              )}
              {/* Category badge */}
              <div className="absolute top-3 left-3">
                <span className="text-[9px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full backdrop-blur-md bg-black/30 text-white border border-white/20">
                  {item.category}
                </span>
              </div>
              {/* Content overlay on image */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-[15px] font-normal text-white leading-tight mb-0.5 line-clamp-2 font-serif">
                  {item.title}
                </h3>
                <p className="text-[11px] text-white/60 leading-snug line-clamp-1 mb-2">{item.description}</p>
                <AddToTripButton isAdded={addedItems.has(item.id)} onToggle={() => onToggleAdd(item.id)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-1.5 mt-3">
        {events.map((_, i) => (
          <button key={i} onClick={() => { setActiveIdx(i); scrollTo(i); }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeIdx ? 16 : 5, height: 5,
              backgroundColor: i === activeIdx ? 'var(--trip-base)' : 'rgba(0,0,0,0.15)',
            }} />
        ))}
      </div>
    </section>
  );
}

// ── Nearby Cities Section ─────────────────────────────────────
function NearbyCitiesSection({ cities }: { cities: NonNullable<TripContextData['nearby_cities']> }) {
  if (!cities.length) return null;
  return (
    <section>
      <h3 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white mb-4 font-serif">Also Consider Visiting</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cities.map((city) => (
          <div key={city.id} className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm p-4 transition-all hover:scale-[1.02]">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={12} className="text-[color:var(--trip-base)]" />
              <span className="text-[14px] font-normal text-gray-900 dark:text-white font-serif">{city.name}</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 opacity-60">{city.country}</p>
            <p className="text-[11px] font-semibold mt-1 text-[color:var(--trip-base)]">{Math.round(city.distance)} km away</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Cost of Living Section ────────────────────────────────────
function CostOfLivingSection({ cost, localCurrency }: { cost: NonNullable<TripContextData['cost_of_living']>; localCurrency?: string }) {
  const { currency: homeCurrency, format, isLoading } = useHomeCurrency();
  const code = localCurrency || cost.currency || 'USD';
  const needsConversion = !!(localCurrency && localCurrency !== homeCurrency && !isLoading);

  const fmtLocal = (v: number) => {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    } catch { return `${code} ${v.toFixed(2)}`; }
  };

  const fmtConverted = (v: number) => {
    if (needsConversion) return format(v, localCurrency!);
    return fmtLocal(v);
  };

  const items = [
    { icon: UtensilsCrossed, label: 'Budget meal', value: fmtConverted(cost.meal_cheap), raw: cost.meal_cheap },
    { icon: UtensilsCrossed, label: 'Mid-range meal', value: fmtConverted(cost.meal_mid), raw: cost.meal_mid },
    { icon: Coffee, label: 'Coffee', value: fmtConverted(cost.coffee), raw: cost.coffee },
    { icon: Beer, label: 'Beer', value: fmtConverted(cost.beer), raw: cost.beer },
    { icon: Bus, label: 'Public transport', value: fmtConverted(cost.public_transport), raw: cost.public_transport },
    { icon: Droplets, label: 'Water bottle', value: fmtConverted(cost.water_bottle), raw: cost.water_bottle },
  ];

  const headingSuffix = needsConversion
    ? ` · in ${homeCurrency}`
    : isLoading && localCurrency
      ? ' · loading rates...'
      : '';

  return (
    <section>
      <h3 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white mb-4 font-serif">Cost Per Diem{headingSuffix}</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {items.map(({ icon: Icon, label, value, raw }) => (
          <div key={label} className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm p-3 text-center">
            <Icon size={16} className="mx-auto mb-1.5 text-[color:var(--trip-base)]" />
            <p className="text-[15px] font-bold text-gray-900 dark:text-white">{value}</p>
            {needsConversion && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">≈{fmtLocal(raw)}</p>
            )}
            <p className="text-[10px] text-gray-600 dark:text-gray-400 opacity-50">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm">
        {[
          { label: 'Budget', range: fmtConverted(cost.daily_budget_low), raw: cost.daily_budget_low },
          { label: 'Mid-range', range: fmtConverted(cost.daily_budget_mid), raw: cost.daily_budget_mid },
          { label: 'Luxury', range: fmtConverted(cost.daily_budget_high), raw: cost.daily_budget_high },
        ].map(({ label, range, raw }, i) => (
          <div key={label} className="flex-1 py-3 text-center" style={i < 2 ? { borderRight: '1px solid rgba(0,0,0,0.08)' } : undefined}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1 text-gray-900 dark:text-white opacity-40">{label}</p>
            <p className="text-[16px] font-bold text-[color:var(--trip-base)]">{range}<span className="text-[11px] font-normal opacity-60">/day</span></p>
            {needsConversion && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">≈{fmtLocal(raw)}/day</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Phrases / Translations Section ───────────────────────────
function PhrasesSection({ phrases, language }: { phrases: Record<string, string>; language?: string }) {
  const allEntries = Object.entries(phrases);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!allEntries.length) return null;

  const entries = showAll ? allEntries : allEntries.slice(0, 6);

  // Map common language names to BCP-47 codes for TTS
  const langMap: Record<string, string> = {
    japanese: 'ja', french: 'fr', spanish: 'es', italian: 'it', german: 'de',
    portuguese: 'pt', chinese: 'zh', korean: 'ko', arabic: 'ar', hindi: 'hi',
    thai: 'th', vietnamese: 'vi', turkish: 'tr', greek: 'el', dutch: 'nl',
    swedish: 'sv', norwegian: 'no', polish: 'pl', russian: 'ru',
  };
  const langCode = language ? langMap[language.toLowerCase()] || language.slice(0, 2).toLowerCase() : '';

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    setSpeaking(text);
    window.speechSynthesis.cancel();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.lang.toLowerCase().startsWith(langCode))
        || voices.find(v => v.lang.toLowerCase().includes(langCode));
      if (match) utterance.voice = match;
      utterance.rate = 0.85;
      utterance.onend = () => setSpeaking(null);
      utterance.onerror = () => setSpeaking(null);
      window.speechSynthesis.speak(utterance);
    };

    // Voices load async — wait for them if needed
    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { doSpeak(); window.speechSynthesis.onvoiceschanged = null; };
      // Fallback if event never fires
      setTimeout(doSpeak, 200);
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Languages size={14} className="text-[color:var(--trip-base)]" />
        <h3 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white font-serif">Essential Phrases</h3>
        {language && <span className="text-xs font-medium text-gray-500 dark:text-gray-400">({language})</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entries.map(([english, translated]) => (
          <button key={english}
            onClick={() => speak(translated)}
            className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm px-4 py-3 text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group">
            <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400 opacity-60 flex-1">{english}</span>
            <span className="text-[13px] font-bold text-[color:var(--trip-base)]">{translated}</span>
            <Volume2
              size={14}
              className={`shrink-0 transition-all ${speaking === translated ? 'animate-pulse text-[color:var(--trip-base)]' : 'text-gray-900 dark:text-white opacity-30 group-hover:opacity-70'}`}
            />
          </button>
        ))}
      </div>
      {allEntries.length > 6 && (
        <button onClick={() => setShowAll(v => !v)} className="mt-2 text-[11px] font-medium hover:underline text-[color:var(--trip-base)]">
          {showAll ? 'Show less' : `Show ${allEntries.length - 6} more phrases`}
        </button>
      )}
    </section>
  );
}


// ── Main Page ────────────────────────────────────────────────

/** Check if trip_context needs enrichment (missing key overview fields) */
function needsEnrichment(ctx: TripContextData | undefined | null): boolean {
  if (!ctx) return true;
  // Missing any key overview field triggers re-enrichment
  return !ctx.wiki || !ctx.quick_facts || !ctx.explore_items?.length
    || !ctx.phrases || !ctx.cost_of_living || !ctx.news?.length || !ctx.cuisine?.length;
}

export default function TripOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, isLoading, refetch } = useItineraryScreen(id);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [isMagazine, setIsMagazine] = useState(false);
  const enrichAttempted = useRef(false);
  const revealRef = useRevealOnScroll(!!trip);

  // Detect magazine layout for per-section glass card styling
  useEffect(() => {
    const check = () => setIsMagazine(localStorage.getItem('travyl-layout-mode') === 'magazine');
    check();
    window.addEventListener('layout-mode-change', check);
    window.addEventListener('storage', check);
    return () => { window.removeEventListener('layout-mode-change', check); window.removeEventListener('storage', check); };
  }, []);

  // Auto-enrich: if trip exists but trip_context is incomplete, trigger enrichment and poll
  const autoEnrich = useCallback(async () => {
    if (!trip || !trip.destination || enrichAttempted.current) return;
    if (!needsEnrichment(trip.trip_context)) return;
    if (trip.id?.startsWith('local-')) return;

    enrichAttempted.current = true;
    setEnriching(true);
    try {
      const res = await fetch('/api/trips/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: trip.id }),
      });
      if (res.ok) {
        // Enrichment succeeded — refetch trip data
        await refetch();
      }
    } catch {
      // Enrichment failed — allow retry on next visit
      enrichAttempted.current = false;
    } finally {
      setEnriching(false);
    }
  }, [trip, refetch]);

  useEffect(() => { autoEnrich(); }, [autoEnrich]);

  // news is computed below after liveNews is declared

  // Log user actions to trip_context.user_history for the History panel
  const logAction = useCallback(async (action: string) => {
    if (!trip) return;
    const existing = ((trip.trip_context as any)?.user_history ?? []) as any[];
    const entry = { action, timestamp: new Date().toISOString(), actor: 'You' };
    const history = [entry, ...existing].slice(0, 50); // keep last 50
    const ctx = { ...(trip.trip_context ?? {}), user_history: history };
    await supabase.from('trips').update({ trip_context: ctx }).eq('id', id);
  }, [trip, id]);

  const toggleAdd = (itemId: string) => {
    setAddedItems((prev) => {
      const next = new Set(prev);
      const isAdding = !next.has(itemId);
      if (isAdding) next.add(itemId);
      else next.delete(itemId);

      // Find the item name for the history log
      const allItems = [...(exploreItems || []), ...(restaurantData || [])];
      const item = allItems.find((i: any) => i.id === itemId);
      const name = item?.title || item?.name || 'item';
      logAction(isAdding ? `Added "${name}" to trip` : `Removed "${name}" from trip`);

      return next;
    });
  };

  // Fetch fresh "things to do" and events on each visit using trip coordinates
  // IMPORTANT: hooks must be called before any early return
  const tripCity = trip?.destination?.split(',')[0]?.trim();
  const tripCountryName = trip?.trip_context?.country?.name
    || trip?.destination?.split(',').slice(1).join(',').trim()
    || '';

  // ── Tier 1 hooks: weather, events ──
  const { data: weatherData } = useWeather(tripCity || '');
  const { data: tier1Events } = useEvents({
    city: tripCity || '',
    country: tripCountryName,
    startDate: trip?.start_date,
    endDate: trip?.end_date,
  });

  // Rotate explore queries each session for variety
  const [exploreOffset] = useState(() => Math.floor(Math.random() * 6));
  const exploreLat = trip?.trip_context?.lat;
  const exploreLng = trip?.trip_context?.lng;
  const { data: liveExploreItems } = useQuery({
    queryKey: ['trip-explore', trip?.id, tripCity, exploreLat, exploreLng],
    queryFn: async () => {
      if (!tripCity) return [];
      // Broad queries — the API returns whatever categories exist for this destination
      const allQueries = [
        `${tripCity} things to do`,
        `${tripCity} restaurants food`,
        `${tripCity} nightlife bars clubs`,
        `${tripCity} shopping markets`,
        `${tripCity} hidden gems`,
        `${tripCity} outdoor activities`,
        `${tripCity} entertainment shows`,
        `${tripCity} local favorites`,
      ];
      // Pick 6 starting from random offset
      const queries = Array.from({ length: 6 }, (_, i) => allQueries[(exploreOffset + i) % allQueries.length]);
      const coordParams = exploreLat && exploreLng ? `&lat=${exploreLat}&lng=${exploreLng}` : '';
      const results = await Promise.all(
        queries.map(async (q) => {
          const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&limit=6${coordParams}`);
          if (!res.ok) return [];
          return res.json();
        })
      );
      const seen = new Set<string>();
      const all = results.flat().filter((p: any) => {
        if (!p.name || seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      });
      // Shuffle for variety
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      return all.slice(0, 20).map((p: any) => ({
        id: p.id, title: p.name,
        description: p.description || p.category || '',
        category: p.category || '',
        image: upscaleGoogleImage(p.images?.[0] || p.image) || p.image || '',
        tags: p.tags,
      }));
    },
    enabled: !!tripCity && !enriching,
    staleTime: 10 * 60 * 1000,
  });

  const tripCountry = trip?.destination?.split(',').slice(1).join(',').trim() || '';

  const { data: liveEvents } = useQuery({
    queryKey: ['trip-events', trip?.id, tripCity],
    queryFn: async () => {
      if (!tripCity) return [];
      const params = new URLSearchParams({ city: tripCity });
      if (trip?.start_date) params.set('start', trip.start_date);
      if (trip?.end_date) params.set('end', trip.end_date);
      // Try new events/search endpoint first (doesn't require both dates)
      const searchParams = new URLSearchParams({ city: tripCity! });
      if (trip?.start_date) searchParams.set('start_date', trip.start_date);
      if (trip?.end_date) searchParams.set('end_date', trip.end_date);
      if (tripCountry) searchParams.set('country', tripCountry);
      const res = await fetch(`/api/events/search?${searchParams}`);
      if (!res.ok) return [];
      const evts = await res.json();
      if (!Array.isArray(evts)) return [];
      return evts.map((e: any) => ({
        id: e.id, title: e.name || e.title,
        description: `${safeDate(e.date)} ${e.venue ? '· ' + e.venue : ''}`.trim() || e.description || '',
        category: e.category, image: e.photo_url || e.image || '',
      }));
    },
    enabled: !!tripCity && !enriching,
    staleTime: 5 * 60 * 1000,
  });

  // ── Direct fallback fetches for sections that enrichment often misses ──
  const tripCountryShort = tripCountryName.split(',')[0]?.trim() || '';

  const { data: liveNews } = useQuery({
    queryKey: ['trip-news', tripCity],
    queryFn: async () => {
      const res = await fetch(`/api/news?destination=${encodeURIComponent(tripCity!)}&limit=8`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tripCity && !enriching && !(trip?.trip_context?.news?.length),
    staleTime: 30 * 60 * 1000,
  });

  const news: NonNullable<TripContextData['news']> = trip?.trip_context?.news?.length ? trip.trip_context.news : (liveNews ?? []);

  // Fetch real restaurants near the destination — replaces static cuisine dishes
  const destLat = trip?.trip_context?.lat;
  const destLng = trip?.trip_context?.lng;
  const { data: liveRestaurants } = useQuery({
    queryKey: ['trip-restaurants', trip?.id, destLat, destLng],
    queryFn: async () => {
      if (!destLat || !destLng) return [];
      const res = await fetch(`/api/places?lat=${destLat}&lng=${destLng}&category=restaurant&limit=8`);
      if (!res.ok) return [];
      const data = await res.json();
      return (Array.isArray(data) ? data : []).filter((r: any) => r.image);
    },
    enabled: !!destLat && !!destLng && !enriching,
    staleTime: 30 * 60 * 1000,
  });

  const { data: livePhrases } = useQuery({
    queryKey: ['trip-phrases', tripCountryShort],
    queryFn: async () => {
      const res = await fetch(`/api/translate?lang=${encodeURIComponent(tripCountryShort)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data?.phrases ?? null;
    },
    enabled: !!tripCountryShort && !enriching && !trip?.trip_context?.phrases,
    staleTime: 60 * 60 * 1000,
  });

  const { data: liveCostOfLiving } = useQuery({
    queryKey: ['trip-cost', tripCity, tripCountryShort],
    queryFn: async () => {
      const res = await fetch(`/api/costliving?city=${encodeURIComponent(tripCity!)}&country=${encodeURIComponent(tripCountryShort)}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!tripCity && !!tripCountryShort && !enriching && !trip?.trip_context?.cost_of_living,
    staleTime: 60 * 60 * 1000,
  });

  // Use live data if available, fall back to trip_context — upscale all images
  const hiRes = (url: string | undefined) => upscaleGoogleImage(url) || url || '';
  const exploreItems = (liveExploreItems?.length ? liveExploreItems : trip?.trip_context?.explore_items?.map((e: any) => ({ ...e, image: hiRes(e.image) }))) || [];
  const events = (liveEvents?.length ? liveEvents : trip?.trip_context?.events?.map((e: any) => ({
    id: e.id, title: e.title,
    description: `${safeDate(e.date)} ${e.venue ? '· ' + e.venue : ''}`.trim() || e.description || '',
    category: e.category, image: hiRes(e.image),
  }))) || [];

  // Background preload for flights/hotels/cars + image warming. Self-throttling,
  // skips on slow networks. Visible-on-overview images (hero + explore) are
  // queued first; flights/hotels/cars images are warmed once their searches
  // return. Hook order is stable — calls every render before any early return.
  useTripPreload({
    tripId: id,
    trip: trip ?? null,
    overviewImages: [
      ...(trip?.trip_context?.hero_images ?? []),
      ...(exploreItems as Array<{ image?: string }>).map((e) => e.image),
      ...(events as Array<{ image?: string }>).map((e) => e.image),
    ],
  });

  if (isLoading || enriching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-8 h-8 border-3 border-gray-200 border-t-[#1e3a5f] rounded-full animate-spin" />
        <div className="text-sm text-gray-500 font-medium">
          {enriching ? 'Building your trip overview...' : 'Loading trip...'}
        </div>
        {enriching && (
          <p className="text-xs text-gray-400 max-w-xs text-center">
            Finding things to do, local cuisine, events, and more for your destination
          </p>
        )}
      </div>
    );
  }

  const hasExploreItems = exploreItems.length > 0;
  const ctxRestaurants = (trip?.trip_context?.restaurants as any[] | undefined)?.filter((r: any) => r.image).map((r: any) => ({ ...r, image: hiRes(r.image) })) ?? [];
  const restaurantData = ctxRestaurants.length > 0 ? ctxRestaurants : (liveRestaurants ?? []);
  const hasRestaurants = restaurantData.length > 0;
  const phrasesData = trip?.trip_context?.phrases ?? livePhrases;
  const costData = trip?.trip_context?.cost_of_living ?? liveCostOfLiving;
  const hasNewsArticles = news.some(n => n.category === 'news' || n.category === 'advisory');

  // Merge tier1Events (from useEvents hook → TRA-436 aggregated API) into display
  const tier1EventsMapped = (tier1Events || []).map((e) => ({
    id: e.id,
    title: e.name,
    description: `${safeDate(e.date)} ${e.venue ? '· ' + e.venue : ''}`.trim() || e.description || '',
    category: e.category || 'Event',
    image: hiRes(e.photo_url ?? undefined),
  }));
  // Fallback: use explore_items that AREN'T already in "Things to Do" (which shows the first items)
  // Take from the back half of the list to avoid duplicates
  const exploreFallback = exploreItems.length > 2
    ? exploreItems.slice(-Math.min(6, exploreItems.length)).map((e: any) => ({
        id: e.id || e.name,
        title: e.title || e.name,
        description: e.description || e.category || '',
        category: e.category || 'Attraction',
        image: hiRes(e.image),
      }))
    : [];
  // Priority: live events → tier1 events → trip_context events → explore_items fallback
  const allEvents = events.length > 0 ? events
    : tier1EventsMapped.length > 0 ? tier1EventsMapped
    : exploreFallback;

  const sectionCard = isMagazine ? 'bg-white/85 backdrop-blur-xl rounded-2xl p-5' : '';

  return (
    <div className="relative overflow-hidden">
      {/* Header image bleeds down naturally from TripMagazineHero — no separate background needed */}
      <div className="relative z-10">
        <div ref={revealRef}>

          {/* Weather is now shown in the compact header toggle — removed duplicate widget */}

          {/* ── Row 1: Things to Do (left) + Restaurants (right) ── */}
          <div className={`mt-6 ${sectionCard}`}>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Things to Do — fills left column */}
              <div className="flex-1 min-w-0">
                {hasExploreItems && (
                  <ThingsToDoSection items={exploreItems} addedItems={addedItems} onToggleAdd={toggleAdd}
                    onItemClick={(item) => setSelectedPlace({
                      id: item.id, name: item.title, image: item.image || '', type: 'attraction',
                      rating: 0, tagline: item.description, category: item.category,
                      description: item.description, tags: item.tags,
                      latitude: trip?.trip_context?.lat, longitude: trip?.trip_context?.lng,
                    })} />
                )}
              </div>

              {/* Must-Try Restaurants — real places with photos, ratings, addresses */}
              {hasRestaurants && (
                <div className="shrink-0 w-full lg:w-[380px]">
                  <div className="mb-4">
                    <h3 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white font-serif">Must-Try Restaurants</h3>
                  </div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                    {restaurantData.slice(0, 6).map((r: any) => (
                      <div key={r.id} className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start cursor-pointer group" style={{ height: 360 }}
                        onClick={() => setSelectedPlace({
                          id: r.id, name: r.name, image: r.image || '', type: 'restaurant',
                          images: r.images?.length ? r.images : r.image ? [r.image] : [],
                          rating: r.rating || 0, tagline: r.tagline || r.category || '',
                          category: r.category || 'Restaurant', description: r.description || '',
                          tags: r.tags || [], latitude: r.latitude, longitude: r.longitude,
                          address: r.address, website: r.website, reviewCount: r.reviewCount,
                          phone: r.phone, hours: r.hours, priceLevel: r.priceLevel,
                        })}>
                        <Image src={upscaleGoogleImage(r.image) || r.image} alt={r.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="380px" onError={handleImgError} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        {/* Add to trip button */}
                        <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                          <AddToTripButton isAdded={addedItems.has(r.id)} onToggle={() => toggleAdd(r.id)} />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          {r.rating > 0 && (
                            <div className="flex items-center gap-1 mb-1.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                              <span className="text-[12px] font-semibold text-white/80">{r.rating}</span>
                              {r.reviewCount && <span className="text-[10px] text-white/40">({r.reviewCount.toLocaleString()})</span>}
                            </div>
                          )}
                          <h3 className="text-lg font-normal text-white leading-tight font-serif">{r.name}</h3>
                          {(r.tagline || r.address) && (
                            <p className="text-[11px] text-white/50 mt-1 line-clamp-1">{r.tagline || r.address}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Row 2: News (left) + What's Going On (right) ── */}
          {(hasNewsArticles || allEvents.length > 0) && (
            <div className={`relative z-10 mt-8 ${sectionCard}`}>
              <div className="flex flex-col lg:flex-row gap-6">
                {hasNewsArticles && (
                  <div className="flex-1 min-w-0">
                    <NewsSection news={news} />
                  </div>
                )}
                {allEvents.length > 0 && (
                  <div className="flex-1 min-w-0">
                    <WhatsGoingOnSection exploreItems={allEvents} addedItems={addedItems} onToggleAdd={toggleAdd} heroImages={trip?.trip_context?.hero_images} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Row 3: Phrases + Cost of Living ── */}
          {(phrasesData || costData) && (
            <div className={`relative z-10 mt-8 ${sectionCard}`}>
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {phrasesData && Object.keys(phrasesData).length > 0 && (
                  <div className="flex-1 min-w-0">
                    <PhrasesSection phrases={phrasesData as any} language={trip?.trip_context?.country?.language} />
                  </div>
                )}
                {costData && (
                  <div className="flex-1 min-w-0">
                    <CostOfLivingSection cost={costData} localCurrency={trip?.trip_context?.country?.currency?.code} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Row 3.5: Budget Summary ── */}
          <div className="mt-8">
            <OverviewBudgetSummary trip={trip} />
          </div>

          {/* ── Row 4: Nearby Cities ── */}
          {trip?.trip_context?.nearby_cities && trip.trip_context.nearby_cities.length > 0 && (
            <div className={`mt-8 ${sectionCard}`}>
              <NearbyCitiesSection cities={trip.trip_context.nearby_cities} />
            </div>
          )}

        </div>
      </div>

      <div className="h-4" />

      {/* Detail overlay — same as Places page */}
      <AnimatePresence>
        {selectedPlace && (
          <PlaceDetailOverlay
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            minimal
          />
        )}
      </AnimatePresence>
    </div>
  );
}
