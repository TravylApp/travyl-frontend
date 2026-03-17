'use client';

import Link from 'next/link';
import { GitFork, ExternalLink } from 'lucide-react';
import type { Trip } from '@travyl/shared';

interface ForkAttributionProps {
  trip: Trip;
  originalTrip?: {
    id: string;
    title: string;
    destination: string;
    user_id: string;
  } | null;
  originalOwner?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function ForkAttribution({ trip, originalTrip, originalOwner }: ForkAttributionProps) {
  // Only show if this trip was forked from another
  if (!trip.forked_from_trip_id) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200">
      <GitFork size={14} className="text-gray-500 shrink-0" />
      <span className="text-sm text-gray-600">
        Forked from{' '}
        {originalTrip ? (
          <Link
            href={`/trip/${originalTrip.id}`}
            className="font-medium text-[#1e3a5f] hover:underline inline-flex items-center gap-1"
          >
            {originalTrip.title}
            <ExternalLink size={12} className="text-gray-400" />
          </Link>
        ) : (
          <span className="font-medium text-gray-800">original trip</span>
        )}
        {originalOwner && (
          <>
            {' by '}
            <span className="font-medium text-gray-800">
              {originalOwner.display_name || 'Anonymous'}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

/**
 * Fork count badge to display on trip cards
 */
export function ForkCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
      <GitFork size={10} />
      <span>{count} fork{count === 1 ? '' : 's'}</span>
    </div>
  );
}
