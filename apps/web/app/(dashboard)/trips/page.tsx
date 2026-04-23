'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTrips } from '@travyl/shared';
import type { TripCard as TripCardType } from '@travyl/shared';
import { Plus } from 'lucide-react';
import { PaperPlane } from '@/components/ui';
import { Footer, OceanWave } from '@/components/home';
import { ViewToggle, TripCard, TripListItem, CreateTripModal } from '@/components/trips';
import { useIndexTrip } from '@/hooks/useIndexTrip';

// Tab filter types
type StatusFilter = 'all' | 'active' | 'upcoming' | 'past';

// No fallback photo — trips without images show a gradient
const FALLBACK_IMAGE = ''

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
];

function getTripStatusFilter(trip: TripCardType): 'active' | 'upcoming' | 'past' {
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

function filterTripsByStatus(trips: TripCardType[], status: StatusFilter): TripCardType[] {
  if (status === 'all') return trips;
  return trips.filter((trip) => getTripStatusFilter(trip) === status);
}

function filterTripsBySearch(trips: TripCardType[], search: string): TripCardType[] {
  if (!search.trim()) return trips;
  const query = search.toLowerCase().trim();
  return trips.filter(
    (trip) =>
      trip.title.toLowerCase().includes(query) ||
      trip.destination.toLowerCase().includes(query)
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

export default function MyTripsPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-serif font-normal text-gray-900 tracking-wide">My Trips</h1>
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

function getTripDuration(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

// Duration → flex weight (wider = longer trip) and row height
function getTripWeight(days: number): number {
  if (days <= 1) return 1;
  if (days <= 3) return 1.3;
  if (days <= 5) return 1.6;
  if (days <= 7) return 2;
  if (days <= 10) return 2.4;
  return 3;
}

function getRowHeight(maxDays: number): number {
  if (maxDays <= 3) return 200;
  if (maxDays <= 5) return 240;
  if (maxDays <= 7) return 280;
  if (maxDays <= 10) return 320;
  return 360;
}

// Pack trips into rows: always 2–3 cards per row, never 1
function buildRows(trips: { trip: TripCardType; duration: number; weight: number }[]) {
  const rows: typeof trips[] = [];
  let i = 0;

  while (i < trips.length) {
    const remaining = trips.length - i;

    if (remaining <= 3) {
      // Last few cards — put them all in one row
      rows.push(trips.slice(i));
      break;
    }

    // Decide: 2 or 3 cards in this row
    // Use 3 cards when the next trips are shorter (lower weight), 2 when they're long
    const totalWeight3 = trips[i].weight + trips[i + 1].weight + trips[i + 2].weight;
    if (totalWeight3 <= 5.5) {
      rows.push(trips.slice(i, i + 3));
      i += 3;
    } else {
      rows.push(trips.slice(i, i + 2));
      i += 2;
    }
  }

  return rows;
}

function TripMasonryGrid({ trips }: { trips: TripCardType[] }) {
  const items = trips.map((trip) => {
    const duration = getTripDuration(trip.start_date, trip.end_date);
    return { trip, duration, weight: getTripWeight(duration) };
  });

  const rows = buildRows(items);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, rowIdx) => {
        const maxDays = Math.max(...row.map((r) => r.duration));
        const height = getRowHeight(maxDays);

        return (
          <div key={rowIdx} className="flex gap-3" style={{ height }}>
            {row.map((item, j) => (
              <div key={item.trip.id} className="h-full" style={{ flex: item.weight }}>
                <TripCard trip={item.trip} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TripsContent() {
  const searchParams = useSearchParams();
  const statusParam = (searchParams.get('status') as StatusFilter) || 'all';
  const searchQuery = searchParams.get('search') || '';

  // Local state for view mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modalOpen, setModalOpen] = useState(false)

  const { data: trips, isLoading, isError } = useTrips();
  const { indexTrip } = useIndexTrip();
  const hasIndexedRef = useRef(false);

  // Index any trips that haven't been indexed yet so they appear in spotlight search
  useEffect(() => {
    if (!hasIndexedRef.current && trips && trips.length > 0) {
      hasIndexedRef.current = true;
      trips.forEach((trip) => indexTrip(trip.id));
    }
  }, [trips, indexTrip]);

  // Dynamically fetch destination photos for trips missing hero images
  const [fetchedImages, setFetchedImages] = useState<Record<string, string>>({});
  const fetchMissingImages = useCallback(async (tripList: any[]) => {
    const missing = tripList.filter(t =>
      !t.cover_image_url && !t.trip_context?.hero_image_url && !t.trip_context?.hero_images?.[0] && !fetchedImages[t.id]
    );
    for (const t of missing.slice(0, 5)) { // Limit to 5 concurrent fetches
      const city = t.destination?.split(',')[0]?.trim();
      if (!city) continue;
      try {
        const res = await fetch(`/api/images?q=${encodeURIComponent(city)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.url) setFetchedImages(prev => ({ ...prev, [t.id]: data.url }));
        }
      } catch {}
    }
  }, [fetchedImages]);

  useEffect(() => {
    if (trips?.length) fetchMissingImages(trips);
  }, [trips]);

  const allTrips: TripCardType[] = (trips ?? []).map((t: any) => ({
    ...t,
    image: t.cover_image_url
      ?? t.trip_context?.hero_image_url
      ?? t.trip_context?.hero_images?.[0]
      ?? fetchedImages[t.id]
      ?? FALLBACK_IMAGE,
  }))

  // Apply filters
  let displayTrips = filterTripsByStatus(allTrips, statusParam);
  displayTrips = filterTripsBySearch(displayTrips, searchQuery);

  if (isLoading && !isError) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex-1 w-full">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-serif font-normal text-gray-900 tracking-wide">My Trips</h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
        <OceanWave />
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex-1 w-full">
        {/* Header Row: Title | View Toggle | Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-serif font-normal text-gray-900 tracking-wide">My Trips</h1>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Toggle */}
            <ViewToggle view={viewMode} onChange={setViewMode} />

            {/* Plan a Trip Button */}
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
              onClick={() => setModalOpen(true)}
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
          (() => {
            // Separate past trips from current/upcoming when viewing "all"
            const currentTrips = statusParam === 'all'
              ? displayTrips.filter((t) => getTripStatusFilter(t) !== 'past')
              : statusParam === 'past' ? [] : displayTrips;
            const pastTrips = statusParam === 'all'
              ? displayTrips.filter((t) => getTripStatusFilter(t) === 'past')
              : statusParam === 'past' ? displayTrips : [];

            return (
              <>
                {/* Current / Upcoming / Active trips */}
                {currentTrips.length > 0 && (
                  viewMode === 'grid' ? (
                    <TripMasonryGrid trips={currentTrips} />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {currentTrips.map((trip) => (
                        <TripListItem key={trip.id} trip={trip} />
                      ))}
                    </div>
                  )
                )}

                {/* Past trips section */}
                {pastTrips.length > 0 && (
                  <div className="mt-10">
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-lg font-serif font-normal text-gray-400 tracking-wide">Past Trips</h2>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    {viewMode === 'grid' ? (
                      <div className="relative">
                        <div className="grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                          <TripMasonryGrid trips={pastTrips} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 opacity-60">
                        {pastTrips.map((trip) => (
                          <TripListItem key={trip.id} trip={trip} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <PaperPlane size={32} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-serif font-normal text-gray-800 mb-1 tracking-wide">No trips yet</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">Start planning your next adventure and it will appear here.</p>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
              onClick={() => setModalOpen(true)}
            >
              <Plus size={16} />
              Plan a Trip
            </button>
          </div>
        )}
      </div>
      <OceanWave />
      <Footer />
      <CreateTripModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
