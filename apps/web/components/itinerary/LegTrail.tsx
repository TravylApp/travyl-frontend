'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plane, Calendar, ChevronRight, X } from 'lucide-react';

function cx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export interface TripLeg {
  id: string;
  origin: string;
  originCode?: string;
  destination: string;
  destinationCode?: string;
  startDate: Date;
  endDate: Date;
  dayCount: number;
  coverImage?: string;
  color?: string;
}

interface LegTrailProps {
  legs: TripLeg[];
  selectedLegId: string | null;
  onLegSelect: (legId: string) => void;
  className?: string;
}

// Generate positions along a trail path
function generateTrailPositions(legCount: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  // Create a winding path that works for any number of legs
  for (let i = 0; i < legCount; i++) {
    const progress = i / Math.max(legCount - 1, 1);
    // Create a slight wave pattern
    const x = 10 + progress * 80; // 10% to 90% horizontal
    const y = 50 + Math.sin(progress * Math.PI * 1.5) * 25; // Wave up and down

    positions.push({ x, y });
  }

  return positions;
}

// Generate SVG path for the trail
function generateTrailPath(positions: { x: number; y: number }[]): string {
  if (positions.length < 2) return '';

  let path = `M ${positions[0].x} ${positions[0].y}`;

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];

    // Use quadratic curves for smooth path
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;

    path += ` Q ${prev.x + 10} ${prev.y}, ${midX} ${midY}`;
  }

  // Connect to final point
  const last = positions[positions.length - 1];
  const secondLast = positions[positions.length - 2];
  path += ` Q ${last.x - 10} ${last.y}, ${last.x} ${last.y}`;

  return path;
}

export function LegTrail({ legs, selectedLegId, onLegSelect, className }: LegTrailProps) {
  const [hoveredLegId, setHoveredLegId] = useState<string | null>(null);
  const positions = generateTrailPositions(legs.length);
  const pathD = generateTrailPath(positions);

  if (legs.length === 0) return null;

  return (
    <div className={cx("relative w-full", className)}>
      {/* Trail Map Container */}
      <div className="relative bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 rounded-2xl overflow-hidden" style={{ minHeight: '280px' }}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Grid pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-30">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Decorative circles (like map markers in distance) */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-gray-300 opacity-50" />
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-gray-300 opacity-40" />
          <div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full bg-gray-300 opacity-50" />
          <div className="absolute top-1/2 left-1/6 w-1 h-1 rounded-full bg-gray-300 opacity-30" />
        </div>

        {/* SVG Trail Path */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Dashed trail line */}
          <path
            d={pathD}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="0.8"
            strokeDasharray="3 2"
            className="opacity-60"
          />

          {/* Animated "ant trail" dots */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="#1e3a5f"
            strokeWidth="0.8"
            strokeDasharray="1 4"
            className="opacity-80"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -100 }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </svg>

        {/* Leg Pins */}
        {legs.map((leg, index) => {
          const pos = positions[index];
          const isSelected = selectedLegId === leg.id;
          const isHovered = hoveredLegId === leg.id;
          const isStart = index === 0;
          const isEnd = index === legs.length - 1;

          return (
            <div
              key={leg.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              {/* Pin Button */}
              <motion.button
                onClick={() => onLegSelect(leg.id)}
                onMouseEnter={() => setHoveredLegId(leg.id)}
                onMouseLeave={() => setHoveredLegId(null)}
                className="relative group"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Pin glow when selected/hovered */}
                <AnimatePresence>
                  {(isSelected || isHovered) && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="absolute -inset-3 rounded-full bg-[#1e3a5f]/20 blur-md"
                    />
                  )}
                </AnimatePresence>

                {/* Pin container */}
                <div
                  className={cx(
                    "relative flex flex-col items-center",
                    isSelected ? "z-20" : "z-10"
                  )}
                >
                  {/* Leg number badge */}
                  <div
                    className={cx(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all",
                      isSelected
                        ? "bg-[#1e3a5f] text-white scale-110"
                        : "bg-white text-[#1e3a5f] border-2 border-[#1e3a5f] group-hover:scale-105"
                    )}
                  >
                    {index + 1}
                  </div>

                  {/* Pin marker */}
                  <div
                    className={cx(
                      "w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] -mt-1 transition-colors",
                      isSelected
                        ? "border-l-transparent border-r-transparent border-t-[#1e3a5f]"
                        : "border-l-transparent border-r-transparent border-t-white"
                    )}
                  />

                  {/* Destination label */}
                  <div
                    className={cx(
                      "absolute top-full mt-2 whitespace-nowrap text-center transition-all",
                      isSelected ? "text-[#1e3a5f] font-semibold" : "text-gray-600"
                    )}
                  >
                    <span className="text-xs font-medium">
                      {leg.destinationCode || leg.destination}
                    </span>
                  </div>
                </div>
              </motion.button>

              {/* Hover Card */}
              <AnimatePresence>
                {isHovered && !isSelected && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 -translate-x-1/2 top-full mt-8 z-30 pointer-events-none"
                  >
                    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-[180px]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {leg.destination}
                          </p>
                          {leg.destinationCode && (
                            <p className="text-xs text-gray-400 font-mono">
                              {leg.destinationCode}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {leg.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' – '}
                          {leg.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500">
                        {leg.dayCount} {leg.dayCount === 1 ? 'day' : 'days'}
                      </div>

                      {/* Arrow pointer */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[8px] border-l-transparent border-r-transparent border-b-white" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Flight indicator between pins */}
              {index < legs.length - 1 && (
                <div
                  className="absolute z-0 pointer-events-none"
                  style={{
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    className="flex items-center justify-center"
                  >
                    <Plane className="w-3 h-3 text-[#1e3a5f] rotate-45" />
                  </motion.div>
                </div>
              )}
            </div>
          );
        })}

        {/* Origin marker (Home/Start) */}
        {legs.length > 0 && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${positions[0].x - 8}%`,
              top: `${positions[0].y}%`,
            }}
          >
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md">
                <MapPin className="w-3 h-3" />
              </div>
              <span className="text-xs text-gray-500 mt-1 font-medium">
                {legs[0].originCode || legs[0].origin}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Leg Detail Card */}
      <AnimatePresence mode="wait">
        {selectedLegId && (
          <motion.div
            key={selectedLegId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            {(() => {
              const selectedLeg = legs.find(l => l.id === selectedLegId);
              if (!selectedLeg) return null;
              const selectedIndex = legs.findIndex(l => l.id === selectedLegId);

              return (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    {/* Route */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold">
                          {selectedIndex + 1}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Leg {selectedIndex + 1}</p>
                          <p className="font-semibold text-gray-900">
                            {selectedLeg.origin} → {selectedLeg.destination}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
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
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact inline version for header
export function LegTrailCompact({ legs, selectedLegId, onLegSelect }: LegTrailProps) {
  if (legs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-1">
      {/* Origin */}
      <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
        <MapPin className="w-3 h-3" />
      </div>

      {/* Legs as connected dots */}
      {legs.map((leg, index) => (
        <div key={leg.id} className="flex items-center">
          {/* Connector line */}
          <div className="w-4 h-0.5 bg-gray-300" />

          {/* Leg dot */}
          <button
            onClick={() => onLegSelect(leg.id)}
            className={cx(
              "relative flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-all",
              selectedLegId === leg.id
                ? "bg-[#1e3a5f] text-white scale-110"
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

export default LegTrail;
