'use client';

import { use, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useItineraryScreen, GLANCE_HERO_IMAGES, TOD_START_HOURS, QUICK_FILL_CATEGORIES, pickRandomActivity } from '@travyl/shared';
import type { MockFlightDetail, PlaceItem } from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';
import { useItineraryContext } from '@/components/itinerary/ItineraryContext';
import {
  ItineraryEmpty, TimeGroupSection,
  FlightSection,
} from '@/components/itinerary';
import type { MapLocation } from '@/components/leaflet-map';
import { ItineraryPinCard } from '@/components/itinerary/ItineraryPinCard';
import { PlaceDetailModal } from '@/components/trip/PlaceDetailModal';
import {
  ChevronDown, X, Search, Compass, LayoutList, Map, Calendar, RefreshCw,
  Landmark, UtensilsCrossed, Footprints, TreePine, Theater, ShoppingBag,
  Moon, MapPin, Bus, Heart, GripVertical,
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

function GlanceSearchInput({ query, onChange, onClose, onSelect, destination }: {
  query: string;
  onChange: (q: string) => void;
  onClose: () => void;
  onSelect: (place: import('@travyl/shared').PlaceItem) => void;
  destination?: string;
}) {
  const [results, setResults] = useState<import('@travyl/shared').PlaceItem[]>([]);
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const q = destination ? `${query} ${destination}` : query;
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}&limit=6`);
        if (res.ok) setResults(await res.json());
      } catch { /* ignore */ }
    }, 300); // debounce
    return () => clearTimeout(timeout);
  }, [query, destination]);
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



function GlanceView({
  days,
  selectedDayIndex,
  onSelectDay,
  arrivalFlight,
  returnFlight,
  onActivityClick,
  addActivity,
  removeActivity,
  updateActivity,
  moveActivityBefore,
  destination,
  heroImages,
}: {
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (i: number) => void;
  arrivalFlight?: MockFlightDetail;
  returnFlight?: MockFlightDetail;
  onActivityClick?: (activityId: string) => void;
  addActivity?: (activity: import('@travyl/shared').CalendarActivity) => void;
  removeActivity?: (id: string) => void;
  updateActivity?: (id: string, updates: Partial<import('@travyl/shared').CalendarActivity>) => void;
  moveActivityBefore?: (dragId: string, targetId: string) => void;
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
    <div className="w-full" data-no-page-swipe>
      {/* Horizontal scroll cards — draggable */}
      <div ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory cursor-grab select-none"
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
          // Use the first activity image for this day, then trip hero images, then fallback
          const firstActivityImage = day.timeGroups
            .flatMap(g => g.activities)
            .map(a => a.image)
            .find(Boolean);
          const heroImg = firstActivityImage
            || heroImages?.[i % (heroImages?.length || 1)]
            || GLANCE_HERO_IMAGES[i % GLANCE_HERO_IMAGES.length];
          const isFirst = i === 0;
          const isLast = i === days.length - 1;
          return (
            <div key={day.id} className="flex-shrink-0 w-full rounded-xl overflow-hidden snap-start flex" style={{ height: 'auto' }}>
              {/* Left — activity list */}
              <div className="w-[40%] shrink-0 bg-[#1a1a2e] px-4 py-3 flex flex-col">
                {/* Day header */}
                <div className="mb-2">
                  <p className="text-[9px] tracking-[0.3em] uppercase font-semibold mb-0.5"
                    style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
                    {day.dateLabel}
                  </p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-base font-bold font-serif text-white">{day.dayLabel}</h3>
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
                                type: item.category || 'activity',
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
                        <p className="text-[7px] font-bold tracking-[0.2em] uppercase mb-0.5"
                          style={{ color: 'var(--magazine-accent, #c8a96a)', opacity: 0.7 }}>
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
                                className="text-[11px] flex-1 truncate font-medium text-white/80 hover:text-white transition-colors cursor-pointer">
                                {activity.name}
                              </span>
                              {activity.timeDisplay && (
                                <span className="text-[8px] text-white/30 shrink-0 tabular-nums">{activity.timeDisplay}</span>
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
                                        type: item.category || 'activity',
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

                  {isLast && returnFlight && (
                    <div className="flex items-center gap-2 mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <PaperPlane size={10} className="shrink-0 rotate-180" style={{ color: '#60a5fa' }} />
                      <span className="text-[10px] font-semibold text-white/80">Depart — {returnFlight.flightNumber}</span>
                      <span className="text-[9px] ml-auto text-white/40">{returnFlight.departureTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right — destination image fills full height */}
              <div className="flex-1 relative min-h-[300px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImg} alt={day.dayLabel} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/40 to-transparent" />
                {/* Day label overlay at bottom */}
                <div className="absolute bottom-3 right-3">
                  <p className="text-sm font-bold text-white/60 font-serif" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
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
  } = useItineraryContext();
  const selectedDay = days[selectedDayIndex] ?? null;
  const contentRef = useRef<HTMLDivElement>(null);

  const [compactOpen, setCompactOpen] = useState(false);
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState('All');
  const [addSearch, setAddSearch] = useState('');
  const [browseIndex, setBrowseIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const arrivalFlight: MockFlightDetail | undefined = undefined; // TODO: wire up real flight data
  const returnFlight: MockFlightDetail | undefined = undefined; // TODO: wire up real flight data

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
      type: item.category ?? 'sightseeing',
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

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  }, []);

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
            description: a.notes || `${a.category} activity`,
            images: [],
            rating: 0,
            tags: [a.category, group.timeOfDay, a.costDisplay || ''].filter(Boolean),
            price: a.costDisplay || undefined,
            category: a.category,
            isBooked: true,
            bookedDay: day.dayNumber,
            bookedTime: a.startTime || undefined,
            bookingUrl: a.bookingUrl || undefined,
          });
        }
      }
    }
    return items;
  }, [days]);

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
    type: /restaurant|food|culinary|dining/i.test(item.category || '') ? 'restaurant' : 'attraction',
    rating: item.rating || 0,
    tagline: item.description || item.category || '',
    category: item.category || '',
    description: item.description,
    tags: item.tags,
    latitude: trip?.trip_context?.lat,
    longitude: trip?.trip_context?.lng,
    address: item.location,
    website: item.bookingUrl,
  }), [trip]);

  const handleActivityClick = useCallback(
    (activityId: string) => {
      const item = allActivities.find((a) => a.id === activityId);
      if (item) {
        setSelectedPlace(toPlaceItem(item));
        if (mapLocations.length > 0) {
          setRequestMapOpen(true);
          setSelectedMarkerId(activityId);
        }
      }
    },
    [allActivities, toPlaceItem, mapLocations.length],
  );

  const toggleSectionCollapse = useCallback((timeOfDay: string) => {
    setCollapsedSections((prev) => ({ ...prev, [timeOfDay]: !prev[timeOfDay] }));
    setAllCollapsedOverride(null);
  }, []);

  if (isLoading && days.length === 0) return <SkeletonItinerary />;
  if (!isLoading && days.length === 0) return <ItineraryEmpty />;

  return (
    <div className="relative overflow-hidden">
      <div className="relative z-10 px-6 sm:px-10 pb-8">

        {/* ── Day selector ── */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2 mb-4">
          {days.map((d, i) => (
            <button
              key={d.dayNumber}
              onClick={() => setSelectedDayIndex(i)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-center transition-all"
              style={{
                backgroundColor: i === selectedDayIndex ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: i === selectedDayIndex ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
              }}
            >
              <span className="block text-[10px] font-bold text-white/50">{d.dayLabel.replace('Day ', 'D')}</span>
              <span className="block text-[11px] font-medium text-white/80">{d.dateLabel.replace(/,.*/, '')}</span>
            </button>
          ))}
        </div>

        {/* ── AT A GLANCE section ── */}
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1 text-white/70"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>Your Itinerary</p>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>At a Glance</h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
              <span className="text-[11px] tabular-nums mr-1 text-white/70">
                {selectedDayIndex + 1} / {days.length}
              </span>
              <button onClick={() => selectedDayIndex > 0 && setSelectedDayIndex(selectedDayIndex - 1)} disabled={selectedDayIndex === 0}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
                style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
                <ChevronDown size={14} className="rotate-90 text-white/70" />
              </button>
              <button onClick={() => selectedDayIndex < days.length - 1 && setSelectedDayIndex(selectedDayIndex + 1)} disabled={selectedDayIndex === days.length - 1}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
                style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
                <ChevronDown size={14} className="-rotate-90 text-white/70" />
              </button>
              <a
                href={`/trip/${id}/calendar`}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{ border: '1px solid rgba(255,255,255,0.25)' }}
                title="Calendar view"
              >
                <Calendar size={13} className="text-white/70" />
              </a>
              <button
                onClick={() => setCompactOpen((v) => !v)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{
                  border: '1px solid rgba(255,255,255,0.25)',
                  backgroundColor: compactOpen ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: compactOpen ? 'white' : 'rgba(255,255,255,0.7)',
                }}
                title={compactOpen ? 'Hide day details' : 'Show day details'}
              >
                <LayoutList size={13} />
              </button>
              <div className="w-px h-4 mx-1 bg-white/20" />
              <button
                onClick={() => setRequestMapOpen((v: boolean) => !v)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{
                  border: '1px solid rgba(255,255,255,0.25)',
                  backgroundColor: requestMapOpen ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: requestMapOpen ? 'white' : 'rgba(255,255,255,0.7)',
                }}
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
          onActivityClick={handleActivityClick}
          addActivity={addActivity}
          removeActivity={removeActivity}
          updateActivity={updateActivity}
          moveActivityBefore={moveActivityBefore}
          destination={trip?.destination?.split(',')[0]?.trim()}
          heroImages={trip?.trip_context?.hero_images}
        />

      </section>

      {/* ── COMPACT VIEW — detailed day breakdown ── */}
      {compactOpen && selectedDay && (
        <section className="mt-8">
          <div className="mb-4">
            <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1"
              style={{ color: 'var(--magazine-accent, #c8a96a)' }}>
              {selectedDay.dateLabel}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold font-serif"
              style={{ color: 'var(--magazine-heading, #1a1a2e)' }}>
              {selectedDay.dayLabel} — {selectedDay.theme || 'Your Day'}
            </h2>
          </div>
        <div ref={contentRef}>
          {isFirstDay && arrivalFlight && (
            <FlightSection flight={arrivalFlight} collapsed={allCollapsedOverride ?? undefined} />
          )}
          {/* TODO: wire up real hotel check-in data */}

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
                        <Search size={24} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">No results match your search</p>
                        <button onClick={() => { setAddSearch(''); setAddCategory('All'); }} className="text-[11px] mt-1 hover:underline" style={{ color: 'var(--trip-base)' }}>Clear filters</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* TODO: wire up real hotel data for non-first/non-last days */}

          {isLastDay && (
            <>
              {/* TODO: wire up real hotel checkout data */}
              {returnFlight && <FlightSection flight={returnFlight} collapsed={allCollapsedOverride ?? undefined} />}
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

      {/* Detail overlay — same as places page */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          isFavorited={favorites.includes(selectedPlace.id)}
          onToggleFavorite={() => toggleFavorite(selectedPlace.id)}
          onClose={() => { setSelectedPlace(null); setSelectedActivityIndex(null); setBrowseIndex(null); }}
        />
      )}
      </div>{/* end z-10 */}
    </div>
  );
}
