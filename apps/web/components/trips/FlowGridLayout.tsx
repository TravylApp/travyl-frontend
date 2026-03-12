'use client';

import { motion } from 'motion/react';
import type { MockTripCard } from '@travyl/shared';
import { EASE_OUT_EXPO } from '@travyl/shared';
import { FeaturedTripCard } from './FeaturedTripCard';
import { TripCard } from './TripCard';

interface FlowGridLayoutProps {
  trips: MockTripCard[];
  featuredTrip?: MockTripCard | null;
}

export function FlowGridLayout({ trips, featuredTrip }: FlowGridLayoutProps) {
  // Separate featured trip from regular trips
  const regularTrips = featuredTrip
    ? trips.filter((t) => t.id !== featuredTrip.id)
    : trips;

  return (
    <div className="space-y-6">
      {/* Featured Trip - Spans 2 columns on desktop */}
      {featuredTrip && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FeaturedTripCard trip={featuredTrip} index={0} />
          {/* Quick actions or summary panel on larger screens */}
          <div className="hidden lg:flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT_EXPO }}
              className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-100 p-6"
            >
              <h3 className="text-lg font-bold text-primary-dark mb-4">
                Ready for your adventure?
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-600 font-semibold text-xs">1</span>
                  </div>
                  <span>Review your itinerary details</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-xs">2</span>
                  </div>
                  <span>Confirm accommodations & transport</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-amber-600 font-semibold text-xs">3</span>
                  </div>
                  <span>Pack and get ready to explore!</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Regular Grid */}
      {regularTrips.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: featuredTrip ? 0.2 : 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {regularTrips.map((trip, index) => (
            <motion.div
              key={trip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: (featuredTrip ? 0.2 : 0) + index * 0.05,
                ease: EASE_OUT_EXPO,
              }}
            >
              <TripCard trip={trip} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
