'use client';

import { use, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useItineraryScreen, MOCK_FLIGHT_DETAILS, MOCK_HOTEL_DETAIL, MOCK_DISCOVER_ACTIVITIES, GLANCE_HERO_IMAGES } from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';
import { useItineraryContext } from '@/components/itinerary/ItineraryContext';
import {
  ItineraryEmpty, TimeGroupSection, SplitScreenModal,
  FlightSection, HotelSection, CheckoutSection,
} from '@/components/itinerary';
import type { MapLocation } from '@/components/leaflet-map';
import { ItineraryPinCard } from '@/components/itinerary/ItineraryPinCard';
import { TripMagazineHero } from '@/components/trip/TripMagazineHero';
import {
  ChevronDown, X, Search, Compass, LayoutList, Plane, Map, Plus,
} from 'lucide-react';
import { TIME_OF_DAY_CONFIG, getActivityTypeColor } from '@travyl/shared';
import type { ItineraryDayViewModel } from '@travyl/shared';

// ─── Mock activity coordinates (keyed by activity id) ────────────
const MOCK_ACTIVITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'mock-a1': { lat: 48.8584, lng: 2.2945 },
  'mock-a2': { lat: 48.8590, lng: 2.2930 },
  'mock-a3': { lat: 48.8510, lng: 2.3360 },
  'mock-a4': { lat: 48.8606, lng: 2.3376 },
  'mock-a5': { lat: 48.8584, lng: 2.2945 },
  'mock-a6': { lat: 48.8867, lng: 2.3431 },
  'mock-a7': { lat: 48.8049, lng: 2.1204 },
  'mock-a8': { lat: 48.8048, lng: 2.1172 },
  'mock-a9': { lat: 48.8698, lng: 2.3075 },
};


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

// ─── Glance View ────────────────────────────────────────────────


