'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, PieChart, MapPin, Users2, ChevronRight } from 'lucide-react';
import { formatDateRange } from '@travyl/shared';
import type { MockTripCard } from '@travyl/shared';

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  planning: { label: 'Planning', bg: 'bg-blue-500/90', text: 'text-white' },
  booked: { label: 'Booked', bg: 'bg-emerald-500/90', text: 'text-white' },
  active: { label: 'Active', bg: 'bg-amber-500/90', text: 'text-white' },
  completed: { label: 'Completed', bg: 'bg-gray-500/90', text: 'text-white' },
  abandoned: { label: 'Cancelled', bg: 'bg-red-500/90', text: 'text-white' },
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

interface TripListItemProps {
  trip: MockTripCard;
}

export function TripListItem({ trip }: TripListItemProps) {
  const badge = STATUS_BADGE[trip.status] || STATUS_BADGE.planning;

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 px-4 py-3 cursor-pointer group transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm"
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative">
        <Image
          src={trip.image}
          alt={trip.destination}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + Status Badge */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-gray-900 truncate">{trip.title}</h3>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text} shrink-0`}>
            {badge.label}
          </span>
        </div>

        {/* Destination */}
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin size={12} className="text-gray-400" />
          <span className="text-sm text-gray-500">{trip.destination}</span>
        </div>

        {/* Metadata Row */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-gray-400" />
            {formatDateRange(trip.start_date, trip.end_date)}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} className="text-gray-400" />
            {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
          </span>
          {trip.budget && (
            <span className="flex items-center gap-1">
              <PieChart size={12} className="text-gray-400" />
              {formatCurrency(trip.budget, trip.currency)}
            </span>
          )}
          {trip.is_shared && (
            <span className="flex items-center gap-1 text-[#1e3a5f]" title="Shared trip">
              <Users2 size={12} />
              Shared
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <div className="shrink-0">
        <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </Link>
  );
}
