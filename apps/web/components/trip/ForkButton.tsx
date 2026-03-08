'use client';

import { useRouter } from 'next/navigation';
import { GitFork, Loader2 } from 'lucide-react';
import { useForkTrip, canForkTrip, useAuthStore } from '@travyl/shared';
import type { Trip } from '@travyl/shared';

interface ForkButtonProps {
  trip: Trip;
  variant?: 'default' | 'compact';
  onSuccess?: (newTripId: string) => void;
}

export function ForkButton({ trip, variant = 'default', onSuccess }: ForkButtonProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { mutate: forkTripMutation, isPending, error } = useForkTrip();

  // Check if user can fork this trip
  const canFork = canForkTrip(trip, user?.id ?? null);

  if (!canFork) {
    return null;
  }

  const handleFork = () => {
    forkTripMutation(
      { tripId: trip.id },
      {
        onSuccess: (newTrip) => {
          if (onSuccess) {
            onSuccess(newTrip.id);
          } else {
            // Default behavior: navigate to the new trip
            router.push(`/trip/${newTrip.id}`);
          }
        },
      }
    );
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFork();
        }}
        disabled={isPending}
        className="flex items-center gap-1.5 h-[34px] px-3 rounded-xl border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 backdrop-blur-md transition-all text-[11px] font-medium disabled:opacity-50"
        title="Fork this trip to your own account"
      >
        {isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <GitFork size={13} />
        )}
        <span className="hidden sm:inline">Fork</span>
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleFork();
      }}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e3a5f] text-white font-semibold text-sm hover:bg-[#2d4a6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Forking...</span>
        </>
      ) : (
        <>
          <GitFork size={16} />
          <span>Fork Trip</span>
        </>
      )}
    </button>
  );
}
