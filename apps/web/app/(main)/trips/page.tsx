'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTrips, MOCK_TRIPS } from '@travyl/shared';
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
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 animate-pulse">
      <div className="h-36 bg-gray-200" />
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
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Header Row: Title | View Toggle | Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <ViewToggle view={viewMode} onChange={setViewMode} />

            {/* Plan a Trip Button */}
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
            >
              <Plus size={16} />
              Plan a Trip
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 mb-6">
          {STATUS_TABS.map(({ key, label }) => {
            const isActive = statusParam === key;
            // Build href preserving both status and search in URL for shareability
            const href = key === 'all'
              ? searchQuery ? `/trips?search=${encodeURIComponent(searchQuery)}` : '/trips'
              : `/trips?status=${key}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
            return (
              <Link
                key={key}
                href={href}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#1e3a5f] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Search indicator (when filtering) */}
        {searchQuery && (
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
            <span>Showing results for:</span>
            <span className="px-2 py-0.5 bg-gray-100 rounded-md font-medium text-gray-800">
              &quot;{searchQuery}&quot;
            </span>
            <Link
              href={statusParam === 'all' ? '/trips' : `/trips?status=${statusParam}`}
              className="text-[#1e3a5f] hover:underline ml-1"
            >
              Clear
            </Link>
          </div>
        )}

        {/* Grid or List View */}
        {displayTrips.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {displayTrips.map((trip) => (
                <TripListItem key={trip.id} trip={trip} />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <EmptyTripsIllustration />
            <h2 className="text-xl font-semibold text-gray-800 mb-2 mt-4">No trips yet</h2>
            <p className="text-gray-500 mb-6 max-w-sm">Start planning your next adventure and it will appear here.</p>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
            >
              <Plus size={16} />
              Plan a Trip
            </button>
          </div>
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
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    }>
      <TripsContent />
    </Suspense>
  );
}
