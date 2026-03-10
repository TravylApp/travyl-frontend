'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plane, Calendar, X } from 'lucide-react';

function cx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface TripLeg {
  id: string;
  origin: string;
  originCode?: string;
  originLat?: number;
  originLng?: number;
  destination: string;
  destinationCode?: string;
  destinationLat?: number;
  destinationLng?: number;
  startDate: Date;
  endDate: Date;
  dayCount: number;
  coverImage?: string;
  color?: string;
}

interface LegMapProps {
  legs: TripLeg[];
  selectedLegId: string | null;
  onLegSelect: (legId: string) => void;
  className?: string;
  height?: number;
}

// City coordinates database (for demo - in production, geocode from API)
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'New York': { lat: 40.7128, lng: -74.006 },
  'JFK': { lat: 40.6413, lng: -73.7781 },
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'CDG': { lat: 49.0097, lng: 2.5479 },
  'Rome': { lat: 41.9028, lng: 12.4964 },
  'FCO': { lat: 41.8003, lng: 12.2389 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'LAX': { lat: 33.9416, lng: -118.4085 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'NRT': { lat: 35.7647, lng: 140.3864 },
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'SYD': { lat: -33.9399, lng: 151.1753 },
  'London': { lat: 51.5074, lng: -0.1278 },
  'LHR': { lat: 51.4700, lng: -0.4543 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'DXB': { lat: 25.2532, lng: 55.3657 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'SIN': { lat: 1.3644, lng: 103.9915 },
  'Bangkok': { lat: 13.7563, lng: 100.5018 },
  'BKK': { lat: 13.6900, lng: 100.7501 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'BCN': { lat: 41.2971, lng: 2.0785 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'AMS': { lat: 52.3105, lng: 4.7683 },
};

// Get coordinates for a city
function getCityCoords(city: string, code?: string): { lat: number; lng: number } | null {
  if (code && CITY_COORDS[code]) return CITY_COORDS[code];
  if (CITY_COORDS[city]) return CITY_COORDS[city];
  return null;
}

// Fill in missing coordinates
function populateLegCoords(legs: TripLeg[]): TripLeg[] {
  return legs.map(leg => {
    const originCoords = leg.originLat && leg.originLng
      ? { lat: leg.originLat, lng: leg.originLng }
      : getCityCoords(leg.origin, leg.originCode);

    const destCoords = leg.destinationLat && leg.destinationLng
      ? { lat: leg.destinationLat, lng: leg.destinationLng }
      : getCityCoords(leg.destination, leg.destinationCode);

    return {
      ...leg,
      originLat: originCoords?.lat,
      originLng: originCoords?.lng,
      destinationLat: destCoords?.lat,
      destinationLng: destCoords?.lng,
    };
  });
}

// Dynamic import of Leaflet map (SSR safe)
const LeafletMapWithRoute = dynamic(() => import('./LegMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center">
      <div className="text-sm text-gray-400">Loading map...</div>
    </div>
  ),
});

export function LegMap({ legs, selectedLegId, onLegSelect, className, height = 320 }: LegMapProps) {
  const [hoveredLegId, setHoveredLegId] = useState<string | null>(null);
  const populatedLegs = populateLegCoords(legs);
  const selectedLeg = populatedLegs.find(l => l.id === selectedLegId);
  const hoveredLeg = populatedLegs.find(l => l.id === hoveredLegId);

  // Filter legs that have valid coordinates
  const validLegs = populatedLegs.filter(
    leg => leg.originLat && leg.originLng && leg.destinationLat && leg.destinationLng
  );

  if (legs.length === 0) return null;

  return (
    <div className={cx("relative", className)}>
      {/* Map Container */}
      <div
        className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ height }}
      >
        <LeafletMapWithRoute
          legs={validLegs}
          selectedLegId={selectedLegId}
          hoveredLegId={hoveredLegId}
          onLegSelect={onLegSelect}
          onLegHover={setHoveredLegId}
        />

        {/* Hover Card Overlay */}
        <AnimatePresence>
          {hoveredLeg && hoveredLeg.id !== selectedLegId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 left-4 right-4 pointer-events-none z-[1000]"
            >
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 max-w-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold flex-shrink-0">
                    {validLegs.findIndex(l => l.id === hoveredLeg.id) + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {hoveredLeg.origin} → {hoveredLeg.destination}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {hoveredLeg.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' – '}
                        {hoveredLeg.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {hoveredLeg.dayCount} {hoveredLeg.dayCount === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm px-3 py-2 z-[1000]">
          <div className="text-xs font-medium text-gray-600 mb-1.5">Trip Route</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500">Start</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#1e3a5f]" />
              <span className="text-xs text-gray-500">Stop</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-[#1e3a5f] opacity-50" style={{ borderStyle: 'dashed' }} />
              <span className="text-xs text-gray-500">Flight</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Leg Detail Card */}
      <AnimatePresence mode="wait">
        {selectedLeg && (
          <motion.div
            key={selectedLeg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold">
                      {validLegs.findIndex(l => l.id === selectedLeg.id) + 1}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Leg {validLegs.findIndex(l => l.id === selectedLeg.id) + 1}</p>
                      <p className="font-semibold text-gray-900">
                        {selectedLeg.origin} → {selectedLeg.destination}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {selectedLeg.startDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })} – {selectedLeg.endDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedLeg.dayCount} {selectedLeg.dayCount === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact inline version for header (just dots, no map)
export function LegMapCompact({ legs, selectedLegId, onLegSelect }: Omit<LegMapProps, 'height'>) {
  const populatedLegs = populateLegCoords(legs);

  if (legs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-1">
      {/* Origin marker */}
      <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
        <MapPin className="w-2.5 h-2.5" />
      </div>

      {/* Leg dots */}
      {populatedLegs.map((leg, index) => (
        <div key={leg.id} className="flex items-center">
          {/* Connector */}
          <div className="w-4 flex items-center justify-center">
            <Plane className="w-3 h-3 text-gray-300 rotate-90" />
          </div>

          {/* Leg dot */}
          <button
            onClick={() => onLegSelect(leg.id)}
            onMouseEnter={(e) => e.currentTarget.classList.add('scale-110')}
            onMouseLeave={(e) => e.currentTarget.classList.remove('scale-110')}
            className={cx(
              "relative flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all",
              selectedLegId === leg.id
                ? "bg-[#1e3a5f] text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
            title={`${leg.origin} → ${leg.destination}`}
          >
            {index + 1}
          </button>
        </div>
      ))}
    </div>
  );
}

export default LegMap;
