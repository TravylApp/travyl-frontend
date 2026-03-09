'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, PieChart, MapPin, Users2 } from 'lucide-react';
import type { MockTripCard } from '@travyl/shared';
import { TripRouteHover } from './TripRouteHover';

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  planning: { label: 'Planning', bg: 'bg-blue-500/90', text: 'text-white' },
  booked: { label: 'Booked', bg: 'bg-emerald-500/90', text: 'text-white' },
  active: { label: 'Active', bg: 'bg-amber-500/90', text: 'text-white' },
  completed: { label: 'Completed', bg: 'bg-gray-500/90', text: 'text-white' },
  abandoned: { label: 'Cancelled', bg: 'bg-red-500/90', text: 'text-white' },
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

interface TripCardProps {
  trip: MockTripCard;
}

export function TripCard({ trip }: TripCardProps) {
  const badge = STATUS_BADGE[trip.status] || STATUS_BADGE.planning;
  const [showHover, setShowHover] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<'left' | 'right'>('right');
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate position based on card location in viewport
  useEffect(() => {
    if (showHover && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      // If card is on the right half of the screen, show tooltip on left
      setHoverPosition(rect.left > viewportWidth / 2 ? 'left' : 'right');
    }
  }, [showHover]);

  return (
    <div
      ref={cardRef}
      className="relative"
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
    >
      <Link
        href={`/trip/${trip.id}`}
        className="block rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
      >
        {/* Image Header - Smaller height */}
        <div className="relative h-36 overflow-hidden">
          <Image
            src={trip.image}
            alt={trip.destination}
            fill
            className="object-cover hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* Status Badge - Top Right */}
          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text} backdrop-blur-sm`}>
            {badge.label}
          </div>

          {/* Shared Indicator - Top Left */}
          {trip.is_shared && (
            <div className="absolute top-3 left-3 p-1.5 rounded-full bg-white/90 backdrop-blur-sm" title="Shared trip">
              <Users2 size={12} className="text-[#1e3a5f]" />
            </div>
          )}
        </div>

        {/* Card Body - White background with trip name prominent */}
        <div className="px-4 py-3">
          {/* Trip Title - PRIMARY (large, bold) */}
          <h2 className="text-lg font-bold text-gray-900 leading-tight mb-1 line-clamp-1">
            {trip.title}
          </h2>

          {/* Destination - SECONDARY (small, muted with MapPin) */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <MapPin size={13} className="text-gray-400" />
            <span className="text-sm text-gray-500">{trip.destination}</span>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400" />
              <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-gray-400" />
              <span>{trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}</span>
            </div>
          </div>
          {trip.budget && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
              <PieChart size={13} className="text-gray-400" />
              <span>{formatCurrency(trip.budget, trip.currency)} budget</span>
            </div>
          )}
        </div>
      </Link>

      {/* Hover Route Card */}
      {showHover && trip.route && (
        <div
          className={`absolute top-0 z-50 ${
            hoverPosition === 'right' ? 'left-full ml-3' : 'right-full mr-3'
          } animate-in fade-in-0 zoom-in-95 duration-200`}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
            <TripRouteHover trip={trip} />
          </div>
          {/* Arrow pointer */}
          <div
            className={`absolute top-6 w-2 h-2 bg-white border-l border-b border-gray-100 rotate-45 ${
              hoverPosition === 'right' ? '-left-1' : '-right-1'
            }`}
          />
        </div>
      )}
    </div>
  );
}
