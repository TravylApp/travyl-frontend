'use client';

import { useState } from 'react';
import { LegMap, LegMapCompact, TripLeg } from '@/components/itinerary/LegMap';
import { LegTrail, LegTrailCompact } from '@/components/itinerary/LegTrail';
import { LegBar } from '@/components/itinerary/MultiLegSelector';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plane, Calendar, Plus, Minus } from 'lucide-react';

// Demo data - multi-leg trip with coordinates
const DEMO_LEGS: TripLeg[] = [
  {
    id: 'leg-1',
    origin: 'New York',
    originCode: 'JFK',
    originLat: 40.6413,
    originLng: -73.7781,
    destination: 'Paris',
    destinationCode: 'CDG',
    destinationLat: 49.0097,
    destinationLng: 2.5479,
    startDate: new Date('2024-06-15'),
    endDate: new Date('2024-06-20'),
    dayCount: 5,
  },
  {
    id: 'leg-2',
    origin: 'Paris',
    originCode: 'CDG',
    originLat: 49.0097,
    originLng: 2.5479,
    destination: 'Rome',
    destinationCode: 'FCO',
    destinationLat: 41.8003,
    destinationLng: 12.2389,
    startDate: new Date('2024-06-21'),
    endDate: new Date('2024-06-25'),
    dayCount: 4,
  },
  {
    id: 'leg-3',
    origin: 'Rome',
    originCode: 'FCO',
    originLat: 41.8003,
    originLng: 12.2389,
    destination: 'Los Angeles',
    destinationCode: 'LAX',
    destinationLat: 33.9416,
    destinationLng: -118.4085,
    startDate: new Date('2024-06-26'),
    endDate: new Date('2024-06-30'),
    dayCount: 4,
  },
  {
    id: 'leg-4',
    origin: 'Los Angeles',
    originCode: 'LAX',
    originLat: 33.9416,
    originLng: -118.4085,
    destination: 'Tokyo',
    destinationCode: 'NRT',
    destinationLat: 35.7647,
    destinationLng: 140.3864,
    startDate: new Date('2024-07-01'),
    endDate: new Date('2024-07-06'),
    dayCount: 5,
  },
  {
    id: 'leg-5',
    origin: 'Tokyo',
    originCode: 'NRT',
    originLat: 35.7647,
    originLng: 140.3864,
    destination: 'Sydney',
    destinationCode: 'SYD',
    destinationLat: -33.9399,
    destinationLng: 151.1753,
    startDate: new Date('2024-07-07'),
    endDate: new Date('2024-07-12'),
    dayCount: 5,
  },
];

function cx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

type ViewType = 'map' | 'trail' | 'bar';

export default function MultiLegDemoPage() {
  const [selectedLegId, setSelectedLegId] = useState<string>(DEMO_LEGS[0].id);
  const [legCount, setLegCount] = useState(5);
  const [viewType, setViewType] = useState<ViewType>('map');
  const visibleLegs = DEMO_LEGS.slice(0, legCount);
  const selectedLeg = visibleLegs.find((leg) => leg.id === selectedLegId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Multi-Leg Trip Selector</h1>
          <p className="text-gray-500 mt-1">Interactive map with flight routes</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Controls */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Leg Count */}
            <div className="flex items-center gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">Number of Legs</h2>
                <p className="text-sm text-gray-500">Test with different counts</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLegCount(Math.max(2, legCount - 1))}
                  disabled={legCount <= 2}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-semibold">{legCount}</span>
                <button
                  onClick={() => setLegCount(Math.min(5, legCount + 1))}
                  disabled={legCount >= 5}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* View Type Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewType('map')}
                className={cx(
                  "px-4 py-1.5 text-sm rounded-md transition-all font-medium",
                  viewType === 'map'
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                🗺️ Map
              </button>
              <button
                onClick={() => setViewType('trail')}
                className={cx(
                  "px-4 py-1.5 text-sm rounded-md transition-all font-medium",
                  viewType === 'trail'
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                📍 Trail
              </button>
              <button
                onClick={() => setViewType('bar')}
                className={cx(
                  "px-4 py-1.5 text-sm rounded-md transition-all font-medium",
                  viewType === 'bar'
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                📊 Bar
              </button>
            </div>
          </div>
        </section>

        {/* Main View */}
        <AnimatePresence mode="wait">
          {viewType === 'map' && (
            <motion.section
              key="map"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Interactive Map View
              </h2>
              <p className="text-gray-600 mb-4">
                Hover over markers to see leg details. Click to select a leg. Flight paths show curved routes.
              </p>
              <LegMap
                legs={visibleLegs}
                selectedLegId={selectedLegId}
                onLegSelect={setSelectedLegId}
                height={400}
              />
            </motion.section>
          )}

          {viewType === 'trail' && (
            <motion.section
              key="trail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Ant Trail View
              </h2>
              <p className="text-gray-600 mb-4">
                Visual trail representation with animated dots flowing along the path.
              </p>
              <LegTrail
                legs={visibleLegs}
                selectedLegId={selectedLegId}
                onLegSelect={(id) => setSelectedLegId(selectedLegId === id ? '' : id)}
              />
            </motion.section>
          )}

          {viewType === 'bar' && (
            <motion.section
              key="bar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Compact Bar View
              </h2>
              <p className="text-gray-600 mb-4">
                Minimal horizontal bar for header navigation.
              </p>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <LegBar
                  legs={visibleLegs}
                  selectedLegId={selectedLegId}
                  onLegSelect={setSelectedLegId}
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Compact Header Versions */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Compact Header Versions
          </h2>
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-3">Map version (with plane icons)</p>
              <LegMapCompact
                legs={visibleLegs}
                selectedLegId={selectedLegId}
                onLegSelect={setSelectedLegId}
              />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500 mb-3">Trail version (dots)</p>
              <LegTrailCompact
                legs={visibleLegs}
                selectedLegId={selectedLegId}
                onLegSelect={setSelectedLegId}
              />
            </div>
          </div>
        </section>

        {/* Selected Leg Detail */}
        {selectedLeg && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] rounded-xl text-white p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                    {visibleLegs.findIndex(l => l.id === selectedLegId) + 1}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider opacity-70">From</p>
                        <p className="text-lg font-bold">{selectedLeg.origin}</p>
                        <p className="text-xs opacity-60 font-mono">{selectedLeg.originCode}</p>
                      </div>
                    </div>

                    <Plane className="w-6 h-6 rotate-90 opacity-50" />

                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-[#1e3a5f]" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider opacity-70">To</p>
                        <p className="text-lg font-bold">{selectedLeg.destination}</p>
                        <p className="text-xs opacity-60 font-mono">{selectedLeg.destinationCode}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm opacity-80">
                  {selectedLeg.startDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                  })} – {selectedLeg.endDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-3xl font-bold mt-1">
                  {selectedLeg.dayCount} Days
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* All Legs List */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            All Legs
          </h2>
          <div className="space-y-2">
            {visibleLegs.map((leg, index) => (
              <button
                key={leg.id}
                onClick={() => setSelectedLegId(leg.id)}
                className={cx(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  selectedLegId === leg.id
                    ? "border-[#1e3a5f] bg-[#1e3a5f]/5"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <div
                  className={cx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    selectedLegId === leg.id
                      ? "bg-[#1e3a5f] text-white"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {leg.origin} → {leg.destination}
                  </p>
                  <p className="text-sm text-gray-500">
                    {leg.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {leg.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  {leg.dayCount} days
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
