'use client';

import { use, useState, useEffect, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useItineraryScreen, NEWS_COLORS } from '@travyl/shared';
import type { TripContextData } from '@travyl/shared';
import { TripMagazineHero } from '@/components/trip/TripMagazineHero';

// ── Hooks ─────────────────────────────────────────────────────

function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
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
  }, []);
  return ref;
}


// ── Reusable components ─────────────────────────────────────

function AddToTripButton({ isAdded, onToggle }: { isAdded: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold transition-all duration-300 backdrop-blur-sm"
      style={{
        color: isAdded ? 'var(--magazine-success)' : 'var(--magazine-accent)',
        border: `1px solid ${isAdded ? 'rgba(52,211,153,0.25)' : 'rgba(200,169,106,0.25)'}`,
        backgroundColor: isAdded ? 'rgba(52,211,153,0.1)' : 'rgba(200,169,106,0.1)',
      }}>
      {isAdded ? <span>✓ Added to trip</span> : <><Plus size={13} /><span>Add to trip</span></>}
    </button>
  );
}

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
            <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1"
              style={{ color: 'var(--magazine-accent)' }}>Explore</p>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif"
              style={{ color: 'var(--magazine-heading)' }}>Things to Do</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] tabular-nums mr-1" style={{ color: 'var(--magazine-text)' }}>
              {activeIdx + 1} / {items.length}
            </span>
            <button onClick={() => { const i = Math.max(0, activeIdx - 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === 0}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{ border: '1px solid var(--magazine-border)' }}>
              <ChevronLeft size={14} style={{ color: 'var(--magazine-text)' }} />
            </button>
            <button onClick={() => { const i = Math.min(items.length - 1, activeIdx + 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === items.length - 1}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{ border: '1px solid var(--magazine-border)' }}>
              <ChevronRight size={14} style={{ color: 'var(--magazine-text)' }} />
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

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  return (
    <section>
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1"
              style={{ color: 'var(--magazine-accent)' }}>What&apos;s Happening</p>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif"
              style={{ color: 'var(--magazine-heading)' }}>What&apos;s Going On</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] tabular-nums mr-1" style={{ color: 'var(--magazine-text)' }}>
              {activeIdx + 1} / {news.length}
            </span>
            <button onClick={() => { const i = Math.max(0, activeIdx - 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === 0}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{ border: '1px solid var(--magazine-border)' }}>
              <ChevronLeft size={14} style={{ color: 'var(--magazine-text)' }} />
            </button>
            <button onClick={() => { const i = Math.min(news.length - 1, activeIdx + 1); setActiveIdx(i); scrollTo(i); }} disabled={activeIdx === news.length - 1}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
              style={{ border: '1px solid var(--magazine-border)' }}>
              <ChevronRight size={14} style={{ color: 'var(--magazine-text)' }} />
            </button>
          </div>
        </div>

        <div ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          onScroll={(e) => {
            const el = e.currentTarget;
            const cardWidth = (el.firstElementChild as HTMLElement)?.offsetWidth || 1;
            const idx = Math.round(el.scrollLeft / (cardWidth + 12));
            setActiveIdx(Math.min(idx, news.length - 1));
          }}>
          {news.map((item, i) => {
            const addable = item.category === 'event' || item.category === 'tip';
            return (
              <div key={item.id}
                className="relative flex-shrink-0 w-full rounded-xl overflow-hidden snap-start"
                style={{ height: 280, background: `linear-gradient(135deg, ${NEWS_COLORS[i % NEWS_COLORS.length][0]}, ${NEWS_COLORS[i % NEWS_COLORS.length][1]})` }}>
                <div className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(200,169,106,0.3), transparent)' }} />
                <div className="flex flex-col justify-end h-full p-5">
                  <span className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-2 block"
                    style={{ color: 'var(--magazine-accent)' }}>
                    {item.category}
                    {item.source && <span className="ml-2 opacity-50">· {item.source}</span>}
                  </span>
                  <h3 className="text-base font-bold leading-tight mb-2 font-serif text-white/90">
                    {item.title}
                  </h3>
                  <p className="text-[12px] text-white/70 leading-relaxed line-clamp-2 mb-3">{item.snippet}</p>
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

function TripMosaic({ photos }: { photos: string[] }) {
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
    <div className="-mx-5 -mt-72 relative overflow-hidden" style={{ height: 600 }}>
      {photos.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt="Paris"
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
  const { trip } = useItineraryScreen(id);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const revealRef = useRevealOnScroll();

  const news = trip?.trip_context?.news ?? [];

  const toggleAdd = (itemId: string) => {
    setAddedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <div className="relative">
      {/* ── Shared hero — same component as itinerary ── */}
      <TripMagazineHero tripId={id} trip={trip} />

      {/* ── Content over the bleed ── */}
      <div className="relative z-10">
        <div ref={revealRef}>
          {/* ── Lede — overview only ── */}
          {trip?.trip_context?.lede_text && (
            <div className="px-6 sm:px-10 mb-6">
              <p className="text-[13px] sm:text-[14px] leading-[1.8] max-w-lg font-serif"
                style={{ color: 'var(--magazine-heading)', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
                {trip.trip_context.lede_text}
              </p>
            </div>
          )}

          {/* ── THINGS TO DO — full width ── */}
          {trip?.trip_context?.explore_items && trip.trip_context.explore_items.length > 0 && (
            <div className="reveal-on-scroll revealed px-6 sm:px-10 mt-8 relative z-10">
              <ThingsToDoSection items={trip.trip_context.explore_items} addedItems={addedItems} onToggleAdd={toggleAdd} />
            </div>
          )}

          {/* ── NEWS (left) + WHAT'S GOING ON (right) ── */}
          {news.length > 0 && (
            <div className="reveal-on-scroll revealed px-6 sm:px-10 mt-8 relative z-10">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* News column — left */}
                <div className="w-full sm:w-[38%] shrink-0">
                  <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1"
                    style={{ color: 'var(--magazine-accent)' }}>Latest</p>
                  <h2 className="text-2xl sm:text-3xl font-bold font-serif mb-4"
                    style={{ color: 'var(--magazine-heading)' }}>News</h2>
                  <div className="flex flex-col gap-3">
                    {news.filter(n => n.category === 'news' || n.category === 'advisory').map((item) => (
                      <div key={item.id} className="pb-3" style={{ borderBottom: '1px solid var(--magazine-border)' }}>
                        <span className="text-[9px] uppercase tracking-[0.15em] font-semibold"
                          style={{ color: 'var(--magazine-accent)' }}>
                          {item.category}
                          {item.source && <span className="ml-1.5 opacity-50">· {item.source}</span>}
                        </span>
                        <h3 className="text-[14px] font-bold leading-tight mt-1 font-serif"
                          style={{ color: 'var(--magazine-heading)' }}>{item.title}</h3>
                        <p className="text-[11px] leading-relaxed mt-1 line-clamp-2"
                          style={{ color: 'var(--magazine-text)' }}>{item.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What's Going On — right */}
                <div className="w-full sm:w-[60%]">
                  <WhatsGoingOnSection addedItems={addedItems} onToggleAdd={toggleAdd} news={news.filter(n => n.category === 'event' || n.category === 'tip')} />
                </div>
              </div>
            </div>
          )}


          {/* ── Rotating photo — bleeds up behind news section ── */}
          {trip?.trip_context?.hero_images && trip.trip_context.hero_images.length > 0 && (
            <TripMosaic photos={trip.trip_context.hero_images} />
          )}

        </div>
      </div>
    </div>
  );
}
