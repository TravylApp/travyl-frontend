'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Calendar, Users, GitFork, Search, Filter, Loader2 } from 'lucide-react';
import { fetchPublicTrips, useForkTrip, useAuthStore, canForkTrip, formatDateRange } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

const BRAND = '#1e3a5f';

interface PublicTripCardProps {
  trip: Trip & { profiles?: { display_name: string | null; avatar_url: string | null } };
}

function PublicTripCard({ trip }: PublicTripCardProps) {
  const user = useAuthStore((s) => s.user);
  const { mutate: forkTripMutation, isPending } = useForkTrip();
  const [forking, setForking] = useState(false);

  const canFork = canForkTrip(trip, user?.id ?? null);

  const handleFork = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setForking(true);
    forkTripMutation(
      { tripId: trip.id },
      {
        onSuccess: () => {
          setForking(false);
        },
        onError: () => {
          setForking(false);
        },
      }
    );
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
      <Link href={`/trip/${trip.id}`} className="block">
        {/* Image Header */}
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin size={32} className="text-white/50" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* Fork count badge */}
          {trip.fork_count > 0 && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/90 text-white text-xs font-medium backdrop-blur-sm">
              <GitFork size={10} />
              <span>{trip.fork_count}</span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="px-4 py-3">
          <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1 line-clamp-1">
            {trip.title}
          </h3>

          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={13} className="text-gray-400" />
            <span className="text-sm text-gray-500">{trip.destination}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-gray-400" />
              <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={12} className="text-gray-400" />
              <span>{trip.travelers}</span>
            </div>
          </div>

          {/* Author info */}
          {trip.profiles && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {trip.profiles.avatar_url ? (
                  <Image src={trip.profiles.avatar_url} alt="" width={24} height={24} className="object-cover" />
                ) : (
                  <span className="text-xs font-medium text-gray-500">
                    {(trip.profiles.display_name || 'U')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-600">by {trip.profiles.display_name || 'Anonymous'}</span>
            </div>
          )}
        </div>
      </Link>

      {/* Fork button - overlay */}
      {canFork && (
        <button
          onClick={handleFork}
          disabled={isPending || forking}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200 text-xs font-medium text-gray-700 hover:bg-white hover:border-gray-300 transition-all disabled:opacity-50"
        >
          {isPending || forking ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <GitFork size={12} />
          )}
          <span>Fork</span>
        </button>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: trips, isLoading, error } = useQuery({
    queryKey: ['publicTrips'],
    queryFn: fetchPublicTrips,
  });

  // Filter trips by search query
  const filteredTrips = trips?.filter((trip) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      trip.title.toLowerCase().includes(query) ||
      trip.destination.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Explore Trips</h1>
          <p className="text-white/80">Discover and fork amazing travel itineraries from the community</p>

          {/* Search bar */}
          <div className="mt-6 max-w-xl">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search destinations or trip names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Failed to load trips. Please try again.</p>
          </div>
        ) : filteredTrips && filteredTrips.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                {filteredTrips.length} trip{filteredTrips.length === 1 ? '' : 's'} found
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTrips.map((trip) => (
                <PublicTripCard key={trip.id} trip={trip as any} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <MapPin size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No trips found</h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'No public trips available yet. Be the first to share!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
