'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Calendar, Users, GitFork, Loader2, Lock, AlertCircle } from 'lucide-react';
import { fetchTripByShareToken, useForkTrip, useAuthStore, canForkTrip } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

const BRAND = '#1e3a5f';

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const sStr = s.toLocaleDateString('en-US', opts);
  const eStr = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${sStr} – ${eStr}`;
}

interface SharedTripViewProps {
  trip: Trip;
}

function SharedTripView({ trip }: SharedTripViewProps) {
  const user = useAuthStore((s) => s.user);
  const { mutate: forkTripMutation, isPending } = useForkTrip();

  const canFork = canForkTrip(trip, user?.id ?? null);

  const handleFork = () => {
    forkTripMutation({ tripId: trip.id });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="relative h-[280px] overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500">
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin size={48} className="text-white/30" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 max-w-4xl mx-auto px-4 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={14} className="text-white/70" />
            <span className="text-xs text-white/70 font-medium">Shared Trip</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{trip.title}</h1>
          <div className="flex items-center gap-1.5 mb-3">
            <MapPin size={16} className="text-white/80" />
            <span className="text-lg text-white/90">{trip.destination}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/80">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={14} />
              <span>{trip.travelers} traveler{trip.travelers === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* View-only notice */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 mb-6">
          <AlertCircle size={20} className="text-blue-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">View-only access</p>
            <p className="text-xs text-blue-600 mt-0.5">
              This is a shared trip. You can view the details and fork it to your own account.
            </p>
          </div>
        </div>

        {/* Trip Details Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Trip Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
                <MapPin size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Destination</p>
                <p className="text-sm font-semibold text-gray-900">{trip.destination}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                <Calendar size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-semibold text-gray-900">{formatDateRange(trip.start_date, trip.end_date)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100">
                <Users size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Travelers</p>
                <p className="text-sm font-semibold text-gray-900">{trip.travelers}</p>
              </div>
            </div>

            {trip.budget && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100">
                  <span className="text-amber-600 text-lg font-bold">$</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Budget</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {trip.budget.toLocaleString()} {trip.currency}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {canFork && (
            <button
              onClick={handleFork}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: BRAND }}
            >
              {isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Forking...</span>
                </>
              ) : (
                <>
                  <GitFork size={18} />
                  <span>Fork This Trip</span>
                </>
              )}
            </button>
          )}

          <Link
            href={user ? '/trips' : '/login'}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-all"
          >
            {user ? 'Go to My Trips' : 'Sign in to Fork'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SharedTripPage({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = use(params);

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['sharedTrip', token],
    queryFn: () => fetchTripByShareToken(token),
  });

  // Verify the trip ID matches
  const isValidTrip = trip?.id === id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !trip || !isValidTrip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-500 mb-6">
            This share link is invalid or the trip is no longer shared. Please contact the trip owner for a new link.
          </p>
          <Link
            href="/explore"
            className="inline-block px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            Explore Trips
          </Link>
        </div>
      </div>
    );
  }

  return <SharedTripView trip={trip} />;
}
