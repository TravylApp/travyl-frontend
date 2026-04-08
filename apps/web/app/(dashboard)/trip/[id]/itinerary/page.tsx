'use client';

import { use, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useItineraryScreen, GLANCE_HERO_IMAGES, TOD_START_HOURS, QUICK_FILL_CATEGORIES, pickRandomActivity } from '@travyl/shared';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import type { MockFlightDetail, PlaceItem } from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';
import { useItineraryContext } from '@/components/itinerary/ItineraryContext';
import {
  ItineraryEmpty, TimeGroupSection,
  FlightSection,
} from '@/components/itinerary';
import type { MapLocation } from '@/components/leaflet-map';
import { ItineraryPinCard } from '@/components/itinerary/ItineraryPinCard';
import { AnimatePresence } from 'motion/react';
import { PlaceDetailOverlay } from '@/components/PlaceDetailOverlay';
import { TripHistoryToggle } from '@/components/trip/TripHistoryPanel';
import {
  ChevronDown, X, Search, Compass, LayoutList, Map, Calendar, RefreshCw,
  Landmark, UtensilsCrossed, Footprints, TreePine, Theater, ShoppingBag,
  Moon, MapPin, Bus, Heart, GripVertical, Star, Globe,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const CATEGORY_ICON: Record<string, LucideIcon> = {
  sightseeing: Landmark,
  landmark: Landmark,
  museum: Theater,
  dining: UtensilsCrossed,
  food: UtensilsCrossed,
  tour: Footprints,
  outdoor: TreePine,
  cultural: Theater,
  shopping: ShoppingBag,
  nightlife: Moon,
  wellness: Heart,
  transport: Bus,
  default: MapPin,
};
import { TIME_OF_DAY_CONFIG, getActivityTypeColor } from '@travyl/shared';
import { PaperPlane } from '@/components/ui';
import type { ItineraryDayViewModel } from '@travyl/shared';



import { Skeleton } from '@/components/ui';

function SkeletonItinerary() {
  return (
    <div>
      {/* Day selector skeleton */}
      <div className="flex items-center gap-2 mb-3 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="shrink-0 rounded-lg" style={{ width: 56, height: 52 }} />
        ))}
      </div>
      {/* Flight section skeleton */}
      <div className="mb-3.5">
        <Skeleton className="rounded-lg" style={{ height: 52 }} />
      </div>
      {/* Hotel section skeleton */}
      <div className="mb-3.5">
        <Skeleton className="rounded-lg" style={{ height: 52 }} />
      </div>
      {/* Time group sections */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-3.5">
          <Skeleton className="rounded-lg mb-2" style={{ height: 36 }} />
          <div className="space-y-2 pl-1">
            {[1, 2].map((j) => (
              <Skeleton key={j} className="rounded-lg" style={{ height: 72 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Glance Search Input ────────────────────────────────────────

function GlanceSearchInput({ query, onChange, onClose, onSelect, destination, lat, lng }: {
  query: string;
  onChange: (q: string) => void;
  onClose: () => void;
  onSelect: (place: import('@travyl/shared').PlaceItem) => void;
  destination?: string;
  lat?: number;
  lng?: number;
}) {
  const [results, setResults] = useState<import('@travyl/shared').PlaceItem[]>([]);
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const q = destination ? `${query} ${destination}` : query;
        const coordParams = lat && lng ? `&lat=${lat}&lng=${lng}` : '';
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&limit=6${coordParams}`);
        if (res.ok) setResults(await res.json());
      } catch { /* ignore */ }
    }, 300); // debounce
    return () => clearTimeout(timeout);
  }, [query, destination, lat, lng]);
  return (
    <div className="mt-1">
      <div className="relative">
        <Search size={9} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          autoFocus
          type="text"
          placeholder="Search places..."
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          className="w-full pl-6 pr-6 py-1 text-[10px] bg-white/10 border border-white/15 rounded-md text-white placeholder-white/30 focus:outline-none focus:border-white/30"
        />
        <button onClick={onClose} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
          <X size={8} />
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-1 max-h-[80px] overflow-y-auto scrollbar-hide">
          {results.map((place) => (
            <button key={place.id} onClick={() => onSelect(place)}
              className="w-full text-left flex items-center gap-2 py-1 px-1 rounded hover:bg-white/10 transition-colors">
              <MapPin size={8} className="shrink-0 text-white/30" />
              <span className="text-[10px] text-white/70 truncate">{place.name}</span>
            </button>
          ))}
        </div>
      )}
      {query.length > 1 && results.length === 0 && (
        <p className="text-[9px] text-white/20 italic py-1 px-1">No results</p>
      )}
    </div>
  );
}

// ─── Glance View ────────────────────────────────────────────────



function useDestinationImages(destination?: string, count = 5) {
  const [images, setImages] = useState<string[]>([]);
  useEffect(() => {
    if (!destination) return;
    fetch(`/api/images?q=${encodeURIComponent(destination)}&per_page=${count}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.images?.length) {
          setImages(data.images.map((img: any) => img.url || img));
        } else if (data?.url) {
          setImages([data.url]);
        }
      })
      .catch(() => {});
  }, [destination, count]);
  return images;
}

function GlanceView({
  days,
  selectedDayIndex,
  onSelectDay,
  arrivalFlight,
  returnFlight,
  hotel,
  tripFlight,
  tripId,
  onActivityClick,
  addActivity,
  removeActivity,
  updateActivity,
  moveActivityBefore,
  destination,
  heroImages,
  tripLat,
  tripLng,
}: {
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (i: number) => void;
  arrivalFlight?: MockFlightDetail;
  returnFlight?: MockFlightDetail;
  hotel?: { name: string; image?: string; price?: number; price_per_night?: number; stars?: number };
  tripFlight?: { destAirport: string; city: string } | null;
  tripId?: string;
  onActivityClick?: (activityId: string) => void;
  addActivity?: (activity: import('@travyl/shared').CalendarActivity) => void;
  removeActivity?: (id: string) => void;
  updateActivity?: (id: string, updates: Partial<import('@travyl/shared').CalendarActivity>) => void;
  moveActivityBefore?: (dragId: string, targetId: string) => void;
  tripLat?: number;
  tripLng?: number;
  destination?: string;
  heroImages?: string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const [searchSlot, setSearchSlot] = useState<{ day: number; tod: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverTarget, setDragOverTarget] = useState<{ id: string; position: 'above' | 'below' } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Fetch destination-specific images from Unsplash/Pexels
  const destImages = useDestinationImages(destination, Math.max(days.length, 3));

  // Sync scroll position when selectedDayIndex changes from external source (day pills)
  useEffect(() => {
    scrollTo(selectedDayIndex);
  }, [selectedDayIndex]);

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
    dragStartX.current = e.pageX - el.offsetLeft;
    dragScrollLeft.current = el.scrollLeft;
    el.style.cursor = 'grabbing';
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    el.scrollLeft = dragScrollLeft.current - (e.pageX - el.offsetLeft - dragStartX.current);
  };
  const onMouseUp = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  };

  return (
    <div className="w-full -mx-1 rounded-2xl overflow-hidden" data-no-page-swipe>
      {/* Horizontal scroll cards — draggable */}
      <div ref={scrollRef}
        className="flex gap-0 overflow-x-auto scrollbar-hide snap-x snap-mandatory cursor-grab select-none"
        onScroll={(e) => {
          const el = e.currentTarget;
          const idx = Math.round(el.scrollLeft / ((el.firstElementChild as HTMLElement)?.offsetWidth || 1));
          onSelectDay(Math.min(idx, days.length - 1));
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}>
        {days.map((day, i) => {
          // Prefer destination-specific images, then trip hero, then generic fallback
          const heroImg = destImages[i]
            || heroImages?.[i % (heroImages?.length || 1)]
            || GLANCE_HERO_IMAGES[i % GLANCE_HERO_IMAGES.length];
          const isFirst = i === 0;
          const isLast = i === days.length - 1;
          return (
            <div key={day.id} className="flex-shrink-0 w-full overflow-hidden snap-start relative rounded-2xl flex" style={{ minHeight: 340, background: '#0f0f1e' }}>
              {/* Left — activity list */}
              <div className="relative z-10 w-[50%] min-w-[280px] px-4 py-3 flex flex-col shrink-0" style={{ minHeight: 340 }}>
                {/* Day header */}
                <div className="mb-2">
                  <p className="text-[9px] tracking-[0.3em] uppercase font-semibold mb-0.5"
                    style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
                    {day.dateLabel}
                  </p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-base font-bold text-white">{day.dayLabel}</h3>
                    <span className="text-[9px] text-white/40">
                      {day.activityCount} {day.activityCount === 1 ? 'activity' : 'activities'}
                    </span>
                  </div>
                </div>

                {/* Activities */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {isFirst && arrivalFlight && (
                    <div className="flex items-center gap-2 mb-1.5 pb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <PaperPlane size={10} className="shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-[10px] font-semibold text-white/80">Arrive — {arrivalFlight.flightNumber}</span>
                      <span className="text-[9px] ml-auto text-white/40">{arrivalFlight.arrivalTime}</span>
                    </div>
                  )}
                  {isFirst && !arrivalFlight && tripFlight && (
                    <a href={tripId ? `/trip/${tripId}/flights` : '#'} className="flex items-center gap-2 mb-1.5 pb-1.5 group hover:bg-white/5 -mx-1 px-1 rounded transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <PaperPlane size={11} className="shrink-0 text-blue-400" />
                      <span className="text-[11px] font-semibold text-white truncate">Flight → {tripFlight.destAirport}</span>
                      <span className="text-[10px] ml-auto text-blue-400 shrink-0 font-medium group-hover:text-blue-300">Search</span>
                    </a>
                  )}
                  {isFirst && hotel && (
                    <a href={tripId ? `/trip/${tripId}/hotels` : '#'} className="flex items-center gap-2 mb-1.5 pb-1.5 group hover:bg-white/5 -mx-1 px-1 rounded transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <MapPin size={11} className="shrink-0 text-amber-400" />
                      <span className="text-[11px] font-semibold text-white truncate">Check-in — {hotel.name}</span>
                      <span className="text-[10px] ml-auto text-amber-400/80 shrink-0 font-medium">{hotel.price ? `$${hotel.price}/n` : ''}</span>
                    </a>
                  )}

                  {(['morning', 'afternoon', 'evening', 'latenight'] as const).map((tod) => {
                    const config = TIME_OF_DAY_CONFIG[tod];
                    const group = day.timeGroups.find((g) => g.timeOfDay === tod);
                    return (
                      <div key={tod}
                        className="mb-1 last:mb-0 rounded-lg transition-colors px-1 -mx-1"
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-white/10'); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('bg-white/10'); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-white/10');
                          try {
                            const item = JSON.parse(e.dataTransfer.getData('application/json'));
                            if (!item) return;
                            if (item._isMove && updateActivity) {
                              // Move existing activity to this time slot
                              updateActivity(item.id, {
                                day: i,
                                startHour: TOD_START_HOURS[tod] || 9,
                              });
                            } else if (addActivity) {
                              // Add new activity from explore/search
                              addActivity({
                                id: `drop-${Date.now()}`,
                                title: item.title || item.name,
                                type: item.category || '',
                                day: i,
                                startHour: TOD_START_HOURS[tod] || 9,
                                duration: 2,
                                location: item.location || '',
                                image: item.image,
                                onCalendar: true,
                              });
                            }
                          } catch {}
                        }}
                      >
                        <p className="text-[8px] font-bold tracking-[0.2em] uppercase mb-0.5"
                          style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
                          {config.label}
                        </p>
                        {group?.activities.map((activity) => {
                          const catColor = getActivityTypeColor(activity.category);
                          const CatIcon = CATEGORY_ICON[activity.category] || CATEGORY_ICON.default;
                          const isBeingDragged = draggingId === activity.id;
                          const isDropAbove = dragOverTarget?.id === activity.id && dragOverTarget.position === 'above';
                          const isDropBelow = dragOverTarget?.id === activity.id && dragOverTarget.position === 'below';
                          return (
                            <div key={activity.id} className="relative">
                              {/* Drop indicator line — above */}
                              <div className={`absolute -top-[1px] left-0 right-0 h-[2px] rounded-full transition-all duration-150 ${isDropAbove ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
                                style={{ backgroundColor: 'var(--magazine-accent, #c8a96a)' }} />
                            <div
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setDraggingId(activity.id);
                                e.dataTransfer.setData('application/json', JSON.stringify({
                                  id: activity.id,
                                  name: activity.name,
                                  title: activity.name,
                                  category: activity.category,
                                  location: activity.locationName || '',
                                  image: '',
                                  _isMove: true,
                                }));
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => { setDraggingId(null); setDragOverTarget(null); }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pos = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
                                setDragOverTarget({ id: activity.id, position: pos });
                              }}
                              onDragLeave={() => {
                                setDragOverTarget((prev) => prev?.id === activity.id ? null : prev);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverTarget(null);
                                try {
                                  const item = JSON.parse(e.dataTransfer.getData('application/json'));
                                  if (item?._isMove && item.id !== activity.id && moveActivityBefore) {
                                    if (updateActivity) {
                                      updateActivity(item.id, { day: i, startHour: TOD_START_HOURS[tod] || 9 });
                                    }
                                    moveActivityBefore(item.id, activity.id);
                                  }
                                } catch {}
                              }}
                              className={`flex items-center gap-1 py-[3px] group/row rounded -mx-1 px-1 transition-all duration-150 ${
                                isBeingDragged ? 'opacity-30 scale-95' : 'hover:bg-white/5'
                              }`}>
                              {/* Drag handle */}
                              <GripVertical size={8} className="shrink-0 text-white/15 group-hover/row:text-white/35 cursor-grab active:cursor-grabbing transition-colors" />
                              <button
                                onClick={(e) => { e.stopPropagation(); removeActivity?.(activity.id); }}
                                className="shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/20 transition-all opacity-0 group-hover/row:opacity-100"
                                title="Remove"
                              >
                                <X size={7} />
                              </button>
                              <CatIcon size={9} className="shrink-0" style={{ color: catColor.primary }} />
                              <span
                                onClick={() => onActivityClick?.(activity.id)}
                                className="text-[11px] flex-1 truncate font-semibold text-white hover:text-white transition-colors cursor-pointer">
                                {activity.name}
                              </span>
                              {activity.timeDisplay && (
                                <span className="text-[9px] text-white/60 shrink-0 tabular-nums font-medium">{activity.timeDisplay}</span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const existingIds = days.flatMap((d) => d.timeGroups.flatMap((g) => g.activities.map((a) => a.id)));
                                  const replacement = pickRandomActivity(activity.category, existingIds);
                                  if (replacement && removeActivity && addActivity) {
                                    removeActivity(activity.id);
                                    addActivity({
                                      id: `regen-${Date.now()}`,
                                      title: replacement.name,
                                      type: replacement.category || activity.category,
                                      day: i,
                                      startHour: TOD_START_HOURS[tod] || 9,
                                      duration: 2,
                                      location: replacement.location || '',
                                      image: replacement.images?.[0],
                                      onCalendar: true,
                                    });
                                  }
                                }}
                                className="shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white/20 hover:text-amber-400 hover:bg-amber-500/20 transition-all opacity-0 group-hover/row:opacity-100"
                                title="Regenerate — replace with similar activity"
                              >
                                <RefreshCw size={7} />
                              </button>
                            </div>
                              {/* Drop indicator line — below */}
                              <div className={`absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-full transition-all duration-150 ${isDropBelow ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
                                style={{ backgroundColor: 'var(--magazine-accent, #c8a96a)' }} />
                            </div>
                          );
                        })}
                        {searchSlot?.day === i && searchSlot?.tod === tod ? (
                          <GlanceSearchInput
                            query={searchQuery}
                            onChange={setSearchQuery}
                            onClose={() => { setSearchSlot(null); setSearchQuery(''); }}
                            destination={destination}
                            lat={tripLat}
                            lng={tripLng}
                            onSelect={(place) => {
                              addActivity?.({
                                id: `search-${Date.now()}`,
                                title: place.name,
                                type: place.type,
                                day: i,
                                startHour: TOD_START_HOURS[tod] || 9,
                                duration: 2,
                                location: place.tagline,
                                image: place.image,
                                onCalendar: true,
                              });
                              setSearchSlot(null);
                              setSearchQuery('');
                            }}
                          />
                        ) : (
                          <div className="mt-1 space-y-1">
                            {/* Quick-fill pills */}
                            <div className="flex flex-wrap gap-1">
                              {QUICK_FILL_CATEGORIES.slice(0, 4).map((cat) => (
                                <button
                                  key={cat.label}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const existingIds = days.flatMap((d) => d.timeGroups.flatMap((g) => g.activities.map((a) => a.id)));
                                    const item = pickRandomActivity(cat.filter, existingIds);
                                    if (item && addActivity) {
                                      addActivity({
                                        id: `quick-${Date.now()}`,
                                        title: item.name,
                                        type: item.category || '',
                                        day: i,
                                        startHour: TOD_START_HOURS[tod] || 9,
                                        duration: 2,
                                        location: item.location || '',
                                        image: item.images?.[0],
                                        onCalendar: true,
                                      });
                                    }
                                  }}
                                  className="text-[8px] px-1.5 py-0.5 rounded-full border border-white/10 text-white/40 hover:text-white/70 hover:border-white/25 hover:bg-white/5 transition-all"
                                  title={`Add ${cat.label.toLowerCase()} activity`}
                                >
                                  {cat.icon} {cat.label}
                                </button>
                              ))}
                            </div>
                            {/* Search link */}
                            <button
                              onClick={() => { setSearchSlot({ day: i, tod }); setSearchQuery(''); }}
                              className="flex items-center gap-1 text-white/20 hover:text-white/40 transition-colors cursor-pointer"
                            >
                              <Search size={7} />
                              <span className="text-[8px] italic">Search</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isLast && hotel && (
                    <a href={tripId ? `/trip/${tripId}/hotels` : '#'} className="flex items-center gap-2 mt-1.5 pt-1.5 group hover:bg-white/5 -mx-1 px-1 rounded transition-colors" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <MapPin size={11} className="shrink-0 text-blue-400" />
                      <span className="text-[11px] font-semibold text-white truncate">Check-out — {hotel.name}</span>
                      <span className="text-[10px] ml-auto text-white/60 shrink-0 font-medium">11 AM</span>
                    </a>
                  )}
                  {isLast && returnFlight && (
                    <div className="flex items-center gap-2 mt-1.5 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <PaperPlane size={11} className="shrink-0 rotate-180" style={{ color: '#60a5fa' }} />
                      <span className="text-[11px] font-semibold text-white">Depart — {returnFlight.flightNumber}</span>
                      <span className="text-[10px] ml-auto text-white/60 font-medium">{returnFlight.departureTime}</span>
                    </div>
                  )}
                  {isLast && !returnFlight && tripFlight && (
                    <a href={tripId ? `/trip/${tripId}/flights` : '#'} className="flex items-center gap-2 mt-1.5 pt-1.5 group hover:bg-white/5 -mx-1 px-1 rounded transition-colors" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <PaperPlane size={11} className="shrink-0 rotate-180 text-blue-400" />
                      <span className="text-[11px] font-semibold text-white truncate">Flight home from {tripFlight.destAirport}</span>
                      <span className="text-[10px] ml-auto text-blue-400 shrink-0 font-medium group-hover:text-blue-300">Search</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Right — destination image */}
              <div className="relative flex-1 min-w-0 hidden sm:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImg} alt={day.dayLabel}  className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 35%' }} />
                {/* Soft left edge blend into dark background */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #0f0f1e 0%, transparent 20%)' }} />
                {/* Day label — bottom right */}
                <div className="absolute bottom-3 right-3">
                  <p className="text-sm font-bold text-white/60" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
                    {day.dayLabel}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-1.5 mt-3">
        {days.map((_, i) => (
          <button key={i} onClick={() => { onSelectDay(i); scrollTo(i); }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === selectedDayIndex ? 16 : 5, height: 5,
              backgroundColor: i === selectedDayIndex ? 'var(--magazine-accent, #c8a96a)' : 'var(--magazine-border, rgba(255,255,255,0.2))',
            }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function Itinerary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, isLoading, isEmpty } = useItineraryScreen(id);
  const {
    days, addActivity, removeActivity, updateActivity, moveActivityBefore,
    collapsedSections, setCollapsedSections,
    allCollapsedOverride, setAllCollapsedOverride,
    selectedDayIndex, setSelectedDayIndex,
    setMapMarkers, setSelectedMarkerId, requestMapOpen, setRequestMapOpen,
    swapDays,
  } = useItineraryContext();
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragDayRef = useRef<number | null>(null);
  const selectedDay = days[selectedDayIndex] ?? null;
  const contentRef = useRef<HTMLDivElement>(null);

  const [compactOpen, setCompactOpen] = useState(false);
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState('All');
  const [addSearch, setAddSearch] = useState('');
  const [browseIndex, setBrowseIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(`favorites-${id}`) || '[]'); } catch { return []; }
  });
  const [regenerating, setRegenerating] = useState(false);

  const [regenMenuOpen, setRegenMenuOpen] = useState(false);
  const regenMenuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!regenMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (regenMenuRef.current && !regenMenuRef.current.contains(e.target as Node)) {
        setRegenMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [regenMenuOpen]);

  // Persist activities to Supabase — RLS restricts writes to own trips (user_id match or NULL+public)
  type PersistActivity = { name: string; category: string; dayDate: string; startTime: string; endTime: string; lat?: number; lng?: number; image?: string };
  const persistActivitiesToDb = useCallback(async (newActivities: PersistActivity[], replaceDayDate?: string) => {
    if (!newActivities.length) return;
    try {
      const supabase = getSupabaseBrowser();

      // 1. Update trip_context.itinerary (always works — trips table is public writable)
      const { data: tripData, error: readErr } = await supabase.from('trips').select('trip_context').eq('id', id).single();
      if (readErr) { console.error('[persist] read failed:', readErr.message); return; }
      if (tripData?.trip_context) {
        const itinerary = (tripData.trip_context.itinerary || []) as any[];

        if (replaceDayDate) {
          const dayIdx = itinerary.findIndex((d: any) => d.date === replaceDayDate);
          const newDay = {
            day: dayIdx >= 0 ? itinerary[dayIdx].day : itinerary.length + 1,
            date: replaceDayDate,
            slots: newActivities.filter(a => a.dayDate === replaceDayDate).map(a => ({
              start_time: a.startTime, end_time: a.endTime,
              poi: { id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: a.name, category: a.category, lat: a.lat, lng: a.lng },
            })),
          };
          if (dayIdx >= 0) itinerary[dayIdx] = newDay;
          else itinerary.push(newDay);
        } else {
          for (const a of newActivities) {
            let dayEntry = itinerary.find((d: any) => d.date === a.dayDate);
            if (!dayEntry) {
              dayEntry = { day: itinerary.length + 1, date: a.dayDate, slots: [] };
              itinerary.push(dayEntry);
            }
            dayEntry.slots.push({
              start_time: a.startTime, end_time: a.endTime,
              poi: { id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: a.name, category: a.category, lat: a.lat, lng: a.lng },
            });
          }
        }

        // Append to user_history for the history panel
        const userHistory = (tripData.trip_context.user_history ?? []) as any[];
        const activityNames = newActivities.map(a => a.name);
        const historyAction = replaceDayDate
          ? `Regenerated day ${replaceDayDate} with ${activityNames.length} activities`
          : `Added ${activityNames.map(n => `"${n}"`).join(', ')}`;
        userHistory.push({ action: historyAction, timestamp: new Date().toISOString(), actor: 'You' });

        const { error: updateErr } = await supabase.from('trips').update({ trip_context: { ...tripData.trip_context, itinerary, user_history: userHistory } }).eq('id', id);
        if (updateErr) console.error('[persist] update failed:', updateErr.message);
        else console.log('[persist] trip_context updated successfully, days:', itinerary.map((d: any) => ({ day: d.day, slots: d.slots?.length })));
      }

      // 2. Activity table — best effort (may fail for anonymous users due to RLS)
      const rows = newActivities.map(a => ({
        trip_id: id, user_id: null,
        activity_name: a.name, activity_type: a.category || '',
        starting_date: a.dayDate, ending_date: a.dayDate,
        starting_time: a.startTime, ending_time: a.endTime,
        latitude: a.lat || 0, longitude: a.lng || 0,
        activity_data: { category: a.category, location_name: a.name, image_url: a.image || null },
      }));
      await supabase.from('activity').insert(rows).then(() => {}, () => {});
    } catch (e) {
      console.error('Failed to persist activities:', e);
    }
  }, [id]);

  // Suggest a single activity by category using real place data
  // If `nearby` is true, uses trip lat/lng for location-based results
  const handleSuggestActivity = useCallback(async (category: string, dayIdx: number, tod: string, nearby?: boolean) => {
    if (!trip || regenerating) return;
    setRegenerating(true);
    try {
      const dest = trip.destination || '';
      const lat = trip.trip_context?.lat;
      const lng = trip.trip_context?.lng;
      const query = nearby && lat && lng
        ? `${category} near me`
        : `best ${category} in ${dest}`;
      const locParams = nearby && lat && lng ? `&lat=${lat}&lng=${lng}` : '';
      const res = await fetch(`/api/places?q=${encodeURIComponent(query)}&limit=10${locParams}`);
      if (!res.ok) throw new Error('Search failed');
      const places = await res.json();

      // Filter out places already in the itinerary
      const existingNames = new Set(days.flatMap(d => d.timeGroups.flatMap(g => g.activities.map(a => (a.name || '').toLowerCase()))));
      const fresh = places.filter((p: any) => !existingNames.has(p.name?.toLowerCase()));
      const pick = fresh[Math.floor(Math.random() * Math.min(fresh.length, 5))];

      if (pick && addActivity) {
        const hour = TOD_START_HOURS[tod] || 12;
        addActivity({
          id: `suggest-${Date.now()}`,
          title: pick.name,
          type: pick.category || category,
          day: dayIdx,
          startHour: hour,
          duration: category === 'restaurant' ? 1.5 : 2,
          location: pick.formatted_address || pick.vicinity || '',
          image: pick.images?.[0] || pick.image || undefined,
          onCalendar: true,
          color: 'var(--trip-base)',
        });

        // Persist to DB
        const startDate = trip.start_date || new Date().toISOString().split('T')[0];
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + dayIdx);
        await persistActivitiesToDb([{
          name: pick.name,
          category: pick.category || category,
          dayDate: dayDate.toISOString().split('T')[0],
          startTime: `${hour}:00`,
          endTime: `${hour + 2}:00`,
          lat: pick.latitude, lng: pick.longitude,
          image: pick.images?.[0] || pick.image,
        }]);
      } else {
        alert(`No ${category} suggestions found for ${dest}. Try a different category.`);
      }
    } catch (e) {
      console.error('Suggest failed:', e);
    } finally {
      setRegenerating(false);
    }
  }, [trip, days, addActivity, regenerating, persistActivitiesToDb]);

  // Regenerate a single day
  const handleRegenerateDay = useCallback(async (dayIdx: number) => {
    if (!trip || regenerating) return;
    setRegenerating(true);
    try {
      const dest = trip.destination || '';
      const categories = ['attractions', 'restaurants', 'things to do', 'nightlife'];
      const allPlaces: any[] = [];

      // Fetch a mix of categories for this day
      for (const cat of categories) {
        const res = await fetch(`/api/places?q=${encodeURIComponent(`${cat} in ${dest}`)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          allPlaces.push(...data);
        }
      }

      // Remove existing activities for this day
      const dayActivities = days[dayIdx]?.timeGroups.flatMap(g => g.activities) ?? [];
      for (const a of dayActivities) {
        removeActivity?.(a.id);
      }

      // Deduplicate and shuffle
      const seen = new Set<string>();
      const unique = allPlaces.filter(p => {
        if (!p.name || seen.has(p.name)) return false;
        seen.add(p.name);
        return true;
      });
      const shuffled = unique.sort(() => Math.random() - 0.5);

      // Fill 4 time slots: morning, afternoon, evening, late night
      const slots = [
        { tod: 'morning', hour: 9, type: '' },
        { tod: 'afternoon', hour: 13, type: 'dining' },
        { tod: 'afternoon', hour: 15, type: '' },
        { tod: 'evening', hour: 19, type: 'dining' },
      ];

      // Compute this day's date
      const startDate = trip.start_date || new Date().toISOString().split('T')[0];
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + dayIdx);
      const dayDateStr = dayDate.toISOString().split('T')[0];

      const HOUR_END: Record<number, string> = { 9: '11:00', 13: '15:00', 15: '17:00', 19: '21:00' };
      const added: { name: string; category: string; dayDate: string; startTime: string; endTime: string; lat?: number; lng?: number; image?: string }[] = [];

      for (let i = 0; i < slots.length && i < shuffled.length; i++) {
        const place = shuffled[i];
        addActivity?.({
          id: `regen-${Date.now()}-${i}`,
          title: place.name,
          type: place.category || slots[i].type,
          day: dayIdx,
          startHour: slots[i].hour,
          duration: 2,
          location: place.formatted_address || place.vicinity || '',
          image: place.images?.[0] || place.image || undefined,
          onCalendar: true,
          color: 'var(--trip-base)',
        });
        added.push({
          name: place.name,
          category: place.category || slots[i].type,
          dayDate: dayDateStr,
          startTime: `${slots[i].hour}:00`,
          endTime: HOUR_END[slots[i].hour] || `${slots[i].hour + 2}:00`,
          lat: place.latitude, lng: place.longitude,
          image: place.images?.[0] || place.image,
        });
      }

      // Persist to DB — delete old activities for this day, insert new (replaces trip_context day)
      const supabase = getSupabaseBrowser();
      await supabase.from('activity').delete().eq('trip_id', id).eq('starting_date', dayDateStr);
      await persistActivitiesToDb(added, dayDateStr);
    } catch (e) {
      console.error('Regenerate day failed:', e);
    } finally {
      setRegenerating(false);
    }
  }, [trip, days, addActivity, removeActivity, regenerating, id, persistActivitiesToDb]);

  // Fill empty time slots for the selected day
  const handleFillEmpty = useCallback(async (dayIdx: number) => {
    if (!trip || regenerating) return;
    const day = days[dayIdx];
    if (!day) return;

    // Find which time-of-day slots have no activities
    const emptyTods = (['morning', 'afternoon', 'evening'] as const).filter(
      tod => !day.timeGroups.find(g => g.timeOfDay === tod)?.activities?.length
    );
    if (!emptyTods.length) {
      alert('All time slots are filled for this day!');
      return;
    }

    setRegenerating(true);
    try {
      const dest = trip.destination || '';
      const TOD_QUERIES: Record<string, string> = {
        morning: 'attractions sightseeing',
        afternoon: 'activities things to do',
        evening: 'restaurants dinner',
      };
      const startDate = trip.start_date || new Date().toISOString().split('T')[0];
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + dayIdx);
      const dayDateStr = dayDate.toISOString().split('T')[0];
      const added: { name: string; category: string; dayDate: string; startTime: string; endTime: string; lat?: number; lng?: number; image?: string }[] = [];

      for (const tod of emptyTods) {
        const q = TOD_QUERIES[tod] || 'things to do';
        const res = await fetch(`/api/places?q=${encodeURIComponent(`${q} in ${dest}`)}&limit=5`);
        if (!res.ok) continue;
        const places = await res.json();
        const pick = places[Math.floor(Math.random() * Math.min(places.length, 3))];
        if (pick && addActivity) {
          const hour = TOD_START_HOURS[tod] || 12;
          addActivity({
            id: `fill-${Date.now()}-${tod}`,
            title: pick.name,
            type: pick.category || '',
            day: dayIdx,
            startHour: hour,
            duration: 2,
            location: pick.formatted_address || pick.vicinity || '',
            image: pick.images?.[0] || pick.image || undefined,
            onCalendar: true,
            color: 'var(--trip-base)',
          });
          added.push({
            name: pick.name, category: pick.category || '',
            dayDate: dayDateStr, startTime: `${hour}:00`, endTime: `${hour + 2}:00`,
            lat: pick.latitude, lng: pick.longitude, image: pick.images?.[0] || pick.image,
          });
        }
      }
      if (added.length) await persistActivitiesToDb(added);
    } catch (e) {
      console.error('Fill empty failed:', e);
    } finally {
      setRegenerating(false);
    }
  }, [trip, days, addActivity, regenerating, persistActivitiesToDb]);

  // Regenerate entire trip — calls the day logic directly (not handleRegenerateDay which guards on `regenerating`)
  const handleRegenerate = useCallback(async () => {
    if (!trip || regenerating) return;
    setRegenerating(true);
    try {
      const dest = trip.destination || '';
      const startDate = trip.start_date || new Date().toISOString().split('T')[0];
      const categories = ['attractions', 'restaurants', 'things to do', 'nightlife'];
      const HOUR_END: Record<number, string> = { 9: '11:00', 13: '15:00', 15: '17:00', 19: '21:00' };
      const slots = [
        { hour: 9, type: '' },
        { hour: 13, type: 'dining' },
        { hour: 15, type: '' },
        { hour: 19, type: 'dining' },
      ];

      for (let d = 0; d < days.length; d++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + d);
        const dayDateStr = dayDate.toISOString().split('T')[0];

        // Fetch places
        const allPlaces: any[] = [];
        for (const cat of categories) {
          const res = await fetch(`/api/places?q=${encodeURIComponent(`${cat} in ${dest}`)}&limit=5`);
          if (res.ok) allPlaces.push(...(await res.json()));
        }

        // Remove old, deduplicate, shuffle
        const dayActivities = days[d]?.timeGroups.flatMap(g => g.activities) ?? [];
        for (const a of dayActivities) removeActivity?.(a.id);

        const seen = new Set<string>();
        const unique = allPlaces.filter(p => { if (!p.name || seen.has(p.name)) return false; seen.add(p.name); return true; });
        const shuffled = unique.sort(() => Math.random() - 0.5);

        const added: { name: string; category: string; dayDate: string; startTime: string; endTime: string; lat?: number; lng?: number; image?: string }[] = [];
        for (let i = 0; i < slots.length && i < shuffled.length; i++) {
          const place = shuffled[i];
          addActivity?.({
            id: `regen-${Date.now()}-${d}-${i}`, title: place.name,
            type: place.category || slots[i].type, day: d,
            startHour: slots[i].hour, duration: 2,
            location: place.formatted_address || place.vicinity || '',
            image: place.images?.[0] || place.image || undefined,
            onCalendar: true, color: 'var(--trip-base)',
          });
          added.push({
            name: place.name, category: place.category || slots[i].type,
            dayDate: dayDateStr, startTime: `${slots[i].hour}:00`,
            endTime: HOUR_END[slots[i].hour] || `${slots[i].hour + 2}:00`,
            lat: place.latitude, lng: place.longitude, image: place.images?.[0] || place.image,
          });
        }

        // Persist this day
        const supabase = getSupabaseBrowser();
        await supabase.from('activity').delete().eq('trip_id', id).eq('starting_date', dayDateStr);
        await persistActivitiesToDb(added, dayDateStr);
      }
    } catch (e) {
      console.error('Regenerate failed:', e);
    } finally {
      setRegenerating(false);
    }
  }, [trip, days, regenerating, id, addActivity, removeActivity, persistActivitiesToDb]);

  // Build hotel info from trip_context for itinerary display
  const contextHotels = trip?.trip_context?.hotels ?? (trip?.trip_context as any)?.all_hotels ?? [];
  const firstHotel = contextHotels[0] as any | undefined;

  // Build flight info from trip_context flights data (no hardcoded airport lookup)
  const contextFlights = trip?.trip_context?.flights ?? [];
  const city = trip?.destination?.split(',')[0]?.trim() ?? '';
  const destAirport = (contextFlights[0] as any)?.dest_iata || '';
  const tripFlight = destAirport ? { destAirport, city } : null;

  const arrivalFlight: MockFlightDetail | undefined = undefined;
  const returnFlight: MockFlightDetail | undefined = undefined;

  // Build discover items from trip context (explore_items + foursquare_venues)
  const discoverItems: DiscoverItem[] = useMemo(() => {
    const explore = trip?.trip_context?.explore_items ?? [];
    const venues = trip?.trip_context?.foursquare_venues ?? [];
    const seen = new Set<string>();
    const items: DiscoverItem[] = [];
    for (const item of explore) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push({
        id: item.id, name: item.title, description: item.description,
        category: item.category, location: item.title,
        images: item.image ? [item.image] : [], rating: 0, tags: item.tags ?? [],
      });
    }
    for (const v of venues) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      items.push({
        id: v.id, name: v.title || v.name || '', description: v.description || v.category || '',
        category: v.category || 'venue', location: v.title || v.name || '',
        images: v.image ? [v.image] : [], rating: v.rating ?? 0, tags: [],
      });
    }
    return items;
  }, [trip]);

  const filteredDiscoverItems = useMemo(() => {
    let items = discoverItems;
    if (addSearch) {
      const q = addSearch.toLowerCase();
      items = items.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.category?.toLowerCase().includes(q) ?? false),
      );
    }
    if (addCategory !== 'All') {
      items = items.filter((i) => i.category?.toLowerCase().includes(addCategory.toLowerCase()) ?? false);
    }
    return items;
  }, [discoverItems, addSearch, addCategory]);

  const handleAddItem = useCallback((item: DiscoverItem, timeOfDay: string) => {
    const todStartHours: Record<string, number> = { morning: 9, afternoon: 13, evening: 19, latenight: 22 };
    const startHour = todStartHours[timeOfDay] ?? 12;
    const duration = 1.5;
    const endHour = startHour + duration;
    const fmt = (h: number) => {
      const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const period = h >= 12 ? 'PM' : 'AM';
      return `${Math.floor(hr)}:${(h % 1) * 60 === 0 ? '00' : '30'} ${period}`;
    };
    addActivity({
      id: `cal-itin-${Date.now()}`,
      title: item.name,
      type: item.category ?? '',
      day: selectedDayIndex,
      startHour,
      duration,
      startTime: fmt(startHour),
      endTime: fmt(endHour),
      location: item.location,
      image: item.images?.[0],
      rating: item.rating,
      price: item.price,
      color: 'var(--trip-base)',
      onCalendar: true,
    });
    setAddingTo(null);
    setAddSearch('');
    setAddCategory('All');
  }, [addActivity, selectedDayIndex]);

  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(itemId) ? prev.filter((f) => f !== itemId) : [...prev, itemId];
      try { localStorage.setItem(`favorites-${id}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [id]);

  const isFirstDay = selectedDayIndex === 0;
  const isLastDay = selectedDayIndex === days.length - 1;

  const allActivities: DiscoverItem[] = useMemo(() => {
    const items: DiscoverItem[] = [];
    for (const day of days) {
      for (const group of day.timeGroups) {
        for (const a of group.activities) {
          items.push({
            id: a.id,
            name: a.name,
            location: a.locationName || '',
            description: a.notes || `${a.category} activity in ${trip?.destination?.split(',')[0] || 'your destination'}`,
            images: a.image ? [a.image] : [],
            rating: 0,
            tags: [a.category, group.timeOfDay, a.costDisplay || ''].filter(Boolean),
            price: a.costDisplay || undefined,
            category: a.category,
            isBooked: true,
            bookedDay: day.dayNumber,
            bookedTime: a.startTime || undefined,
            bookingUrl: a.bookingUrl || undefined,
            lat: (a as any).lat ?? undefined,
            lng: (a as any).lng ?? undefined,
          });
        }
      }
    }
    return items;
  }, [days, trip?.destination]);

  // Build map markers from activities, offset from trip center
  const mapLocations: MapLocation[] = useMemo(() => {
    if (!selectedDay) return [];
    const locations: MapLocation[] = [];
    const tripLat = trip?.trip_context?.lat;
    const tripLng = trip?.trip_context?.lng;

    for (const group of selectedDay.timeGroups) {
      for (const activity of group.activities) {
        const catColor = getActivityTypeColor(activity.category);
        if (tripLat && tripLng) {
          const offset = locations.length;
          locations.push({
            id: activity.id,
            name: activity.name,
            lat: tripLat + (Math.sin(offset * 1.2) * 0.008),
            lng: tripLng + (Math.cos(offset * 1.2) * 0.008),
            color: catColor.primary,
            category: activity.category,
          });
        }
      }
    }
    return locations;
  }, [selectedDay, trip]);

  // Push markers to layout map
  // Push markers to layout map (but don't auto-open — user toggles via button)
  useEffect(() => {
    if (mapLocations.length > 0) {
      setMapMarkers(mapLocations);
    }
    return () => {
      setMapMarkers([]);
      setSelectedMarkerId(undefined);
      setRequestMapOpen(false);
    };
  }, [mapLocations, setMapMarkers, setSelectedMarkerId, setRequestMapOpen]);

  // IntersectionObserver — highlight map marker as user scrolls past activities
  useEffect(() => {
    const container = contentRef.current;
    if (!container || mapLocations.length === 0) return;

    const activityIds = new Set(mapLocations.map((m) => m.id));
    const visibleIds = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.activityId;
          if (!id || !activityIds.has(id)) continue;
          if (entry.isIntersecting) visibleIds.add(id);
          else visibleIds.delete(id);
        }
        // Pick the first visible activity (topmost in scroll order)
        const ordered = mapLocations.filter((m) => visibleIds.has(m.id));
        setSelectedMarkerId(ordered[0]?.id);
      },
      { root: null, rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    const cards = container.querySelectorAll('[data-activity-id]');
    cards.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [mapLocations, setSelectedMarkerId]);

  const toPlaceItem = useCallback((item: DiscoverItem): PlaceItem => ({
    id: item.id,
    name: item.name,
    image: item.images?.[0] || '',
    images: item.images,
    type: /restaurant|food|culinary|dining/i.test(item.category || '') ? 'restaurant' : (item.category as PlaceItem['type']) || 'experience',
    rating: item.rating || 0,
    tagline: item.description || item.category || '',
    category: item.category || '',
    description: item.description,
    tags: item.tags,
    latitude: (item as any).lat ?? trip?.trip_context?.lat,
    longitude: (item as any).lng ?? trip?.trip_context?.lng,
    address: item.location,
    website: item.bookingUrl,
  }), [trip]);

  const handleActivityClick = useCallback(
    async (activityId: string) => {
      const item = allActivities.find((a) => a.id === activityId);
      if (!item) return;

      const place = toPlaceItem(item);
      setSelectedPlace(place);
      // Don't open the trip map panel — PlaceDetailModal has its own map

      // Always enrich with real place data for images, description, coordinates
      if (place.name) {
        try {
          const dest = trip?.destination?.split(',')[0]?.trim() || '';
          const tripLat = trip?.trip_context?.lat;
          const tripLng = trip?.trip_context?.lng;
          // Use lat/lng with q= to anchor search to the right city
          const params = new URLSearchParams({ q: `${place.name} ${dest}`, limit: '1' });
          if (tripLat && tripLng) { params.set('lat', String(tripLat)); params.set('lng', String(tripLng)); }
          const res = await fetch(`/api/places?${params}`);
          if (res.ok) {
            const [found] = await res.json();
            if (found) {
              setSelectedPlace(prev => prev?.id === place.id ? {
                ...prev,
                image: found.images?.[0] || found.image || prev.image,
                images: found.images?.length ? found.images : prev.images,
                rating: found.rating || prev.rating,
                description: found.description || prev.description,
                address: found.formatted_address || found.vicinity || prev.address,
                latitude: found.latitude || prev.latitude,
                longitude: found.longitude || prev.longitude,
              } : prev);
            }
          }
        } catch { /* best effort */ }
      }
    },
    [allActivities, toPlaceItem, mapLocations.length, trip?.destination],
  );

  const toggleSectionCollapse = useCallback((timeOfDay: string) => {
    setCollapsedSections((prev) => ({ ...prev, [timeOfDay]: !prev[timeOfDay] }));
    setAllCollapsedOverride(null);
  }, []);

  if (isLoading && days.length === 0) return <SkeletonItinerary />;
  if (!isLoading && days.length === 0) return <ItineraryEmpty />;

  return (
    <div className="relative overflow-hidden">
      <div className="relative z-10 pb-8">

        {/* ── Day selector — draggable to reorder ── */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2 mb-4">
          {days.map((d, i) => (
            <button
              key={`day-${i}`}
              draggable
              onDragStart={() => { dragDayRef.current = i; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={() => {
                if (dragDayRef.current !== null && dragDayRef.current !== i) {
                  swapDays(dragDayRef.current, i);
                  setSelectedDayIndex(i);
                }
                dragDayRef.current = null;
                setDragOverIdx(null);
              }}
              onDragEnd={() => { dragDayRef.current = null; setDragOverIdx(null); }}
              onClick={() => setSelectedDayIndex(i)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-center transition-all cursor-grab active:cursor-grabbing border ${
                dragOverIdx === i ? 'ring-2 ring-gray-400 dark:ring-white/40 scale-105' : ''
              } ${
                i === selectedDayIndex
                  ? 'bg-gray-100 dark:bg-white/[0.15] border-gray-300 dark:border-white/[0.25]'
                  : dragOverIdx === i
                    ? 'bg-gray-50 dark:bg-white/[0.08] border-transparent'
                    : 'bg-transparent border-transparent'
              }`}
            >
              <span className="block text-[10px] font-bold text-gray-500 dark:text-white/50">{d.dayLabel.replace('Day ', 'D')}</span>
              <span className="block text-[11px] font-medium text-gray-800 dark:text-white/80">{d.dateLabel.replace(/,.*/, '')}</span>
            </button>
          ))}
        </div>

        {/* ── AT A GLANCE section ── */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1 text-gray-500 dark:text-white/70">Your Itinerary</p>
                <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-wide"
                  style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>At a Glance</h2>
              </div>
              <TripHistoryToggle tripId={id} variant="pill" dark />
            </div>
            <div className="relative shrink-0 mr-2" ref={regenMenuRef}>
              <button
                onClick={() => !regenerating && setRegenMenuOpen(v => !v)}
                disabled={regenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/[0.2] transition-all disabled:opacity-50"
              >
                <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                {regenerating ? 'Working...' : 'Regenerate'}
                <ChevronDown size={10} className={`transition-transform ${regenMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {regenMenuOpen && !regenerating && (
                <div className="absolute right-0 top-full mt-1.5 z-50 animate-[fadeSlideIn_0.15s_ease-out]">
                  <div className="bg-white dark:bg-[#0f1f33] border border-gray-200 dark:border-white/15 rounded-xl p-1.5 shadow-2xl min-w-[200px] backdrop-blur-xl">
                    <p className="px-3 py-1 text-[9px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-semibold">Regenerate</p>
                    <button onClick={() => { setRegenMenuOpen(false); handleRegenerate(); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                      <RefreshCw size={11} /> Entire trip
                    </button>
                    <button onClick={() => { setRegenMenuOpen(false); handleRegenerateDay(selectedDayIndex); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                      <Calendar size={11} /> Day {selectedDayIndex + 1} only
                    </button>
                    <button onClick={() => { setRegenMenuOpen(false); handleFillEmpty(selectedDayIndex); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                      <Compass size={11} /> Fill empty slots
                    </button>
                    <div className="mx-2 my-1 h-px bg-gray-100 dark:bg-white/10" />
                    <p className="px-3 py-1 text-[9px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-semibold">Suggest for Day {selectedDayIndex + 1}</p>
                    <button onClick={() => { setRegenMenuOpen(false); handleSuggestActivity('restaurant', selectedDayIndex, 'evening'); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                      <UtensilsCrossed size={11} /> Restaurant
                    </button>
                    <button onClick={() => { setRegenMenuOpen(false); handleSuggestActivity('attraction', selectedDayIndex, 'morning'); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                      <Landmark size={11} /> Attraction
                    </button>
                    <button onClick={() => { setRegenMenuOpen(false); handleSuggestActivity('nightlife bar', selectedDayIndex, 'latenight'); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                      <Moon size={11} /> Nightlife
                    </button>
                    {trip?.trip_context?.lat && (
                      <>
                        <div className="mx-2 my-1 h-px bg-gray-100 dark:bg-white/10" />
                        <p className="px-3 py-1 text-[9px] uppercase tracking-wider text-gray-400 dark:text-white/30 font-semibold">Nearby</p>
                        <button onClick={() => { setRegenMenuOpen(false); handleSuggestActivity('restaurant', selectedDayIndex, 'evening', true); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                          <UtensilsCrossed size={11} /> Restaurant nearby
                        </button>
                        <button onClick={() => { setRegenMenuOpen(false); handleSuggestActivity('cafe coffee', selectedDayIndex, 'morning', true); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                          <MapPin size={11} /> Cafe nearby
                        </button>
                        <button onClick={() => { setRegenMenuOpen(false); handleSuggestActivity('things to do', selectedDayIndex, 'afternoon', true); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2">
                          <Compass size={11} /> Activity nearby
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md bg-gray-100/80 dark:bg-black/30">
              <span className="text-[11px] tabular-nums mr-1 text-gray-600 dark:text-white/70">
                {selectedDayIndex + 1} / {days.length}
              </span>
              <button onClick={() => selectedDayIndex > 0 && setSelectedDayIndex(selectedDayIndex - 1)} disabled={selectedDayIndex === 0}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20 border border-gray-300 dark:border-white/[0.25]">
                <ChevronDown size={14} className="rotate-90 text-gray-600 dark:text-white/70" />
              </button>
              <button onClick={() => selectedDayIndex < days.length - 1 && setSelectedDayIndex(selectedDayIndex + 1)} disabled={selectedDayIndex === days.length - 1}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20 border border-gray-300 dark:border-white/[0.25]">
                <ChevronDown size={14} className="-rotate-90 text-gray-600 dark:text-white/70" />
              </button>
              <a
                href={`/trip/${id}/calendar`}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all border border-gray-300 dark:border-white/[0.25]"
                title="Calendar view"
              >
                <Calendar size={13} className="text-gray-600 dark:text-white/70" />
              </a>
              <button
                onClick={() => setCompactOpen((v) => !v)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border border-gray-300 dark:border-white/[0.25] ${
                  compactOpen ? 'bg-gray-200 dark:bg-white/[0.2] text-gray-900 dark:text-white' : 'text-gray-600 dark:text-white/70'
                }`}
                title={compactOpen ? 'Hide day details' : 'Show day details'}
              >
                <LayoutList size={13} />
              </button>
              <div className="w-px h-4 mx-1 bg-gray-300 dark:bg-white/20" />
              <button
                onClick={() => setRequestMapOpen((v: boolean) => !v)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border border-gray-300 dark:border-white/[0.25] ${
                  requestMapOpen ? 'bg-gray-200 dark:bg-white/[0.2] text-gray-900 dark:text-white' : 'text-gray-600 dark:text-white/70'
                }`}
                title="Toggle map"
              >
                <Map size={13} />
              </button>
            </div>
          </div>

      {/* Glance View — always visible, swipe through days */}
        <GlanceView
          days={days}
          selectedDayIndex={selectedDayIndex}
          onSelectDay={setSelectedDayIndex}
          arrivalFlight={arrivalFlight}
          returnFlight={returnFlight}
          hotel={firstHotel}
          tripFlight={tripFlight}
          tripId={id}
          onActivityClick={handleActivityClick}
          addActivity={addActivity}
          removeActivity={removeActivity}
          updateActivity={updateActivity}
          moveActivityBefore={moveActivityBefore}
          destination={trip?.destination?.split(',')[0]?.trim()}
          heroImages={trip?.trip_context?.hero_images}
          tripLat={trip?.trip_context?.lat}
          tripLng={trip?.trip_context?.lng}
        />

      </section>

      {/* ── COMPACT VIEW — detailed day breakdown ── */}
      {compactOpen && selectedDay && (
        <section className="mt-8">
          <div className="mb-4">
            <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1 text-gray-500 dark:text-gray-400">
              {selectedDay.dateLabel}
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              {selectedDay.dayLabel} — {selectedDay.theme || 'Your Day'}
            </h2>
          </div>
        <div ref={contentRef}>
          {isFirstDay && arrivalFlight && (
            <FlightSection flight={arrivalFlight} collapsed={allCollapsedOverride ?? undefined} onBookFlight={() => { window.location.href = `/trip/${id}/flights` }} />
          )}
          {/* Flight placeholder on first day — links to Flights tab */}
          {isFirstDay && !arrivalFlight && tripFlight && (
            <section className="mb-3.5">
              <a href={`/trip/${id}/flights`} className="block rounded-xl p-3 shadow-sm border border-blue-200/60 dark:border-blue-500/20 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--trip-base)' }}>
                    <PaperPlane size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Arrival Flight</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Flight to {tripFlight.city} ({tripFlight.destAirport})</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Tap to search and select your flight</p>
                  </div>
                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 shrink-0">Search →</span>
                </div>
              </a>
            </section>
          )}
          {/* Hotel check-in on first day */}
          {isFirstDay && firstHotel && (
            <section className="mb-3.5">
              <a href={`/trip/${id}/hotels`} className="block rounded-xl p-3 shadow-sm border border-amber-200/60 dark:border-amber-500/20 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Hotel Check-in</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{firstHotel.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {firstHotel.price ? `$${firstHotel.price}/night · ` : firstHotel.price_per_night ? `$${firstHotel.price_per_night}/night · ` : ''}
                      {firstHotel.stars ? `${'★'.repeat(firstHotel.stars)} · ` : ''}
                      Check-in 3:00 PM
                    </p>
                  </div>
                  {firstHotel.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstHotel.image} alt={firstHotel.name}  className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  )}
                  <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-300 shrink-0">Change →</span>
                </div>
              </a>
            </section>
          )}

          {selectedDay.timeGroups.map((group) => (
            <div key={group.timeOfDay}>
              <TimeGroupSection
                group={group}
                onActivityClick={handleActivityClick}
                onAddActivity={(tod) => {
                  setAddingTo(addingTo === tod ? null : tod);
                  setAddCategory('All');
                }}
                cardStyle="pin"
                collapsed={collapsedSections[group.timeOfDay]}
                onToggleCollapse={toggleSectionCollapse}
              />
              {/* Browse & Add Activity Panel — Places-page style */}
              <div
                className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
                style={{
                  maxHeight: addingTo === group.timeOfDay ? '520px' : '0px',
                  opacity: addingTo === group.timeOfDay ? 1 : 0,
                  willChange: 'max-height, opacity',
                }}
              >
                <div className="mb-3 mx-0.5 bg-white dark:bg-[var(--muted)] rounded-xl border border-gray-200 dark:border-white/[0.10] shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'var(--trip-base)' }}>
                    <div className="flex items-center gap-2">
                      <Compass size={13} className="text-white/80" />
                      <span className="text-[12px] font-semibold text-white">
                        Add to {group.timeOfDay.charAt(0).toUpperCase() + group.timeOfDay.slice(1)}
                      </span>
                    </div>
                    <button onClick={() => { setAddingTo(null); setAddSearch(''); setAddCategory('All'); }} className="text-white/60 hover:text-white transition-colors">
                      <X size={13} />
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="px-3 pt-2.5">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search activities, tours, restaurants..."
                        value={addSearch}
                        onChange={(e) => setAddSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-[12px] bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.12] rounded-full focus:outline-none focus:ring-2 focus:ring-trip-base/20 focus:border-trip-base/30 dark:text-gray-200 dark:placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  {/* Category tabs — underline style like Places page */}
                  <div className="flex gap-0.5 px-3 pt-2 pb-0 overflow-x-auto scrollbar-hide border-b border-gray-100 dark:border-white/[0.06]">
                    {['All', 'Tours', 'Museums', 'Restaurants', 'Sightseeing', 'Nightlife'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setAddCategory(cat)}
                        className={`px-2.5 py-1.5 text-[11px] whitespace-nowrap border-b-2 transition-all ${
                          addCategory === cat
                            ? 'font-semibold'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-200 dark:hover:border-white/[0.12]'
                        }`}
                        style={addCategory === cat ? { borderColor: 'var(--trip-base)', color: 'var(--trip-base)' } : undefined}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Results grid — ItineraryPinCard masonry-style */}
                  <div className="px-3 py-3 max-h-[340px] overflow-y-auto">
                    {filteredDiscoverItems.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {filteredDiscoverItems.map((item, i) => (
                          <ItineraryPinCard
                            key={item.id}
                            item={item}
                            index={i}
                            accentColor="var(--trip-base)"
                            isFavorited={favorites.includes(item.id)}
                            onFavorite={toggleFavorite}
                            onClick={() => setSelectedPlace(toPlaceItem(item))}
                            onAddToItinerary={() => handleAddItem(item, group.timeOfDay)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Search size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">No results match your search</p>
                        <button onClick={() => { setAddSearch(''); setAddCategory('All'); }} className="text-[11px] mt-1 hover:underline" style={{ color: 'var(--trip-base)' }}>Clear filters</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Hotel checkout + return flight on last day */}
          {isLastDay && (
            <>
              {firstHotel && (
                <section className="mb-3.5">
                  <div className="rounded-xl p-3 shadow-sm border border-blue-200/60 dark:border-blue-500/20 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Hotel Check-out</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{firstHotel.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Check-out 11:00 AM</p>
                      </div>
                    </div>
                  </div>
                </section>
              )}
              {returnFlight && <FlightSection flight={returnFlight} collapsed={allCollapsedOverride ?? undefined} onBookFlight={() => { window.location.href = `/trip/${id}/flights` }} />}
              {!returnFlight && tripFlight && (
                <section className="mb-3.5">
                  <a href={`/trip/${id}/flights`} className="block rounded-xl p-3 shadow-sm border border-blue-200/60 dark:border-blue-500/20 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--trip-base)' }}>
                        <PaperPlane size={14} className="text-white rotate-180" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Return Flight</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Flight home from {tripFlight.city} ({tripFlight.destAirport})</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">Tap to search and select your flight</p>
                      </div>
                      <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 shrink-0">Search →</span>
                    </div>
                  </a>
                </section>
              )}
            </>
          )}

          {selectedDay.notes && (
            <div className="bg-gray-50 dark:bg-white/[0.04] rounded-[10px] p-3 mt-1 mb-3 border border-gray-100 dark:border-white/[0.06]">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-[18px]">{selectedDay.notes}</p>
            </div>
          )}
        </div>
        </section>
      )}

      {/* Detail overlay — AnimatePresence allows exit animations to play */}
      <AnimatePresence>
        {selectedPlace && (
          <PlaceDetailOverlay
            place={selectedPlace}
            isFavorited={favorites.includes(selectedPlace.id)}
            onToggleFavorite={() => toggleFavorite(selectedPlace.id)}
            onClose={() => { setSelectedPlace(null); setSelectedActivityIndex(null); setBrowseIndex(null); }}
            minimal
          />
        )}
      </AnimatePresence>
      </div>{/* end z-10 */}

      {/* ── Floating Add Activity Button ── */}
      {selectedDay && !addingTo && !selectedPlace && (
        <button
          onClick={() => {
            // Find the current time-of-day to pre-select the right section
            const hour = new Date().getHours();
            const tod = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 21 ? 'Evening' : 'Late Night';
            setAddingTo(tod);
            setAddCategory('All');
          }}
          className="fixed bottom-8 right-8 z-30 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-xl"
          style={{
            backgroundColor: 'var(--trip-base, #1e3a5f)',
            color: '#fff',
          }}
        >
          <span className="text-lg leading-none">+</span>
          <span className="text-sm font-semibold">Add Activity</span>
        </button>
      )}
    </div>
  );
}
