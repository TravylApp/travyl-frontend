'use client';

import { use, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useItineraryScreen, MOCK_FLIGHT_DETAILS, MOCK_HOTEL_DETAIL, MOCK_DESTINATION_COORDS, MOCK_DISCOVER_ACTIVITIES } from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';
import { useItineraryContext } from '@/components/itinerary/ItineraryContext';
import {
  DaySelector, ItineraryEmpty, TimeGroupSection, SplitScreenModal,
  FlightSection, HotelSection, CheckoutSection,
} from '@/components/itinerary';
import type { MapLocation } from '@/components/leaflet-map';
import { ItineraryPinCard } from '@/components/itinerary/ItineraryPinCard';
import {
  ChevronDown, X, Search, Plus, Compass, LayoutList, Star,
  Sun, Sunset, Moon, Sparkles, Plane, Building2, MapPin, Clock, Camera,
  UtensilsCrossed, Compass as CompassIcon, TreePine, Theater, ShoppingBag,
  Music, Dumbbell, Bus, Eye,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
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

const CATEGORY_COLORS: Record<string, string> = {
  sightseeing: 'var(--trip-base)',
  tour: 'var(--trip-base)',
  dining: 'var(--trip-base)',
  cultural: 'var(--trip-base)',
  shopping: 'var(--trip-base)',
  nightlife: 'var(--trip-base)',
  outdoor: 'var(--trip-base)',
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

const TOD_ICONS = { sun: Sun, sunset: Sunset, moon: Moon, sparkles: Sparkles } as const;

const CATEGORY_ICONS: Record<string, typeof Camera> = {
  sightseeing: Eye,
  landmark: Camera,
  tour: CompassIcon,
  dining: UtensilsCrossed,
  food: UtensilsCrossed,
  outdoor: TreePine,
  cultural: Theater,
  shopping: ShoppingBag,
  nightlife: Music,
  wellness: Dumbbell,
  transport: Bus,
};

function GlanceDayCard({
  day,
  isFirst,
  isLast,
  arrivalFlight,
  returnFlight,
  hotel,
  onAddActivity,
  addingTo,
  discoverItems,
  addSearch,
  onSearchChange,
  addCategory,
  onCategoryChange,
  favorites,
  onFavorite,
  onBrowse,
  onAddItem,
  onCloseAdd,
}: {
  day: ItineraryDayViewModel;
  isFirst: boolean;
  isLast: boolean;
  arrivalFlight?: typeof MOCK_FLIGHT_DETAILS[number];
  returnFlight?: typeof MOCK_FLIGHT_DETAILS[number];
  hotel: typeof MOCK_HOTEL_DETAIL;
  onAddActivity?: (timeOfDay: string) => void;
  addingTo?: string | null;
  discoverItems?: DiscoverItem[];
  addSearch?: string;
  onSearchChange?: (q: string) => void;
  addCategory?: string;
  onCategoryChange?: (cat: string) => void;
  favorites?: string[];
  onFavorite?: (id: string) => void;
  onBrowse?: (index: number) => void;
  onAddItem?: (item: DiscoverItem, timeOfDay: string) => void;
  onCloseAdd?: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Day header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: 'var(--trip-base)' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white text-[11px] font-bold">
            {day.dayNumber}
          </span>
          <div>
            <span className="text-[13px] font-semibold text-white">{day.dayLabel}</span>
            <span className="text-[11px] text-white/70 ml-2">{day.dateLabel}</span>
          </div>
        </div>
        <span className="text-[11px] text-white/60">
          {day.activityCount} {day.activityCount === 1 ? 'activity' : 'activities'}
        </span>
      </div>

      {/* Day content — compact timeline */}
      <div className="px-4 py-3 space-y-1">
        {/* Arrival flight */}
        {isFirst && arrivalFlight && (
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <Plane size={13} className="text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[12px] font-medium text-gray-900">Arrive — {arrivalFlight.flightNumber}</span>
              <span className="text-[11px] text-gray-400 ml-2">{arrivalFlight.arrivalTime}</span>
            </div>
            <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Booked</span>
          </div>
        )}

        {/* Hotel check-in */}
        {isFirst && (
          <div className="flex items-center gap-3 py-1.5 border-b border-gray-100">
            <Building2 size={13} className="text-blue-600 shrink-0" />
            <span className="text-[12px] font-medium text-gray-900">{hotel.name}</span>
            <span className="text-[11px] text-gray-400">Check-in</span>
          </div>
        )}

        {/* Time groups */}
        {day.timeGroups.map((group) => {
          const config = TIME_OF_DAY_CONFIG[group.timeOfDay as keyof typeof TIME_OF_DAY_CONFIG];
          const Icon = TOD_ICONS[config.icon as keyof typeof TOD_ICONS] ?? Sun;

                return (
                  <div key={group.timeOfDay}>
                    {/* Time-of-day label */}
                    <div className="flex items-center gap-2 pt-2 pb-1">
                      <Icon size={12} style={{ color: 'var(--trip-base)' }} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--trip-base)' }}>
                        {config.label}
                      </span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* Activities */}
                    {group.activities.map((activity) => {
                      const catColor = getActivityTypeColor(activity.category);
                      const CatIcon = CATEGORY_ICONS[activity.category] ?? Eye;

                      return (
                        <div
                          key={activity.id}
                          className="flex items-center gap-2.5 py-1.5 pl-1 group hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          {/* Category icon */}
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                            style={{ backgroundColor: catColor.bg, border: `1px solid ${catColor.border}` }}
                          >
                            <CatIcon size={11} style={{ color: catColor.primary }} />
                          </div>

                          {/* Name + location */}
                          <div className="flex-1 min-w-0">
                            <span className="text-[12px] font-medium text-gray-900">{activity.name}</span>
                            {activity.locationName && (
                              <span className="text-[11px] text-gray-400 ml-1.5">
                                <MapPin size={9} className="inline -mt-0.5 mr-0.5" />
                                {activity.locationName}
                              </span>
                            )}
                          </div>

                          {/* Category pill */}
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 capitalize"
                            style={{ backgroundColor: catColor.bg, color: catColor.primary }}
                          >
                            {activity.category}
                          </span>

                          {/* Time + cost */}
                          <div className="flex items-center gap-2 shrink-0">
                            {activity.startTime && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                <Clock size={9} />
                                {activity.startTime}
                              </span>
                            )}
                            {activity.costDisplay && (
                              <span className="text-[10px] font-medium text-gray-500">{activity.costDisplay}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add activity button */}
                    {onAddActivity && (
                      <button
                        onClick={() => onAddActivity(group.timeOfDay)}
                        className="flex items-center gap-1.5 py-1.5 pl-1 text-[11px] font-medium opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--trip-base)' }}
                      >
                        <Plus size={12} />
                        Add Activity
                      </button>
                    )}

                    {/* Inline explore panel */}
                    <div
                      className="overflow-hidden transition-all duration-300 ease-out"
                      style={{
                        maxHeight: addingTo === group.timeOfDay ? '320px' : '0px',
                        opacity: addingTo === group.timeOfDay ? 1 : 0,
                      }}
                    >
                      <div className="pt-2 pb-1">
                        {/* Search + close */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="relative flex-1">
                            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Search activities..."
                              value={addSearch ?? ''}
                              onChange={(e) => onSearchChange?.(e.target.value)}
                              className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-1"
                              style={{ '--tw-ring-color': 'var(--trip-base)' } as React.CSSProperties}
                            />
                          </div>
                          <button
                            onClick={onCloseAdd}
                            className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                          >
                            <X size={10} className="text-gray-500" />
                          </button>
                        </div>

                        {/* Category pills */}
                        <div className="flex gap-1 mb-2 overflow-x-auto scrollbar-hide">
                          {['All', 'Tours', 'Museums', 'Restaurants', 'Sightseeing', 'Nightlife'].map((cat) => (
                            <button
                              key={cat}
                              onClick={() => onCategoryChange?.(cat)}
                              className={`px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-all ${
                                addCategory === cat
                                  ? 'text-white font-semibold'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                              style={addCategory === cat ? { backgroundColor: 'var(--trip-base)' } : undefined}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>

                        {/* Horizontal scroll of discover cards */}
                        {discoverItems && discoverItems.length > 0 ? (
                          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                            {discoverItems.slice(0, 8).map((item, i) => (
                              <div
                                key={item.id}
                                className="shrink-0 w-[140px] rounded-lg border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow cursor-pointer group"
                              >
                                {/* Image */}
                                <div
                                  className="h-[80px] bg-gray-100 relative overflow-hidden"
                                  onClick={() => onBrowse?.(i)}
                                >
                                  {item.images?.[0] ? (
                                    <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Camera size={16} className="text-gray-300" />
                                    </div>
                                  )}
                                  {item.rating && (
                                    <span className="absolute top-1 left-1 bg-black/50 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                      <Star size={8} className="fill-amber-400 text-amber-400" /> {item.rating}
                                    </span>
                                  )}
                                </div>
                                {/* Info */}
                                <div className="px-2 py-1.5">
                                  <p className="text-[11px] font-medium text-gray-900 truncate">{item.name}</p>
                                  {item.price && (
                                    <p className="text-[10px] text-gray-400">{item.price}</p>
                                  )}
                                  <button
                                    onClick={() => onAddItem?.(item, group.timeOfDay)}
                                    className="mt-1 w-full flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: 'var(--trip-base)' }}
                                  >
                                    <Plus size={10} />
                                    Add
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 text-center py-3">No activities found</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

        {/* Return flight */}
        {isLast && returnFlight && (
          <div className="flex items-center gap-3 py-1.5 border-t border-gray-100 mt-1">
            <Plane size={13} className="text-blue-600 shrink-0 rotate-180" />
            <div className="flex-1 min-w-0">
              <span className="text-[12px] font-medium text-gray-900">Depart — {returnFlight.flightNumber}</span>
              <span className="text-[11px] text-gray-400 ml-2">{returnFlight.departureTime}</span>
            </div>
            <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Booked</span>
          </div>
        )}

        {/* Day notes */}
        {day.notes && (
          <p className="text-[11px] text-gray-400 italic pt-1.5 border-t border-gray-100 mt-1">{day.notes}</p>
        )}
      </div>
    </div>
  );
}

function GlanceView({
  days,
  selectedDayIndex,
  arrivalFlight,
  returnFlight,
  hotel,
  onAddActivity,
  addingTo,
  discoverItems,
  addSearch,
  onSearchChange,
  addCategory,
  onCategoryChange,
  favorites,
  onFavorite,
  onBrowse,
  onAddItem,
  onCloseAdd,
}: {
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  arrivalFlight?: typeof MOCK_FLIGHT_DETAILS[number];
  returnFlight?: typeof MOCK_FLIGHT_DETAILS[number];
  hotel: typeof MOCK_HOTEL_DETAIL;
  onAddActivity?: (timeOfDay: string) => void;
  addingTo?: string | null;
  discoverItems?: DiscoverItem[];
  addSearch?: string;
  onSearchChange?: (q: string) => void;
  addCategory?: string;
  onCategoryChange?: (cat: string) => void;
  favorites?: string[];
  onFavorite?: (id: string) => void;
  onBrowse?: (index: number) => void;
  onAddItem?: (item: DiscoverItem, timeOfDay: string) => void;
  onCloseAdd?: () => void;
}) {
  const day = days[selectedDayIndex];
  if (!day) return null;
  const isFirst = selectedDayIndex === 0;
  const isLast = selectedDayIndex === days.length - 1;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={day.id}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <GlanceDayCard
          day={day}
          isFirst={isFirst}
          isLast={isLast}
          arrivalFlight={arrivalFlight}
          returnFlight={returnFlight}
          hotel={hotel}
          onAddActivity={onAddActivity}
          addingTo={addingTo}
          discoverItems={discoverItems}
          addSearch={addSearch}
          onSearchChange={onSearchChange}
          addCategory={addCategory}
          onCategoryChange={onCategoryChange}
          favorites={favorites}
          onFavorite={onFavorite}
          onBrowse={onBrowse}
          onAddItem={onAddItem}
          onCloseAdd={onCloseAdd}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function Itinerary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading, isEmpty } = useItineraryScreen(id);
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
          color: CATEGORY_COLORS[a.category] || '#6b7280',
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

  const allCollapsed = selectedDay
    ? selectedDay.timeGroups.every((g) => collapsedSections[g.timeOfDay])
    : false;

  const toggleCollapseAll = useCallback(() => {
    if (!selectedDay) return;
    const newState = !allCollapsed;
    const next: Record<string, boolean> = {};
    for (const g of selectedDay.timeGroups) {
      next[g.timeOfDay] = newState;
    }
    setCollapsedSections(next);
    setAllCollapsedOverride(newState);
  }, [selectedDay, allCollapsed]);

  if (isLoading) return <SkeletonItinerary />;
  if (isEmpty) return <ItineraryEmpty />;

  return (
    <div>
      {/* Day Selector + Controls */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <DaySelector days={days} selectedIndex={selectedDayIndex} onSelect={setSelectedDayIndex} />
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {/* Glance toggle */}
          <button
            onClick={() => setGlanceMode((v) => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              backgroundColor: glanceMode ? 'var(--trip-base)' : 'rgb(var(--trip-base-rgb) / 0.15)',
              color: glanceMode ? 'white' : 'var(--trip-base)',
              boxShadow: glanceMode ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
            }}
            title={glanceMode ? 'Detailed view' : 'At a glance'}
          >
            <LayoutList size={14} />
          </button>
          {/* Collapse All */}
          {!glanceMode && (
            <button
              onClick={toggleCollapseAll}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{
                backgroundColor: allCollapsed ? 'var(--trip-base)' : 'rgb(var(--trip-base-rgb) / 0.15)',
                color: allCollapsed ? 'white' : 'var(--trip-base)',
                boxShadow: allCollapsed ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
              }}
              title={allCollapsed ? 'Expand all' : 'Collapse all'}
            >
              <ChevronDown size={14} className={`transition-transform ${allCollapsed ? '' : 'rotate-180'}`} />
            </button>
          )}
        </div>
      </div>

      {/* Glance View — swipe through days */}
      {glanceMode && (
        <GlanceView
          days={days}
          selectedDayIndex={selectedDayIndex}
          arrivalFlight={arrivalFlight}
          returnFlight={returnFlight}
          hotel={MOCK_HOTEL_DETAIL}
          onAddActivity={(timeOfDay) => {
            setAddingTo(addingTo === timeOfDay ? null : timeOfDay);
            setAddCategory('All');
            setAddSearch('');
          }}
          addingTo={addingTo}
          discoverItems={filteredDiscoverItems}
          addSearch={addSearch}
          onSearchChange={setAddSearch}
          addCategory={addCategory}
          onCategoryChange={setAddCategory}
          favorites={favorites}
          onFavorite={toggleFavorite}
          onBrowse={(i) => setBrowseIndex(i)}
          onAddItem={(item, tod) => handleAddItem(item, tod)}
          onCloseAdd={() => { setAddingTo(null); setAddSearch(''); setAddCategory('All'); }}
        />
      )}

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
                <div className="mb-3 mx-0.5 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
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
                        className="w-full pl-8 pr-3 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-trip-base/20 focus:border-trip-base/30"
                      />
                    </div>
                  </div>

                  {/* Category tabs — underline style like Places page */}
                  <div className="flex gap-0.5 px-3 pt-2 pb-0 overflow-x-auto scrollbar-hide border-b border-gray-100">
                    {['All', 'Tours', 'Museums', 'Restaurants', 'Sightseeing', 'Nightlife'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setAddCategory(cat)}
                        className={`px-2.5 py-1.5 text-[11px] whitespace-nowrap border-b-2 transition-all ${
                          addCategory === cat
                            ? 'font-semibold'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
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
                        <p className="text-xs text-gray-500">No results match your search</p>
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
            <div className="bg-gray-50 rounded-[10px] p-3 mt-1 mb-3 border border-gray-100">
              <p className="text-xs text-gray-500 italic leading-[18px]">{selectedDay.notes}</p>
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
    </div>
  );
}
