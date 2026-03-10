'use client';

import { useState } from 'react';
import { MultiLegSelector, TripLeg, LegBar } from './MultiLegSelector';
import { CalendarDayView } from './CalendarDayView';
import { ViewToggle } from './ViewToggle';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, MapPin, Plane, Calendar } from 'lucide-react';

// Example multi-leg trip data for demonstration
const EXAMPLE_LEGS: TripLeg[] = [
  {
    id: 'leg-1',
    origin: 'New York',
    originCode: 'JFK',
    destination: 'Paris',
    destinationCode: 'CDG',
    startDate: new Date('2024-06-15'),
    endDate: new Date('2024-06-20'),
    dayCount: 5,
  },
  {
    id: 'leg-2',
    origin: 'Paris',
    originCode: 'CDG',
    destination: 'Rome',
    destinationCode: 'FCO',
    startDate: new Date('2024-06-21'),
    endDate: new Date('2024-06-25'),
    dayCount: 4,
  },
  {
    id: 'leg-3',
    origin: 'Rome',
    originCode: 'FCO',
    destination: 'Los Angeles',
    destinationCode: 'LAX',
    startDate: new Date('2024-06-26'),
    endDate: new Date('2024-06-30'),
    dayCount: 4,
  },
];

interface ItineraryWithLegsProps {
  // In real implementation, these would come from props/API
  tripId: string;
}

export function ItineraryWithLegs({ tripId }: ItineraryWithLegsProps) {
  const [selectedLegId, setSelectedLegId] = useState<string | null>(
    EXAMPLE_LEGS[0]?.id || null
  );
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'canvas'>('day');

  const selectedLeg = EXAMPLE_LEGS.find((leg) => leg.id === selectedLegId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Trip Title */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                European Adventure 2024
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                June 15 – June 30, 2024 • 3 destinations
              </p>
            </div>
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
            />
          </div>

          {/* Compact Leg Bar - always visible in header */}
          <LegBar
            legs={EXAMPLE_LEGS}
            selectedLegId={selectedLegId}
            onLegSelect={setSelectedLegId}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Selected Leg Header */}
        <AnimatePresence mode="wait">
          {selectedLeg && (
            <motion.div
              key={selectedLeg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  {/* Route Display */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">From</p>
                        <p className="font-semibold text-gray-900">
                          {selectedLeg.origin}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {selectedLeg.originCode}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-4">
                      <div className="h-px w-8 bg-gray-300" />
                      <Plane className="w-5 h-5 text-primary-500 rotate-90" />
                      <div className="h-px w-8 bg-gray-300" />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">To</p>
                        <p className="font-semibold text-gray-900">
                          {selectedLeg.destination}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {selectedLeg.destinationCode}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="ml-auto flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Dates</p>
                      <p className="font-medium text-gray-900">
                        {formatDateRange(selectedLeg.startDate, selectedLeg.endDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                      <p className="font-medium text-gray-900">
                        {selectedLeg.dayCount} {selectedLeg.dayCount === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calendar View */}
        <AnimatePresence mode="wait">
          {selectedLeg && (
            <motion.div
              key={`calendar-${selectedLeg.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Placeholder for actual calendar view */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedLeg.destination} Itinerary
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Day {viewMode} view for {selectedLeg.dayCount} days
                  </p>

                  {/* Mock Day Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
                    {Array.from({ length: selectedLeg.dayCount }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-primary-300 cursor-pointer transition-colors"
                      >
                        <p className="text-xs text-gray-500 uppercase">Day {i + 1}</p>
                        <p className="font-semibold text-gray-900 mt-1">
                          {new Date(
                            selectedLeg.startDate.getTime() + i * 24 * 60 * 60 * 1000
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {Math.floor(Math.random() * 4) + 1} activities
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded Leg Selector (optional - shows below) */}
        <div className="mt-8">
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
              <ChevronLeft className="w-4 h-4 rotate-[-90deg] group-open:rotate-90 transition-transform" />
              View all trip legs
            </summary>
            <div className="mt-4">
              <MultiLegSelector
                legs={EXAMPLE_LEGS}
                selectedLegId={selectedLegId}
                onLegSelect={setSelectedLegId}
              />
            </div>
          </details>
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
  const year = start.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

export default ItineraryWithLegs;
