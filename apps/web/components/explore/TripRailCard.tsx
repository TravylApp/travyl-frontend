'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { MapPin, GitFork, Loader2 } from 'lucide-react';
import { useForkTrip, useAuthStore, canForkTrip, formatDateRange } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

export interface TripRailCardProps {
  trip: Trip & { profiles?: { display_name: string | null; avatar_url: string | null } | null };
}

export function TripRailCard({ trip }: TripRailCardProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
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
        onSuccess: (newTrip) => {
          setForking(false);
          router.push(`/trip/${newTrip.id}`);
        },
        onError: () => setForking(false),
      },
    );
  };

  const heroRaw = trip.trip_context?.hero_image_url ?? null;
  const hero = heroRaw && heroRaw.includes('googleusercontent.com')
    ? heroRaw.replace(/=w\d+-h\d+[^&]*/, '=w600-h400-k-no')
    : heroRaw;

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="group shrink-0 snap-start w-[260px] sm:w-[280px] rounded-2xl overflow-hidden bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] hover:shadow-lg dark:hover:border-white/20 transition-all duration-300"
    >
      <div className="relative h-[160px] overflow-hidden bg-gradient-to-br from-[#e8d5c0] to-[#d4b896]">
        {hero ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={hero}
            alt={trip.destination}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/70">
            <MapPin size={28} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {trip.fork_count > 0 && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 h-6 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm text-[11px] font-semibold text-[#1e3a5f] dark:text-white">
            <GitFork size={11} />
            <span>{trip.fork_count}</span>
          </div>
        )}
      </div>

      <div className="px-3.5 py-3">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white leading-tight line-clamp-1 mb-1">
          {trip.title}
        </h3>
        <div className="flex items-center gap-1 text-[12px] text-gray-500 dark:text-white/60 mb-2">
          <MapPin size={11} />
          <span className="truncate">{trip.destination}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
          {trip.profiles?.display_name && (
            <span className="truncate ml-2 max-w-[100px]">by {trip.profiles.display_name}</span>
          )}
        </div>

        {user === null ? (
          <Link
            href={`/login?redirect=${encodeURIComponent(pathname)}`}
            onClick={(e) => e.stopPropagation()}
            className="mt-3 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-gray-200 dark:border-white/[0.08] text-[12px] font-semibold text-gray-700 dark:text-white/80 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
          >
            <GitFork size={11} /> Sign in to fork
          </Link>
        ) : canFork ? (
          <button
            type="button"
            onClick={handleFork}
            disabled={isPending || forking}
            className="mt-3 flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-[#1e3a5f] text-white text-[12px] font-semibold hover:bg-[#16314f] transition-colors disabled:opacity-60"
          >
            {isPending || forking ? <Loader2 size={11} className="animate-spin" /> : <GitFork size={11} />}
            Fork trip
          </button>
        ) : null}
      </div>
    </Link>
  );
}
