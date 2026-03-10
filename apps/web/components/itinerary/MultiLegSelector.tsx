'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, MapPin, Calendar, Plane, ArrowRight } from 'lucide-react';

// Simple class name utility
function cx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Types for multi-leg trips
export interface TripLeg {
  id: string;
  origin: string;
  originCode?: string; // e.g., "CDG"
  originLat?: number;
  originLng?: number;
  destination: string;
  destinationCode?: string; // e.g., "LAX"
  destinationLat?: number;
  destinationLng?: number;
  startDate: Date;
  endDate: Date;
  dayCount: number;
  coverImage?: string;
  color?: string;
}

interface MultiLegSelectorProps {
  legs: TripLeg[];
  selectedLegId: string | null;
  onLegSelect: (legId: string) => void;
  className?: string;
}

// Individual Leg Card Component
interface LegCardProps {
  leg: TripLeg;
  isSelected: boolean;
  onClick: () => void;
  index: number;
  showConnector?: boolean;
}

function LegCard({ leg, isSelected, onClick, index, showConnector = true }: LegCardProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Connector line before card (except first) */}
      {index > 0 && (
        <div className="hidden md:flex items-center justify-center w-8">
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>
      )}

      {/* Main Leg Card */}
      <motion.button
        onClick={onClick}
        className={cx(
          "relative flex-1 rounded-xl border-2 transition-all duration-200",
          "flex flex-col md:flex-row items-center gap-3 p-4",
          "hover:shadow-lg hover:scale-[1.02]",
          isSelected
            ? "border-[#1e3a5f] bg-[#1e3a5f]/5 shadow-md"
            : "border-gray-200 bg-white hover:border-gray-300"
        )}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            layoutId="selected-leg"
            className="absolute inset-0 rounded-xl border-2 border-[#1e3a5f]"
            initial={false}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}

        {/* Leg Number Badge */}
        <div
          className={cx(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
            isSelected
              ? "bg-[#1e3a5f] text-white"
              : "bg-gray-100 text-gray-600"
          )}
        >
          {index + 1}
        </div>

        {/* Route Display */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {/* Origin */}
          <div className="flex flex-col items-center min-w-0">
            <span className="text-xs text-gray-500 uppercase tracking-wide">From</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="font-semibold text-gray-900 truncate">
                {leg.origin}
              </span>
              {leg.originCode && (
                <span className="text-xs text-gray-400 font-mono">
                  ({leg.originCode})
                </span>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center px-2">
            <Plane className="w-4 h-4 text-[#1e3a5f] rotate-90" />
          </div>

          {/* Destination */}
          <div className="flex flex-col items-center min-w-0">
            <span className="text-xs text-gray-500 uppercase tracking-wide">To</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#1e3a5f]" />
              <span className="font-semibold text-gray-900 truncate">
                {leg.destination}
              </span>
              {leg.destinationCode && (
                <span className="text-xs text-gray-400 font-mono">
                  ({leg.destinationCode})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span className="whitespace-nowrap">
            {formatDateRange(leg.startDate, leg.endDate)}
          </span>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
            {leg.dayCount} {leg.dayCount === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* Expand indicator */}
        <ChevronRight
          className={cx(
            "w-5 h-5 transition-transform duration-200",
            isSelected ? "rotate-90 text-[#1e3a5f]" : "text-gray-400"
          )}
        />
      </motion.button>
    </div>
  );
}

// Compact horizontal leg bar (alternative view)
interface LegBarProps {
  legs: TripLeg[];
  selectedLegId: string | null;
  onLegSelect: (legId: string) => void;
}

export function LegBar({ legs, selectedLegId, onLegSelect }: LegBarProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto flex-1">
      {legs.map((leg, index) => (
        <div key={leg.id} className="flex items-center">
          {index > 0 && (
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 mx-1.5 flex-shrink-0" />
          )}
          <button
            onClick={() => onLegSelect(leg.id)}
            className={cx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] whitespace-nowrap transition-all font-medium",
              selectedLegId === leg.id
                ? "bg-[#1e3a5f] text-white shadow-sm"
                : "bg-transparent text-gray-600 hover:bg-white hover:text-gray-900"
            )}
          >
            <span>{leg.originCode || leg.origin}</span>
            <ArrowRight className="w-2.5 h-2.5" />
            <span>{leg.destinationCode || leg.destination}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

// Main Multi-Leg Selector Component
export function MultiLegSelector({
  legs,
  selectedLegId,
  onLegSelect,
  className,
}: MultiLegSelectorProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'bar'>('cards');

  // If only one leg or no legs, don't show selector
  if (legs.length <= 1) {
    return null;
  }

  return (
    <div className={cx("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Your Trip Legs
          </h2>
          <p className="text-sm text-gray-500">
            {legs.length} destinations • Click to view itinerary
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={cx(
              "px-3 py-1 text-sm rounded-md transition-all",
              viewMode === 'cards'
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('bar')}
            className={cx(
              "px-3 py-1 text-sm rounded-md transition-all",
              viewMode === 'bar'
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Compact
          </button>
        </div>
      </div>

      {/* Leg Display */}
      <AnimatePresence mode="wait">
        {viewMode === 'cards' ? (
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {legs.map((leg, index) => (
              <LegCard
                key={leg.id}
                leg={leg}
                isSelected={selectedLegId === leg.id}
                onClick={() => onLegSelect(leg.id)}
                index={index}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="bar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <LegBar
              legs={legs}
              selectedLegId={selectedLegId}
              onLegSelect={onLegSelect}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trip Overview (optional visualization) */}
      <div className="relative pt-4">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2" />
        <div className="relative flex justify-between">
          {legs.map((leg, index) => (
            <div key={leg.id} className="flex flex-col items-center">
              <button
                onClick={() => onLegSelect(leg.id)}
                className={cx(
                  "w-4 h-4 rounded-full border-2 transition-all",
                  selectedLegId === leg.id
                    ? "bg-[#1e3a5f] border-[#1e3a5f] scale-125"
                    : "bg-white border-gray-300 hover:border-[#1e3a5f]"
                )}
              />
              <span className="mt-2 text-xs text-gray-500 font-medium">
                {leg.destinationCode || leg.destination}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to format date range
function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }

  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

export default MultiLegSelector;
