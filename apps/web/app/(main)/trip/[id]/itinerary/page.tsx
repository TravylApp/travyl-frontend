'use client';

import { use, useState, useMemo, useCallback } from 'react';
import { useItineraryScreen, MOCK_FLIGHT_DETAILS, MOCK_HOTEL_DETAIL, MOCK_DESTINATION_COORDS, MOCK_DISCOVER_ACTIVITIES } from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';
import { useItineraryContext } from '@/components/itinerary/ItineraryContext';
import {
  DaySelector, ItineraryEmpty, TimeGroupSection, SplitScreenModal,
  FlightSection, HotelSection, CheckoutSection,
} from '@/components/itinerary';
import type { MapLocation } from '@/components/leaflet-map';
import { ItineraryPinCard } from '@/components/itinerary/ItineraryPinCard';
import { ChevronDown, X, Search, Plus, Compass } from 'lucide-react';

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

// ─── Skeleton ───────────────────────────────────────────────────

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className ?? ''}`} style={style} />;
}

function SkeletonItinerary() {
  return (
    <div>
      {/* Day selector skeleton */}
      <div className="flex items-center gap-2 mb-3 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonBlock key={i} className="shrink-0 rounded-lg" style={{ width: 56, height: 52 }} />
        ))}
      </div>
      {/* Flight section skeleton */}
      <div className="mb-3.5">
        <SkeletonBlock className="rounded-lg" style={{ height: 52 }} />
      </div>
      {/* Hotel section skeleton */}
      <div className="mb-3.5">
        <SkeletonBlock className="rounded-lg" style={{ height: 52 }} />
      </div>
      {/* Time group sections */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-3.5">
          <SkeletonBlock className="rounded-lg mb-2" style={{ height: 36 }} />
          <div className="space-y-2 pl-1">
            {[1, 2].map((j) => (
              <SkeletonBlock key={j} className="rounded-lg" style={{ height: 72 }} />
            ))}
          </div>
        </div>
      ))}
    </div>
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
  } = useItineraryContext();
  const selectedDay = days[selectedDayIndex] ?? null;

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
          {/* Collapse All */}
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
        </div>
      </div>

      {/* Day Content */}
      {selectedDay && (
        <div>
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
