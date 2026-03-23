'use client';

import { use, useState, useEffect, useRef } from 'react';
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
      <div className="w-[85%] sm:w-[60%]">
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

        {/* Horizontal scroll cards */}
        <div ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          onScroll={(e) => {
            const el = e.currentTarget;
            const idx = Math.round(el.scrollLeft / (el.firstElementChild as HTMLElement)?.offsetWidth || 0);
            setActiveIdx(Math.min(idx, items.length - 1));
          }}>
          {items.map((item) => (
            <div key={item.id} className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start" style={{ height: 280 }}>
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
      </div>
    </section>
  );
}

function WhatsGoingOnSection({ addedItems, onToggleAdd, news }: {
  addedItems: Set<string>;
  onToggleAdd: (id: string) => void;
  news: NonNullable<TripContextData['news']>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

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

  return (
    <section className="h-full flex flex-col">
      <div className="flex flex-col h-full">
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
              {activeIdx + 1} / {news.length}
            </span>
            <button onClick={() => { const i = Math.max(0, activeIdx - 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === 0}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{ border: '1px solid var(--magazine-border)' }}>
              <ChevronLeft size={14} style={{ color: 'var(--magazine-heading)' }} />
            </button>
            <button onClick={() => { const i = Math.min(news.length - 1, activeIdx + 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === news.length - 1}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{ border: '1px solid var(--magazine-border)' }}>
              <ChevronRight size={14} style={{ color: 'var(--magazine-heading)' }} />
            </button>
          </div>
        </div>

        <div ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory flex-1 cursor-grab select-none"
          onScroll={(e) => {
            const el = e.currentTarget;
            const cardWidth = (el.firstElementChild as HTMLElement)?.offsetWidth || 1;
            const idx = Math.round(el.scrollLeft / (cardWidth + 12));
            setActiveIdx(Math.min(idx, news.length - 1));
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}>
          {news.map((item, i) => {
            const addable = item.category === 'event' || item.category === 'tip';
            return (
              <div key={item.id}
                className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start"
                style={{ minHeight: 180, background: `linear-gradient(135deg, ${NEWS_COLORS[i % NEWS_COLORS.length][0]}, ${NEWS_COLORS[i % NEWS_COLORS.length][1]})` }}>
                <div className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(200,169,106,0.3), transparent)' }} />
                <div className="flex flex-col justify-end h-full p-5">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-2 block"
                    style={{ color: 'var(--magazine-accent)' }}>
                    {item.category}
                    {item.source && <span className="ml-2 opacity-50">· {item.source}</span>}
                  </span>
                  <h3 className="text-base font-bold leading-tight mb-2 font-serif text-white">
                    {item.title}
                  </h3>
                  <p className="text-[12px] text-white/80 leading-relaxed line-clamp-2 mb-3">{item.snippet}</p>
                  {addable && (
                    <AddToTripButton isAdded={addedItems.has(item.id)} onToggle={() => onToggleAdd(item.id)} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-end gap-1.5 mt-3">
          {news.map((_, i) => (
            <button key={i} onClick={() => { setActiveIdx(i); scrollTo(i); }}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIdx ? 16 : 5, height: 5,
                backgroundColor: i === activeIdx ? 'var(--magazine-accent)' : 'var(--magazine-border)',
              }} />
          ))}
        </div>
      </div>
    </section>
  );
}

function upscalePhoto(url: string): string {
  if (url.includes('googleusercontent.com')) {
    return url.replace(/=w\d+-h\d+/, '=w1600-h900');
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
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms]"
          style={{ opacity: i === current ? 1 : 0, objectPosition: 'center 40%' }}
        />
      ))}
      {/* Top fade — covers the card overlap area */}
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

export default function TripOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, isLoading } = useItineraryScreen(id);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const revealRef = useRevealOnScroll(!!trip);

  const news: NonNullable<TripContextData['news']> = trip?.trip_context?.news ?? [];

  const toggleAdd = (itemId: string) => {
    setAddedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-sm text-gray-400">Loading trip...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative z-10">
        <div ref={revealRef}>

          {/* ── Row 1: Trip Title + Prompt + Quick Facts ── */}
          <div className="px-6 sm:px-10 mb-2">
            {trip?.trip_context?.lede_text && (
              <p className="text-[13px] leading-[1.7] font-serif max-w-xl mt-1"
                style={{ color: 'var(--magazine-text, var(--foreground))', opacity: 0.8 }}>
                {trip.trip_context.lede_text}
              </p>
            )}
            {/* Quick fact pills */}
            {trip?.trip_context?.country && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide">
                {trip.trip_context.country.flag && <span className="text-lg shrink-0">{trip.trip_context.country.flag}</span>}
                {[
                  `${trip.trip_context.country.currency?.symbol} ${trip.trip_context.country.currency?.code}`,
                  trip.trip_context.country.language,
                  trip.trip_context.country.timezone,
                  trip.trip_context.weather?.current ? `${trip.trip_context.weather.current.temp}°C ${trip.trip_context.weather.current.conditions}` : null,
                  'Emergency: 112',
                ].filter(Boolean).map((fact, i) => (
                  <span key={i} className="shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full bg-white/10 border border-white/15" style={{ color: 'var(--magazine-heading)' }}>{fact}</span>
                ))}
              </div>
            )}
          </div>

          {/* ── Row 2: Things to Do (left) + Local Cuisine (right) ── */}
          <div className="px-6 sm:px-10 mt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Things to Do — takes most space */}
              <div className="flex-1 min-w-0">
                {trip?.trip_context?.explore_items && trip.trip_context.explore_items.length > 0 && (
                  <ThingsToDoSection items={trip.trip_context.explore_items} addedItems={addedItems} onToggleAdd={toggleAdd} />
                )}
              </div>

              {/* Local Cuisine — right sidebar */}
              {trip?.trip_context?.cuisine && trip.trip_context.cuisine.length > 0 && (
                <div className="shrink-0 w-full lg:w-[240px]">
                  <span className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-2 px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent)', border: '1px solid rgba(200,169,106,0.25)' }}>Local Cuisine</span>
                  <h3 className="text-base font-bold font-serif mb-3" style={{ color: 'var(--magazine-heading)' }}>Must-Try Dishes</h3>
                  <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide pb-2 lg:pb-0">
                    {trip.trip_context.cuisine.slice(0, 4).map((dish: { id: string; name: string; image: string }) => (
                      <div key={dish.id} className="shrink-0 w-[120px] lg:w-full rounded-lg overflow-hidden shadow-sm border border-white/15 flex lg:flex-row items-center gap-0 lg:gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dish.image} alt={dish.name} className="w-full lg:w-14 h-[80px] lg:h-14 object-cover shrink-0" />
                        <p className="text-[10px] font-semibold px-2 py-1 lg:py-0 truncate" style={{ color: 'var(--magazine-heading)' }}>{dish.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Row 3: News (left, 2 shown) + What's Going On / Events (right) ── */}
          {news.length > 0 && (
            <div className="px-6 sm:px-10 mt-8">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* News — left, max 2 visible, scrollable */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold font-serif" style={{ color: 'var(--magazine-heading)' }}>News</h2>
                    <span className="text-[10px] opacity-50" style={{ color: 'var(--magazine-text)' }}>{news.filter(n => n.category === 'news' || n.category === 'advisory').length} stories</span>
                  </div>
                  <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-hide pr-1">
                    {news.filter(n => n.category === 'news' || n.category === 'advisory').slice(0, 6).map((item) => (
                      <a key={item.id} href={item.url || '#'} target="_blank" rel="noopener noreferrer"
                        className="block rounded-lg p-3 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                        <span className="text-[8px] uppercase tracking-wider font-bold opacity-50" style={{ color: 'var(--magazine-accent)' }}>
                          {item.source}
                        </span>
                        <h3 className="text-[12px] font-bold leading-snug mt-0.5 line-clamp-2" style={{ color: 'var(--magazine-heading)' }}>{item.title}</h3>
                      </a>
                    ))}
                  </div>
                </div>

                {/* What's Going On — right, events/activities with photos */}
                <div className="shrink-0 w-full lg:w-[320px]">
                  <h2 className="text-lg font-bold font-serif mb-3" style={{ color: 'var(--magazine-heading)' }}>What&apos;s Going On</h2>
                  <div className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-hide">
                    {news.filter(n => n.category === 'event' || n.category === 'tip').length > 0 ? (
                      news.filter(n => n.category === 'event' || n.category === 'tip').map((item, idx) => (
                        <a key={item.id} href={item.url || '#'} target="_blank" rel="noopener noreferrer"
                          className="block rounded-lg overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group">
                          <div className="h-[100px] relative overflow-hidden">
                            {trip?.trip_context?.hero_images?.[idx % (trip.trip_context.hero_images?.length || 1)] && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={upscalePhoto(trip.trip_context.hero_images[idx % trip.trip_context.hero_images.length])} alt=""
                                className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-2 text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">{item.category}</span>
                          </div>
                          <div className="p-2.5">
                            <h3 className="text-[11px] font-bold leading-snug line-clamp-2" style={{ color: 'var(--magazine-heading)' }}>{item.title}</h3>
                          </div>
                        </a>
                      ))
                    ) : (
                      /* Fallback: show explore items as activities */
                      trip?.trip_context?.explore_items?.slice(0, 3).map((item: { id: string; title: string; category: string; image?: string }, idx: number) => (
                        <div key={item.id} className="rounded-lg overflow-hidden border border-white/10 bg-white/5">
                          <div className="h-[100px] relative overflow-hidden">
                            {item.image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-2 text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">{item.category}</span>
                          </div>
                          <div className="p-2.5">
                            <h3 className="text-[11px] font-bold leading-snug" style={{ color: 'var(--magazine-heading)' }}>{item.title}</h3>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ── Rotating photo — bleeds up behind news section ── */}
          {trip?.trip_context?.hero_images && trip.trip_context.hero_images.length > 0 && (
            <TripMosaic photos={trip.trip_context.hero_images} destination={trip.destination} />
          )}

        </div>
      </div>
    </div>
  );
}
