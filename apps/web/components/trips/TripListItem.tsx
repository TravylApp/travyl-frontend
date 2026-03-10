'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, PieChart, MapPin, Users2, ChevronRight } from 'lucide-react';
import type { MockTripCard } from '@travyl/shared';

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  planning: { label: 'Planning', bg: 'bg-blue-100', text: 'text-blue-700' },
  booked: { label: 'Booked', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  active: { label: 'Active', bg: 'bg-amber-100', text: 'text-amber-700' },
  completed: { label: 'Completed', bg: 'bg-gray-100', text: 'text-gray-600' },
  abandoned: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-600' },
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const sStr = s.toLocaleDateString('en-US', opts);
  const eStr = e.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  return `${sStr} – ${eStr}`;
}

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
      className="flex items-center gap-4 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-100 px-4 py-3.5 cursor-pointer group transition-all hover:bg-white hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100"
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative ring-1 ring-gray-100">
        <Image
          src={trip.image}
          alt={trip.destination}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="80px"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + Status Badge */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-bold text-[#1e3a5f] truncate">{trip.title}</h3>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.text} shrink-0`}>
            {badge.label}
          </span>
        </div>

        {/* Destination */}
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin size={12} className="text-[#F59E0B]" />
          <span className="text-sm text-gray-600">{trip.destination}</span>
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
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <PieChart size={12} className="text-[#F59E0B]" />
              {formatCurrency(trip.budget, trip.currency)}
            </span>
          )}
          {trip.is_shared && (
            <span className="flex items-center gap-1 text-[#1e3a5f] font-medium" title="Shared trip">
              <Users2 size={12} />
              Shared
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <div className="shrink-0">
        <ChevronRight size={18} className="text-gray-300 group-hover:text-[#F59E0B] transition-colors" />
      </div>
    </Link>
  );
}
