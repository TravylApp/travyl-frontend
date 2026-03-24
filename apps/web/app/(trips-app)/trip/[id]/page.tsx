'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useItineraryScreen } from '@travyl/shared';
import type { TripContextData } from '@travyl/shared';

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

function ThingsToDoSection({ items, addedItems, onToggleAdd }: {
  items: NonNullable<TripContextData['explore_items']>;
  addedItems: Set<string>;
  onToggleAdd: (id: string) => void;
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
          <h2 className="text-2xl sm:text-3xl font-bold font-serif"
            style={{ color: 'var(--magazine-heading)' }}>Things to Do</h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md"
          style={{ backgroundColor: 'var(--magazine-bg, rgba(245,240,235,0.85))' }}>
          <span className="text-[11px] tabular-nums mr-1" style={{ color: 'var(--magazine-heading)' }}>
            {activeIdx + 1} / {items.length}
          </span>
          <button onClick={() => { const i = Math.max(0, activeIdx - 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === 0}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
            style={{ border: '1px solid var(--magazine-border)' }}>
            <ChevronLeft size={14} style={{ color: 'var(--magazine-heading)' }} />
          </button>
          <button onClick={() => { const i = Math.min(items.length - 1, activeIdx + 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === items.length - 1}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
            style={{ border: '1px solid var(--magazine-border)' }}>
            <ChevronRight size={14} style={{ color: 'var(--magazine-heading)' }} />
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
          <div key={item.id} className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start" style={{ height: 360 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
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

      {/* Show 3 items visible, rest scrollable — matches What's Going On card height */}
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
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const events = exploreItems.slice(0, 6);

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
    el.style.cursor = 'grabbing';
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeft.current - (x - startX.current);
  };
  const onMouseUp = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
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
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory cursor-grab select-none"
        onScroll={(e) => {
          const el = e.currentTarget;
          const cardWidth = (el.firstElementChild as HTMLElement)?.offsetWidth || 1;
          const idx = Math.round(el.scrollLeft / (cardWidth + 12));
          setActiveIdx(Math.min(idx, events.length - 1));
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}>
        {events.map((item, i) => {
          const bgImage = item.image || (heroImages?.[i % (heroImages?.length || 1)]);
          return (
            <div key={item.id}
              className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start"
              style={{ height: 360 }}>
              {bgImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bgImage} alt={item.title} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${NEWS_COLORS[i % NEWS_COLORS.length][0]}, ${NEWS_COLORS[i % NEWS_COLORS.length][1]})` }} />
              )}
              <div className="absolute top-3 left-3">
                <span className="text-[9px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full backdrop-blur-md"
                  style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.2)' }}>
                  {item.category}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-lg font-bold leading-tight mb-1 font-serif text-white">
                  {item.title}
                </h3>
                <p className="text-[12px] text-white/60 leading-relaxed line-clamp-2 mb-3">{item.description}</p>
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
    <div className="-mx-5 -mt-48 relative overflow-hidden" style={{ height: 600 }}>
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
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
        height: '45%',
        background: 'linear-gradient(to bottom, var(--magazine-bg, #f5f0eb) 40%, transparent 100%)',
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
  const [enriching, setEnriching] = useState(false);
  const enrichAttempted = useRef(false);
  const revealRef = useRevealOnScroll(!!trip);

  // Auto-enrich: if trip exists but trip_context is empty, call server-side enrichment
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
      if (res.ok) refetch();
    } catch {
      // Enrichment failed silently
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-sm text-gray-400">
          {enriching ? 'Generating your trip overview...' : 'Loading trip...'}
        </div>
      </div>
    );
  }

  const hasExploreItems = trip?.trip_context?.explore_items && trip.trip_context.explore_items.length > 0;
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
                  <ThingsToDoSection items={trip!.trip_context!.explore_items!} addedItems={addedItems} onToggleAdd={toggleAdd} />
                )}
              </div>

              {/* Local Cuisine — scrollable cards matching Things to Do size */}
              {hasCuisine && (
                <div className="shrink-0 w-full lg:w-[380px]">
                  <div className="mb-4">
                    <span className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-2 px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.25)' }}>Local Cuisine</span>
                    <h3 className="text-2xl sm:text-3xl font-bold font-serif" style={{ color: 'var(--magazine-heading)' }}>Must-Try Dishes</h3>
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
          {hasNews && (
            <div className="px-6 sm:px-10 mt-8">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* News articles — left column */}
                {hasNewsArticles && (
                  <div className="flex-1 min-w-0 lg:max-w-[45%]">
                    <NewsSection news={news} />
                  </div>
                )}

                {/* What's Going On — right column, Foursquare venues */}
                {(trip?.trip_context as any)?.foursquare_venues?.length > 0 && (
                  <div className="flex-1 min-w-0">
                    <WhatsGoingOnSection exploreItems={(trip!.trip_context as any).foursquare_venues} addedItems={addedItems} onToggleAdd={toggleAdd} heroImages={trip?.trip_context?.hero_images} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Rotating photo mosaic ── */}
          {trip?.trip_context?.hero_images && trip.trip_context.hero_images.length > 0 && (
            <TripMosaic photos={trip.trip_context.hero_images} destination={trip.destination} />
          )}

        </div>
      </div>
    </div>
  );
}
