'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@travyl/shared';
import { fetchUserPublicTrips, useForkTrip, useAuthStore, canForkTrip, formatDateRange } from '@travyl/shared';
import type { Trip, Profile } from '@travyl/shared';
import { MapPin, Calendar, Users, GitFork, Loader2, Map } from 'lucide-react';

const BRAND = '#1e3a5f';

// Fetch user profile by username (display_name)
async function fetchUserProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('display_name', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

interface PublicTripCardProps {
  trip: Trip;
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
        onSuccess: () => setForking(false),
        onError: () => setForking(false),
      }
    );
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
      <Link href={`/trip/${trip.id}`} className="block">
        {/* Image Header */}
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
          <div className="absolute inset-0 flex items-center justify-center">
            <Map size={28} className="text-white/50" />
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
          <h3 className="text-base font-bold text-gray-900 leading-tight mb-1 line-clamp-1">
            {trip.title}
          </h3>

          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={12} className="text-gray-400" />
            <span className="text-sm text-gray-500">{trip.destination}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar size={11} className="text-gray-400" />
              <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={11} className="text-gray-400" />
              <span>{trip.travelers}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Fork button */}
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

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['userProfile', username],
    queryFn: () => fetchUserProfileByUsername(username),
  });

  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ['userPublicTrips', profile?.id],
    queryFn: () => (profile ? fetchUserPublicTrips(profile.id) : Promise.resolve([])),
    enabled: !!profile,
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">?</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">User not found</h2>
          <p className="text-gray-500">The user &quot;{username}&quot; doesn&apos;t exist or has no public profile.</p>
          <Link href="/explore" className="mt-4 inline-block text-sm font-medium" style={{ color: BRAND }}>
            Browse all trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt="" width={80} height={80} className="object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {(profile.display_name || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.display_name || 'Anonymous'}
              </h1>
              {profile.email && (
                <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>{trips?.length ?? 0} public trip{(trips?.length ?? 0) === 1 ? '' : 's'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trips Grid */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Public Trips</h2>

        {tripsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : trips && trips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((trip) => (
              <PublicTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <MapPin size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No public trips yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
