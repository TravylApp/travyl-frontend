'use client';

import { use, useState, useMemo, useCallback } from 'react';
import { useItineraryScreen } from '@travyl/shared';
import type { DiscoverItem } from '@travyl/shared';
import { useItineraryContext } from '@/components/itinerary/ItineraryContext';
import {
  ItineraryEmpty, SplitScreenModal, OutlookCalendar,
  LegMap, LegMapCompact,
} from '@/components/itinerary';
import type { TripLeg } from '@/components/itinerary';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronUp, Settings2, Plane, Calendar,
} from 'lucide-react';
import { generateMockLegs } from '@/lib/trip-legs';
import { DashboardNavbar } from '@/components/DashboardNavbar';

// ─── Main Page ──────────────────────────────────────────────────

export default function Itinerary({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading, isEmpty, trip } = useItineraryScreen(id);
  const { days } = useItineraryContext();
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const selectedDay = days[selectedDayIndex] ?? null;

  // Multi-leg trip state - initialize with generated legs
  const [legs] = useState<TripLeg[]>(() => id ? generateMockLegs(id) : []);
  const [selectedLegId, setSelectedLegId] = useState<string | null>(() => legs.length > 0 ? legs[0].id : null);
  const [showLegSelector, setShowLegSelector] = useState(false);

  const [selectedActivityIndex, setSelectedActivityIndex] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const selectedLeg = legs.find((leg) => leg.id === selectedLegId);
  const isMultiLeg = legs.length > 1;

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  }, []);

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

  const handleActivityClick = useCallback(
    (activityId: string) => {
      const idx = allActivities.findIndex((a) => a.id === activityId);
      if (idx >= 0) setSelectedActivityIndex(idx);
    },
    [allActivities],
  );

  const handleAddActivity = useCallback((_hour: number) => {
    // TODO: Open add activity modal for the given hour
    console.log('Add activity at hour:', _hour);
  }, []);

  if (isLoading) return <div className="h-screen flex items-center justify-center text-sm text-gray-400">Loading...</div>;
  if (isEmpty) return <ItineraryEmpty />;

  return (
    <>
      <DashboardNavbar />
      <div className="fixed inset-0 top-11 flex bg-white z-40">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        {/* Multi-Leg Map (shows when multiple legs) */}
        {isMultiLeg && (
          <div className="bg-white border-b border-gray-200 shrink-0">
            {/* Compact trail bar - always visible */}
            <div className="px-4 py-2 flex items-center justify-between">
              <LegMapCompact
                legs={legs}
                selectedLegId={selectedLegId}
                onLegSelect={setSelectedLegId}
              />
              <button
                onClick={() => setShowLegSelector(!showLegSelector)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <span>{showLegSelector ? 'Hide' : 'Show'} map</span>
                <ChevronUp
                  size={12}
                  className={`transition-transform ${showLegSelector ? '' : 'rotate-180'}`}
                />
              </button>
            </div>

            {/* Expanded Map View */}
            <AnimatePresence>
              {showLegSelector && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden px-4"
                >
                  <div className="py-3">
                    <LegMap
                      legs={legs}
                      selectedLegId={selectedLegId}
                      onLegSelect={(legId) => {
                        setSelectedLegId(legId);
                      }}
                      height={280}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Selected Leg Header (shows when leg is selected in multi-leg trip) */}
        <AnimatePresence mode="wait">
          {isMultiLeg && selectedLeg && (
            <motion.div
              key={selectedLeg.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white px-4 py-2.5 shrink-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Leg number */}
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                    {legs.findIndex(l => l.id === selectedLegId) + 1}
                  </div>
                  {/* Route */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium opacity-80">{selectedLeg.originCode || selectedLeg.origin}</span>
                    <Plane size={12} className="rotate-90 opacity-50" />
                    <span className="text-sm font-semibold">{selectedLeg.destination}</span>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1.5 opacity-80">
                    <Calendar size={12} />
                    <span>
                      {selectedLeg.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' – '}
                      {selectedLeg.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
                    {selectedLeg.dayCount} {selectedLeg.dayCount === 1 ? 'day' : 'days'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center shrink-0">
          <h2 className="text-[13px] font-semibold text-gray-900">
            {trip?.destination || 'Paris'} · Itinerary
          </h2>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <button className="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center">
              <Settings2 size={14} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Outlook-style Calendar View */}
        <div className="flex-1 overflow-hidden">
          <OutlookCalendar
            days={days}
            selectedDayIndex={selectedDayIndex}
            onSelectDay={setSelectedDayIndex}
            onActivityClick={handleActivityClick}
            onAddActivity={handleAddActivity}
          />
        </div>
      </main>

      {/* Split Screen Modal */}
      {selectedActivityIndex !== null && allActivities.length > 0 && (
        <SplitScreenModal
          items={allActivities}
          initialIndex={selectedActivityIndex}
          accentColor="#1e3a5f"
          favorites={favorites}
          onClose={() => setSelectedActivityIndex(null)}
          onFavorite={toggleFavorite}
        />
      )}
    </div>
    </>
  );
}
