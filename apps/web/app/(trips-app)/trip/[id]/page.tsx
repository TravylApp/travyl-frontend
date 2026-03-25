'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, MapPin, DollarSign, Bike, Zap, Globe, Languages, UtensilsCrossed, Coffee, Beer, Bus, Droplets, Volume2 } from 'lucide-react';
import { useItineraryScreen } from '@travyl/shared';
import { useQuery } from '@tanstack/react-query';
import type { TripContextData, PlaceItem } from '@travyl/shared';
import { PlaceDetailModal } from '@/components/trip/PlaceDetailModal';

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
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-300 backdrop-blur-sm w-fit"
      style={{
        color: isAdded ? 'var(--magazine-success)' : 'var(--magazine-accent)',
        border: `1px solid ${isAdded ? 'rgba(52,211,153,0.25)' : 'rgba(200,169,106,0.25)'}`,
        backgroundColor: isAdded ? 'rgba(52,211,153,0.1)' : 'rgba(200,169,106,0.1)',
      }}>
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
          <span className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-2 px-2.5 py-1 rounded-full backdrop-blur-md"
            style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.25)' }}>Explore</span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Things to Do</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <span className="text-[11px] tabular-nums mr-1 text-white/80">
            {activeIdx + 1} / {items.length}
          </span>
          <button onClick={() => { const i = Math.max(0, activeIdx - 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === 0}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
            style={{ border: '1px solid rgba(255,255,255,0.3)' }}>
            <ChevronLeft size={14} className="text-white" />
          </button>
          <button onClick={() => { const i = Math.min(items.length - 1, activeIdx + 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === items.length - 1}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
            style={{ border: '1px solid rgba(255,255,255,0.3)' }}>
            <ChevronRight size={14} className="text-white" />
          </button>
        </div>
      </div>

      {/* Horizontal scroll cards — one card at a time, full width */}
      <div ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        onScroll={(e) => {
          const el = e.currentTarget;
          const idx = Math.round(el.scrollLeft / (el.firstElementChild as HTMLElement)?.offsetWidth || 0);
          setActiveIdx(Math.min(idx, items.length - 1));
        }}>
        {items.map((item) => (
          <div key={item.id} onClick={() => onItemClick?.(item)} className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start cursor-pointer" style={{ height: 360 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt={item.title} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute top-3 left-3">
              <span className="text-[9px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full backdrop-blur-md"
                style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.2)' }}>
                {item.category}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="text-lg font-bold text-white leading-tight mb-1 font-serif">{item.title}</h3>
              <p className="text-[12px] text-white/60 mb-3 line-clamp-2">{item.description}</p>
              <AddToTripButton isAdded={addedItems.has(item.id)} onToggle={() => onToggleAdd(item.id)} />
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-1.5 mt-3">
        {items.map((_, i) => (
          <button key={i} onClick={() => { setActiveIdx(i); scrollTo(i); }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeIdx ? 16 : 5, height: 5,
              backgroundColor: i === activeIdx ? 'var(--magazine-accent)' : 'var(--magazine-border)',
            }} />
        ))}
      </div>
    </section>
  );
}

function NewsSection({ news }: { news: NonNullable<TripContextData['news']> }) {
  const newsItems = news.filter(n => n.category === 'news' || n.category === 'advisory');
  if (newsItems.length === 0) return null;

  return (
    <section>
      <span className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-2 px-2.5 py-1 rounded-full backdrop-blur-md"
        style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.25)' }}>Latest</span>
      <h2 className="text-2xl sm:text-3xl font-bold font-serif mb-4"
        style={{ color: 'var(--magazine-heading)' }}>News</h2>

      {/* Scrollable news list capped to match What's Going On card height */}
      <div className="max-h-[360px] overflow-y-auto scrollbar-hide pr-1">
        <div className="divide-y" style={{ borderColor: 'var(--magazine-border, rgba(0,0,0,0.08))' }}>
          {newsItems.map((item) => (
            <a key={item.id} href={item.url || '#'} target="_blank" rel="noopener noreferrer"
              className="block py-3.5 first:pt-0 hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider font-bold"
                  style={{ color: 'var(--magazine-accent)' }}>{item.category}</span>
                {item.source && (
                  <span className="text-[10px] uppercase tracking-wider font-bold"
                    style={{ color: 'var(--magazine-accent)', opacity: 0.5 }}>· {item.source}</span>
                )}
              </div>
              <h3 className="text-[14px] font-bold leading-snug mb-0.5 line-clamp-2"
                style={{ color: 'var(--magazine-heading)' }}>{item.title}</h3>
              <p className="text-[12px] leading-relaxed line-clamp-1"
                style={{ color: 'var(--magazine-text)', opacity: 0.6 }}>{item.snippet}</p>
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
          <span className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-2 px-2.5 py-1 rounded-full backdrop-blur-md"
            style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.25)' }}>What&apos;s Happening</span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif"
            style={{ color: 'var(--magazine-heading)' }}>What&apos;s Going On</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md"
          style={{ backgroundColor: 'var(--magazine-bg, rgba(245,240,235,0.85))' }}>
          <span className="text-[11px] tabular-nums mr-1" style={{ color: 'var(--magazine-heading)' }}>
            {activeIdx + 1} / {events.length}
          </span>
          <button onClick={() => { const i = Math.max(0, activeIdx - 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === 0}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
            style={{ border: '1px solid var(--magazine-border)' }}>
            <ChevronLeft size={14} style={{ color: 'var(--magazine-heading)' }} />
          </button>
          <button onClick={() => { const i = Math.min(events.length - 1, activeIdx + 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === events.length - 1}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
            style={{ border: '1px solid var(--magazine-border)' }}>
            <ChevronRight size={14} style={{ color: 'var(--magazine-heading)' }} />
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
          const bgImage = item.image || (heroImages?.[i % (heroImages?.length || 1)]);
          return (
            <div key={item.id}
              className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start"
              style={{ height: 300 }}>
              {bgImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bgImage} alt={item.title} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 30%' }} />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.15) 60%, transparent 100%)' }} />
                </>
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${NEWS_COLORS[i % NEWS_COLORS.length][0]}, ${NEWS_COLORS[i % NEWS_COLORS.length][1]})` }} />
              )}
              {/* Category badge */}
              <div className="absolute top-3 left-3">
                <span className="text-[9px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full backdrop-blur-md"
                  style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.2)' }}>
                  {item.category}
                </span>
              </div>
              {/* Content overlay on image */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-[15px] font-bold text-white leading-tight mb-0.5 font-serif line-clamp-2">
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
              backgroundColor: i === activeIdx ? 'var(--magazine-accent)' : 'var(--magazine-border)',
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
      <span className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-2 px-2.5 py-1 rounded-full"
        style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.25)' }}>Day Trips</span>
      <h3 className="text-2xl font-bold font-serif mb-4" style={{ color: 'var(--magazine-heading)' }}>Also Consider Visiting</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cities.map((city) => (
          <div key={city.id} className="rounded-xl p-4 backdrop-blur-md transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--magazine-card-bg, rgba(255,255,255,0.08))', border: '1px solid var(--magazine-border, rgba(255,255,255,0.1))' }}>
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={12} style={{ color: 'var(--magazine-accent)' }} />
              <span className="text-[14px] font-bold" style={{ color: 'var(--magazine-heading)' }}>{city.name}</span>
            </div>
            <p className="text-[11px] opacity-60" style={{ color: 'var(--magazine-heading)' }}>{city.country}</p>
            <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--magazine-accent)' }}>{Math.round(city.distance)} km away</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Cost of Living Section ────────────────────────────────────
function CostOfLivingSection({ cost, currency }: { cost: NonNullable<TripContextData['cost_of_living']>; currency?: string }) {
  const symbol = currency || cost.currency || '$';
  const fmt = (v: number) => `${symbol}${v.toFixed(0)}`;
  const items = [
    { icon: UtensilsCrossed, label: 'Budget meal', value: fmt(cost.meal_cheap) },
    { icon: UtensilsCrossed, label: 'Mid-range meal', value: fmt(cost.meal_mid) },
    { icon: Coffee, label: 'Coffee', value: fmt(cost.coffee) },
    { icon: Beer, label: 'Beer', value: fmt(cost.beer) },
    { icon: Bus, label: 'Public transport', value: fmt(cost.public_transport) },
    { icon: Droplets, label: 'Water bottle', value: fmt(cost.water_bottle) },
  ];
  return (
    <section>
      <span className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-2 px-2.5 py-1 rounded-full"
        style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.25)' }}>Budget</span>
      <h3 className="text-2xl font-bold font-serif mb-4" style={{ color: 'var(--magazine-heading)' }}>Cost of Living</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl p-3 text-center backdrop-blur-md"
            style={{ backgroundColor: 'var(--magazine-card-bg, rgba(255,255,255,0.08))', border: '1px solid var(--magazine-border, rgba(255,255,255,0.1))' }}>
            <Icon size={16} className="mx-auto mb-1.5" style={{ color: 'var(--magazine-accent)' }} />
            <p className="text-[15px] font-bold" style={{ color: 'var(--magazine-heading)' }}>{value}</p>
            <p className="text-[10px] opacity-50" style={{ color: 'var(--magazine-heading)' }}>{label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--magazine-card-bg, rgba(255,255,255,0.08))', border: '1px solid var(--magazine-border, rgba(255,255,255,0.1))' }}>
        {[
          { label: 'Budget', range: fmt(cost.daily_budget_low) },
          { label: 'Mid-range', range: fmt(cost.daily_budget_mid) },
          { label: 'Luxury', range: fmt(cost.daily_budget_high) },
        ].map(({ label, range }, i) => (
          <div key={label} className="flex-1 py-3 text-center" style={i < 2 ? { borderRight: '1px solid var(--magazine-border, rgba(255,255,255,0.1))' } : undefined}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--magazine-heading)', opacity: 0.4 }}>{label}</p>
            <p className="text-[16px] font-bold" style={{ color: 'var(--magazine-accent)' }}>{range}<span className="text-[11px] font-normal opacity-60">/day</span></p>
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
    setSpeaking(text);
    // Use Google Translate TTS for natural-sounding pronunciation
    const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${langCode || 'ja'}&q=${encodeURIComponent(text)}`);
    audio.onended = () => setSpeaking(null);
    audio.onerror = () => {
      // Fallback to browser TTS
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find(v => v.lang.toLowerCase().startsWith(langCode));
        if (match) utterance.voice = match;
        utterance.rate = 0.85;
        utterance.onend = () => setSpeaking(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setSpeaking(null);
      }
    };
    audio.play().catch(() => {
      // If autoplay blocked, fall back to browser TTS
      audio.onerror?.(new Event('error'));
    });
  };

  return (
    <section>
      <span className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-2 px-2.5 py-1 rounded-full"
        style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.25)' }}>
        <Languages size={10} className="inline mr-1" />{language || 'Local Language'}
      </span>
      <h3 className="text-2xl font-bold font-serif mb-4" style={{ color: 'var(--magazine-heading)' }}>Essential Phrases</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {entries.map(([english, translated]) => (
          <button key={english}
            onClick={() => speak(translated)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 backdrop-blur-md text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer group"
            style={{ backgroundColor: 'var(--magazine-card-bg, rgba(255,255,255,0.08))', border: '1px solid var(--magazine-border, rgba(255,255,255,0.1))' }}>
            <span className="text-[12px] font-medium opacity-60 flex-1" style={{ color: 'var(--magazine-heading)' }}>{english}</span>
            <span className="text-[13px] font-bold" style={{ color: 'var(--magazine-accent)' }}>{translated}</span>
            <Volume2
              size={14}
              className={`shrink-0 transition-all ${speaking === translated ? 'animate-pulse' : 'opacity-30 group-hover:opacity-70'}`}
              style={{ color: speaking === translated ? 'var(--magazine-accent)' : 'var(--magazine-heading)' }}
            />
          </button>
        ))}
      </div>
      {allEntries.length > 6 && (
        <button onClick={() => setShowAll(v => !v)} className="mt-2 text-[11px] font-medium hover:underline" style={{ color: 'var(--magazine-accent)' }}>
          {showAll ? 'Show less' : `Show ${allEntries.length - 6} more phrases`}
        </button>
      )}
    </section>
  );
}

function upscalePhoto(url: string): string {
  if (url.includes('googleusercontent.com')) {
    return url.replace(/=w\d+-h\d+[^&]*/, '=w1200-h800-k-no');
  }
  return url;
}

function TripMosaic({ photos, destination }: { photos: string[]; destination?: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % photos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [photos]);

  return (
    <div className="-mx-5 -mt-16 relative overflow-hidden" style={{ height: 600 }}>
      {photos.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={upscalePhoto(src)}
          alt={destination || 'Trip photo'}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms]"
          style={{ opacity: i === current ? 1 : 0, objectPosition: 'center 40%' }}
        />
      ))}
      {/* Top fade — stronger gradient for clean transition */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
        height: '55%',
        background: 'linear-gradient(to bottom, var(--magazine-bg, #f5f0eb) 50%, transparent 100%)',
      }} />
      {/* Side fades */}
      <div className="absolute top-0 bottom-0 left-0 w-6 pointer-events-none" style={{
        background: 'linear-gradient(to right, var(--magazine-bg, #f5f0eb), transparent)',
      }} />
      <div className="absolute top-0 bottom-0 right-0 w-6 pointer-events-none" style={{
        background: 'linear-gradient(to left, var(--magazine-bg, #f5f0eb), transparent)',
      }} />
    </div>
  );
}


// ── Main Page ────────────────────────────────────────────────

/** Check if trip_context needs enrichment (missing key overview fields) */
function needsEnrichment(ctx: TripContextData | undefined | null): boolean {
  if (!ctx) return true;
  // Missing any key field means it needs enrichment
  return !ctx.wiki || !ctx.quick_facts || !ctx.explore_items?.length;
}

export default function TripOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, isLoading, refetch } = useItineraryScreen(id);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [enriching, setEnriching] = useState(false);
  const enrichAttempted = useRef(false);
  const revealRef = useRevealOnScroll(!!trip);

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

  const news: NonNullable<TripContextData['news']> = trip?.trip_context?.news ?? [];

  const toggleAdd = (itemId: string) => {
    setAddedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

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

  // Fetch fresh "things to do" and events on each visit using trip coordinates
  const tripLat = trip?.trip_context?.lat;
  const tripLng = trip?.trip_context?.lng;

  const { data: liveExploreItems } = useQuery({
    queryKey: ['trip-explore', trip?.id, tripLat, tripLng],
    queryFn: async () => {
      if (!tripLat || !tripLng) return [];
      const cats = ['sightseeing', 'restaurant', 'museum', 'park', 'cafe', 'shopping'];
      const results = await Promise.all(
        cats.map(async (cat) => {
          const res = await fetch(`/api/places?lat=${tripLat}&lng=${tripLng}&category=${cat}&limit=4`);
          if (!res.ok) return [];
          return res.json();
        })
      );
      const seen = new Set<string>();
      return results.flat().filter((p: any) => {
        if (!p.name || !p.image || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      }).map((p: any) => ({ id: p.id, title: p.name, description: p.description || p.category, category: p.category, image: p.image, tags: p.tags }));
    },
    enabled: !!tripLat && !!tripLng && !enriching,
    staleTime: 5 * 60 * 1000, // Fresh for 5 min
  });

  const { data: liveEvents } = useQuery({
    queryKey: ['trip-events', trip?.id, tripLat, tripLng],
    queryFn: async () => {
      if (!tripLat || !tripLng) return [];
      const res = await fetch(`/api/events?lat=${tripLat}&lng=${tripLng}&limit=10`);
      if (!res.ok) return [];
      const events = await res.json();
      if (!Array.isArray(events)) return [];
      return events.map((e: any) => ({
        id: e.id, title: e.title,
        description: `${e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} ${e.venue ? '· ' + e.venue : ''}`.trim() || e.description || '',
        category: e.category, image: e.image,
      }));
    },
    enabled: !!tripLat && !!tripLng && !enriching,
    staleTime: 5 * 60 * 1000,
  });

  // Use live data if available, fall back to trip_context
  const exploreItems = (liveExploreItems?.length ? liveExploreItems : trip?.trip_context?.explore_items) || [];
  const events = (liveEvents?.length ? liveEvents : trip?.trip_context?.events?.map((e: any) => ({
    id: e.id, title: e.title,
    description: `${e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} ${e.venue ? '· ' + e.venue : ''}`.trim() || e.description || '',
    category: e.category, image: e.image,
  }))) || [];

  const hasExploreItems = exploreItems.length > 0;
  const hasCuisine = trip?.trip_context?.cuisine && trip.trip_context.cuisine.length > 0;
  const hasNews = news.length > 0;
  const hasEvents = news.some(n => n.category === 'event' || n.category === 'tip');
  const hasNewsArticles = news.some(n => n.category === 'news' || n.category === 'advisory');

  return (
    <div className="relative">
      <div className="relative z-10">
        <div ref={revealRef}>

          {/* ── Row 1: Things to Do (left) + Cuisine (right) ── */}
          <div className="px-6 sm:px-10 mt-6">
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

              {/* Local Cuisine — scrollable cards matching Things to Do size */}
              {hasCuisine && (
                <div className="shrink-0 w-full lg:w-[380px]">
                  <div className="mb-4">
                    <span className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-2 px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.25)' }}>Local Cuisine</span>
                    <h3 className="text-2xl sm:text-3xl font-bold font-serif text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Must-Try Dishes</h3>
                  </div>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
                    {trip!.trip_context!.cuisine!.map((dish: { id: string; name: string; image: string }) => (
                      <div key={dish.id} className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start" style={{ height: 360 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dish.image} alt={dish.name} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                          <h3 className="text-lg font-bold text-white leading-tight font-serif">{dish.name}</h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Row 2: News (left) + What's Going On (right) ── */}
          {(hasNewsArticles || events.length > 0) && (
            <div className="relative z-10 px-6 sm:px-10 mt-8">
              <div className="flex flex-col lg:flex-row gap-6">
                {hasNewsArticles && (
                  <div className="flex-1 min-w-0">
                    <NewsSection news={news} />
                  </div>
                )}
                {events.length > 0 && (
                  <div className="flex-1 min-w-0">
                    <WhatsGoingOnSection exploreItems={events} addedItems={addedItems} onToggleAdd={toggleAdd} heroImages={trip?.trip_context?.hero_images} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Row 3: Phrases + Cost of Living ── */}
          {(trip?.trip_context?.phrases || trip?.trip_context?.cost_of_living) && (
            <div className="relative z-10 px-6 sm:px-10 mt-8">
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {trip?.trip_context?.phrases && Object.keys(trip.trip_context.phrases).length > 0 && (
                  <div className="flex-1 min-w-0">
                    <PhrasesSection phrases={trip.trip_context.phrases} language={trip.trip_context.country?.language} />
                  </div>
                )}
                {trip?.trip_context?.cost_of_living && (
                  <div className="flex-1 min-w-0">
                    <CostOfLivingSection cost={trip.trip_context.cost_of_living} currency={trip.trip_context.country?.currency?.symbol} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Row 4: Nearby Cities ── */}
          {trip?.trip_context?.nearby_cities && trip.trip_context.nearby_cities.length > 0 && (
            <div className="px-6 sm:px-10 mt-8">
              <NearbyCitiesSection cities={trip.trip_context.nearby_cities} />
            </div>
          )}

          {/* ── Rotating photo mosaic — bleeds up behind the cards ── */}
          {trip?.trip_context?.hero_images && trip.trip_context.hero_images.length > 0 && (
            <TripMosaic photos={trip.trip_context.hero_images} destination={trip.destination} />
          )}

        </div>
      </div>

      {/* Detail modal */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}