function GlanceView({
  days,
  selectedDayIndex,
  onSelectDay,
  arrivalFlight,
  returnFlight,
  onActivityClick,
}: {
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (i: number) => void;
  arrivalFlight?: typeof MOCK_FLIGHT_DETAILS[number];
  returnFlight?: typeof MOCK_FLIGHT_DETAILS[number];
  onActivityClick?: (activityId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement;
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  return (
    <div className="w-full">
      {/* Horizontal scroll cards — same pattern as Things to Do */}
      <div ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        onScroll={(e) => {
          const el = e.currentTarget;
          const idx = Math.round(el.scrollLeft / ((el.firstElementChild as HTMLElement)?.offsetWidth || 1));
          onSelectDay(Math.min(idx, days.length - 1));
        }}>
        {days.map((day, i) => {
          const heroImg = GLANCE_HERO_IMAGES[i % GLANCE_HERO_IMAGES.length];
          const isFirst = i === 0;
          const isLast = i === days.length - 1;
          return (
            <div key={day.id} className="flex-shrink-0 w-full rounded-xl overflow-hidden snap-start flex" style={{ height: 280 }}>
              {/* Left — activity list */}
              <div className="w-[40%] shrink-0 bg-[#1a1a2e] p-4 flex flex-col">
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
                      <Plane size={10} className="shrink-0" style={{ color: '#4ade80' }} />
                      <span className="text-[10px] font-semibold text-white/80">Arrive — {arrivalFlight.flightNumber}</span>
                      <span className="text-[9px] ml-auto text-white/40">{arrivalFlight.arrivalTime}</span>
                    </div>
                  )}

                  {day.timeGroups.map((group) => {
                    const config = TIME_OF_DAY_CONFIG[group.timeOfDay as keyof typeof TIME_OF_DAY_CONFIG];
                    return (
                      <div key={group.timeOfDay} className="mb-1.5 last:mb-0">
                        <p className="text-[7px] font-bold tracking-[0.2em] uppercase mb-0.5"
                          style={{ color: 'var(--magazine-accent, #c8a96a)', opacity: 0.7 }}>
                          {config.label}
                        </p>
                        {group.activities.map((activity) => {
                          const catColor = getActivityTypeColor(activity.category);
                          return (
                            <div key={activity.id}
                              onClick={() => onActivityClick?.(activity.id)}
                              className="flex items-center gap-2 py-[2px] cursor-pointer group/row">
                              <span className="text-[9px] w-[44px] shrink-0 tabular-nums text-white/40">
                                {activity.startTime || '—'}
                              </span>
                              <div className="w-[4px] h-[4px] rounded-full shrink-0" style={{ backgroundColor: catColor.primary }} />
                              <span className="text-[11px] flex-1 truncate font-medium text-white/80 group-hover/row:text-white transition-colors">
                                {activity.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                  {isLast && returnFlight && (
                    <div className="flex items-center gap-2 mt-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <Plane size={10} className="shrink-0 rotate-180" style={{ color: '#60a5fa' }} />
                      <span className="text-[10px] font-semibold text-white/80">Depart — {returnFlight.flightNumber}</span>
                      <span className="text-[9px] ml-auto text-white/40">{returnFlight.departureTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right — destination image 60% */}
              <div className="flex-1 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroImg} alt={day.dayLabel} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
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
    days, addActivity,
    collapsedSections, setCollapsedSections,
    allCollapsedOverride, setAllCollapsedOverride,
    selectedDayIndex, setSelectedDayIndex,
    setMapMarkers, setSelectedMarkerId, setRequestMapOpen,
  } = useItineraryContext();
  const selectedDay = days[selectedDayIndex] ?? null;
  const contentRef = useRef<HTMLDivElement>(null);

  const [glanceMode, setGlanceMode] = useState(true);
  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState('All');
  const [addSearch, setAddSearch] = useState('');
  const [browseIndex, setBrowseIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const arrivalFlight = MOCK_FLIGHT_DETAILS.find((f) => f.type === 'arrival');
  const returnFlight = MOCK_FLIGHT_DETAILS.find((f) => f.type === 'return');

  const filteredDiscoverItems = useMemo(() => {
    let items = MOCK_DISCOVER_ACTIVITIES;
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
  }, [addSearch, addCategory]);

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
    if (!selectedDay) return [];
    const items: DiscoverItem[] = [];
    for (const group of selectedDay.timeGroups) {
      for (const a of group.activities) {
        items.push({
          id: a.id,
          name: a.name,
          location: a.locationName || 'Paris, France',
          description: a.notes || `${a.category} activity scheduled for ${a.timeDisplay || 'this day'}`,
          images: [],
          rating: 4.5,
          tags: [a.category, group.timeOfDay, a.costDisplay || ''].filter(Boolean),
          price: a.costDisplay || undefined,
          category: a.category,
          isBooked: true,
          bookedDay: selectedDay.dayNumber,
          bookedTime: a.startTime || undefined,
          bookingUrl: a.bookingUrl || undefined,
        });
      }
    }
    return items;
  }, [selectedDay]);

  const mapLocations: MapLocation[] = useMemo(() => {
    if (!selectedDay) return [];
    return selectedDay.timeGroups.flatMap((g) =>
      g.activities
        .filter((a) => MOCK_ACTIVITY_COORDS[a.id])
        .map((a) => ({
          id: a.id,
          lat: MOCK_ACTIVITY_COORDS[a.id].lat,
          lng: MOCK_ACTIVITY_COORDS[a.id].lng,
          name: a.name,
          color: getActivityTypeColor(a.category).primary,
          category: a.category,
        })),
    );
  }, [selectedDay]);

  // Push markers to layout map
  useEffect(() => {
    if (mapLocations.length > 0) {
      setMapMarkers(mapLocations);
      setRequestMapOpen(true);
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

  const handleActivityClick = useCallback(
    (activityId: string) => {
      const idx = allActivities.findIndex((a) => a.id === activityId);
      if (idx >= 0) setSelectedActivityIndex(idx);
    },
    [allActivities],
  );

  const toggleSectionCollapse = useCallback((timeOfDay: string) => {
    setCollapsedSections((prev) => ({ ...prev, [timeOfDay]: !prev[timeOfDay] }));
    setAllCollapsedOverride(null);
  }, []);

  if (isLoading) return <SkeletonItinerary />;
  if (isEmpty) return <ItineraryEmpty />;

  return (
    <div className="relative">
      {/* ── Shared hero — same component as overview ── */}
      <TripMagazineHero tripId={id} trip={trip} />

      <div className="relative z-10 px-6 sm:px-10">

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
              <p className="text-[10px] tracking-[0.3em] uppercase font-semibold mb-1"
                style={{ color: 'var(--magazine-accent, #c8a96a)' }}>Your Itinerary</p>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif"
                style={{ color: 'var(--magazine-heading, var(--foreground))' }}>At a Glance</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] tabular-nums mr-1" style={{ color: 'var(--magazine-text, var(--muted-foreground))' }}>
                {selectedDayIndex + 1} / {days.length}
              </span>
              <button onClick={() => selectedDayIndex > 0 && setSelectedDayIndex(selectedDayIndex - 1)} disabled={selectedDayIndex === 0}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
                style={{ border: '1px solid var(--magazine-border, rgba(0,0,0,0.15))' }}>
                <ChevronDown size={14} className="rotate-90" style={{ color: 'var(--magazine-text, var(--muted-foreground))' }} />
              </button>
              <button onClick={() => selectedDayIndex < days.length - 1 && setSelectedDayIndex(selectedDayIndex + 1)} disabled={selectedDayIndex === days.length - 1}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
                style={{ border: '1px solid var(--magazine-border, rgba(0,0,0,0.15))' }}>
                <ChevronDown size={14} className="-rotate-90" style={{ color: 'var(--magazine-text, var(--muted-foreground))' }} />
              </button>
              <button
                onClick={() => {
                  setGlanceMode(false);
                  setAddingTo('morning');
                  setAddCategory('All');
                  setAddSearch('');
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all ml-1"
                style={{ backgroundColor: 'rgba(200,169,106,0.15)', border: '1px solid rgba(200,169,106,0.25)' }}
                title="Add activity"
              >
                <Plus size={13} style={{ color: 'var(--magazine-accent, #c8a96a)' }} />
              </button>
              <button
                onClick={() => setRequestMapOpen((v: boolean) => !v)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{ border: '1px solid var(--magazine-border, rgba(0,0,0,0.15))' }}
                title="Toggle map"
              >
                <Map size={13} style={{ color: 'var(--magazine-text, var(--muted-foreground))' }} />
              </button>
              <button
                onClick={() => setGlanceMode((v) => !v)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{
                  border: '1px solid var(--magazine-border, rgba(0,0,0,0.15))',
                  backgroundColor: glanceMode ? 'var(--magazine-accent, #c8a96a)' : 'transparent',
                  color: glanceMode ? 'white' : 'var(--magazine-text, var(--muted-foreground))',
                }}
                title={glanceMode ? 'Detailed view' : 'At a glance'}
              >
                <LayoutList size={13} />
              </button>
            </div>
          </div>

      {/* Glance View — swipe through days */}
      {glanceMode && (
        <GlanceView
          days={days}
          selectedDayIndex={selectedDayIndex}
          onSelectDay={setSelectedDayIndex}
          arrivalFlight={arrivalFlight}
          returnFlight={returnFlight}
          onActivityClick={handleActivityClick}
        />
      )}

      </section>

      {/* Day Content (detailed view) */}
      {!glanceMode && selectedDay && (
        <div ref={contentRef}>
          {isFirstDay && arrivalFlight && (
            <FlightSection flight={arrivalFlight} collapsed={allCollapsedOverride ?? undefined} />
          )}
          {isFirstDay && (
            <HotelSection hotel={MOCK_HOTEL_DETAIL} label="Check-in · Mar 10" collapsed={allCollapsedOverride ?? undefined} />
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
                            onClick={() => setBrowseIndex(filteredDiscoverItems.indexOf(item))}
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

          {!isFirstDay && !isLastDay && (
            <HotelSection hotel={MOCK_HOTEL_DETAIL} label={`Night ${selectedDay.dayNumber} · ${selectedDay.dateLabel}`} collapsed={allCollapsedOverride ?? undefined} />
          )}

          {isLastDay && (
            <>
              <CheckoutSection
                hotelName={MOCK_HOTEL_DETAIL.name}
                hotelAddress={MOCK_HOTEL_DETAIL.address}
                checkOutTime={MOCK_HOTEL_DETAIL.checkOutTime}
                collapsed={allCollapsedOverride ?? undefined}
              />
              {returnFlight && <FlightSection flight={returnFlight} collapsed={allCollapsedOverride ?? undefined} />}
            </>
          )}

          {selectedDay.notes && (
            <div className="bg-gray-50 dark:bg-white/[0.04] rounded-[10px] p-3 mt-1 mb-3 border border-gray-100 dark:border-white/[0.06]">
              <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-[18px]">{selectedDay.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Split Screen Modal — booked activities */}
      {selectedActivityIndex !== null && allActivities.length > 0 && (
        <SplitScreenModal
          items={allActivities}
          initialIndex={selectedActivityIndex}
          accentColor="var(--trip-base)"
          favorites={favorites}
          onClose={() => setSelectedActivityIndex(null)}
          onFavorite={toggleFavorite}
        />
      )}

      {/* Split Screen Modal — browse/discover activities */}
      {browseIndex !== null && filteredDiscoverItems.length > 0 && (
        <SplitScreenModal
          items={filteredDiscoverItems}
          initialIndex={browseIndex}
          accentColor="var(--trip-base)"
          favorites={favorites}
          onClose={() => setBrowseIndex(null)}
          onFavorite={toggleFavorite}
        />
      )}
      </div>{/* end z-10 */}
    </div>
  );
}
