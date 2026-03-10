'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { useTrips, MOCK_TRIPS, EASE_OUT_EXPO } from '@travyl/shared';
import type { MockTripCard } from '@travyl/shared';
import { Plus } from 'lucide-react';
import { Footer, OceanWave } from '@/components/home';
import { ViewToggle, TripCard, TripListItem, EmptyTripsIllustration } from '@/components/trips';

// Tab filter types
type StatusFilter = 'all' | 'active' | 'upcoming' | 'past';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
];

function getTripStatusFilter(trip: MockTripCard): 'active' | 'upcoming' | 'past' {
  const now = new Date();
  const startDate = new Date(trip.start_date + 'T00:00:00');
  const endDate = new Date(trip.end_date + 'T00:00:00');

  // Active: status is 'active'
  if (trip.status === 'active') return 'active';

  // Past: completed, abandoned, or end_date is in the past
  if (trip.status === 'completed' || trip.status === 'abandoned' || endDate < now) {
    return 'past';
  }

  // Upcoming: planning or booked with start_date in the future
  if ((trip.status === 'planning' || trip.status === 'booked') && startDate > now) {
    return 'upcoming';
  }

  // Default to upcoming for planning/booked that haven't started yet
  return 'upcoming';
}

function filterTripsByStatus(trips: MockTripCard[], status: StatusFilter): MockTripCard[] {
  if (status === 'all') return trips;
  return trips.filter((trip) => getTripStatusFilter(trip) === status);
}

function filterTripsBySearch(trips: MockTripCard[], search: string): MockTripCard[] {
  if (!search.trim()) return trips;
  const query = search.toLowerCase().trim();
  return trips.filter(
    (trip) =>
      trip.title?.toLowerCase().includes(query) ||
      trip.destination?.toLowerCase().includes(query)
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm border border-gray-100 shadow-sm animate-pulse">
      <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200" />
      <div className="px-4 py-3 space-y-2">
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-200 rounded" />
        <div className="h-3 w-2/3 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

function TripsContent() {
  const searchParams = useSearchParams();
  const statusParam = (searchParams.get('status') as StatusFilter) || 'all';
  const searchQuery = searchParams.get('search') || '';

  // Local state for view mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Auth commented out for testing
  // const user = useAuthStore((s) => s.user);
  // const loading = useAuthStore((s) => s.loading);
  const { data: trips, isLoading, isError } = useTrips();

  // Use real trips when available, otherwise fallback to mock data
  const allTrips: MockTripCard[] = (trips && trips.length > 0 && !isError)
    ? trips.map((t) => ({
        ...t,
        image: MOCK_TRIPS.find((m) => m.id === t.id)?.image
          || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800`,
      }))
    : MOCK_TRIPS;

  // Apply filters
  let displayTrips = filterTripsByStatus(allTrips, statusParam);
  displayTrips = filterTripsBySearch(displayTrips, searchQuery);

  if (isLoading && !isError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#1e3a5f]">My Trips</h1>
              <p className="text-gray-500 mt-1">Loading your adventures...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  const tripCount = displayTrips.length;
  const activeCount = filterTripsByStatus(allTrips, 'active').length;
  const upcomingCount = filterTripsByStatus(allTrips, 'upcoming').length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50 -z-10" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 flex-1 w-full">
        {/* Header Section with Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">My Trips</h1>
              <p className="text-gray-500 mt-1">
                {tripCount > 0
                  ? `${activeCount > 0 ? `${activeCount} active` : ''}${activeCount > 0 && upcomingCount > 0 ? ', ' : ''}${upcomingCount > 0 ? `${upcomingCount} upcoming` : ''}`
                  : 'Your adventures await'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* View Toggle */}
              <ViewToggle view={viewMode} onChange={setViewMode} />

              {/* Plan a Trip Button */}
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg hover:shadow-amber-500/20 transition-all bg-[#F59E0B] hover:bg-[#F59E0B]/90">
                <Plus size={18} strokeWidth={2.5} />
                Plan a Trip
              </button>
            </div>
          </div>

          {/* Status Tabs with Glass Effect */}
          <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 backdrop-blur-sm rounded-full w-fit">
            {STATUS_TABS.map(({ key, label }) => {
              const isActive = statusParam === key;
              const count = key === 'all' ? allTrips.length : filterTripsByStatus(allTrips, key as StatusFilter).length;
              // Build href preserving both status and search in URL for shareability
              const href = key === 'all'
                ? searchQuery ? `/trips?search=${encodeURIComponent(searchQuery)}` : '/trips'
                : `/trips?status=${key}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
              return (
                <Link
                  key={key}
                  href={href}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-[#1e3a5f] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                  }`}
                >
                  {label}
                  <span className={`ml-1.5 text-xs ${isActive ? 'text-[#F59E0B]' : 'text-gray-400'}`}>
                    ({count})
                  </span>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Search indicator (when filtering) */}
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-6 text-sm text-gray-600"
          >
            <span>Showing results for:</span>
            <span className="px-3 py-1 bg-amber-50 text-[#F59E0B] rounded-full font-medium">
              &quot;{searchQuery}&quot;
            </span>
            <Link
              href={statusParam === 'all' ? '/trips' : `/trips?status=${statusParam}`}
              className="text-[#1e3a5f] hover:underline ml-1 font-medium"
            >
              Clear
            </Link>
          </motion.div>
        )}

        {/* Grid or List View */}
        {displayTrips.length > 0 ? (
          viewMode === 'grid' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {displayTrips.map((trip, index) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05, ease: EASE_OUT_EXPO }}
                >
                  <TripCard trip={trip} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col gap-3"
            >
              {displayTrips.map((trip, index) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05, ease: EASE_OUT_EXPO }}
                >
                  <TripListItem trip={trip} />
                </motion.div>
              ))}
            </motion.div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-amber-100/50 rounded-full blur-3xl scale-150" />
              <EmptyTripsIllustration />
            </div>
            <h2 className="text-2xl font-bold text-[#1e3a5f] mb-2 mt-6">No trips yet</h2>
            <p className="text-gray-500 mb-8 max-w-sm">Start planning your next adventure and it will appear here.</p>
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all bg-[#F59E0B] hover:bg-[#F59E0B]/90">
              <Plus size={18} strokeWidth={2.5} />
              Plan Your First Trip
            </button>
          </motion.div>
        )}
      </div>
      <OceanWave />
      <Footer />
    </div>
  );
}

export default function MyTripsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#1e3a5f]">My Trips</h1>
              <p className="text-gray-500 mt-1">Loading your adventures...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    }>
      <TripsContent />
    </Suspense>
  );
}
