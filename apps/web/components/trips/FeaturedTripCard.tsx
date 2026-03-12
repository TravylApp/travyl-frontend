'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Calendar, Users, Users2, Clock } from 'lucide-react';
import type { MockTripCard } from '@travyl/shared';
import { EASE_OUT_EXPO } from '@travyl/shared';
import { CountdownBadge } from './CountdownBadge';
import { LocationHover } from './LocationHover';
import { TripRouteHover } from './TripRouteHover';

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

function getTripDuration(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

interface FeaturedTripCardProps {
  trip: MockTripCard;
  index?: number;
}

export function FeaturedTripCard({ trip, index = 0 }: FeaturedTripCardProps) {
  const badge = STATUS_BADGE[trip.status] || STATUS_BADGE.planning;
  const [showHover, setShowHover] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<'left' | 'right'>('right');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showHover && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      setHoverPosition(rect.left > viewportWidth / 2 ? 'left' : 'right');
    }
  }, [showHover]);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: EASE_OUT_EXPO }}
      className="relative"
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
    >
      <Link
        href={`/trip/${trip.id}`}
        className="block rounded-2xl overflow-hidden bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300 group"
      >
        {/* Image Header - Larger height for featured */}
        <div className="relative h-56 overflow-hidden">
          <Image
            src={trip.image}
            alt={trip.destination}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Status Badge */}
          <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
            {badge.label}
          </div>

          {/* Shared Indicator */}
          {trip.is_shared && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-primary-dark">
              <Users2 size={12} />
              Shared
            </div>
          )}

          {/* Bottom Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            {/* Countdown Badge */}
            <CountdownBadge
              startDate={trip.start_date}
              endDate={trip.end_date}
              status={trip.status}
              size="large"
            />

            {/* Trip Title */}
            <h2 className="text-2xl font-bold text-white mt-3 mb-1 line-clamp-1">
              {trip.title}
            </h2>

            {/* Destination with hover globe popup */}
            <LocationHover trip={trip} variant="dark" />
          </div>
        </div>

        {/* Card Body */}
        <div className="px-5 py-4 bg-white">
          {/* Metadata Row */}
          <div className="flex items-center gap-5 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-gray-400" />
              <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              <span>{getTripDuration(trip.start_date, trip.end_date)} days</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={15} className="text-gray-400" />
              <span>{trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}</span>
            </div>
          </div>
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
          <div
            className={`absolute top-6 w-2 h-2 bg-white border-l border-b border-gray-100 rotate-45 ${
              hoverPosition === 'right' ? '-left-1' : '-right-1'
            }`}
          />
        </div>
      )}
    </motion.div>
  );
}
