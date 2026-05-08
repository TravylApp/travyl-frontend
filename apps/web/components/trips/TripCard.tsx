'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, PieChart, MapPin, Users2, Trash2, Share2, MoreVertical, Plane } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteTrip, formatDateRange, formatCurrency } from '@travyl/shared';
import type { TripCard as TripCardData } from '@travyl/shared';
import { TripRouteHover } from './TripRouteHover';
import { ForkCountBadge } from '../trip/ForkAttribution';
import { TripShareModal } from './TripShareModal';

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  planning: { label: 'Planning', bg: 'bg-blue-500/90', text: 'text-white' },
  booked: { label: 'Booked', bg: 'bg-emerald-500/90', text: 'text-white' },
  active: { label: 'Active', bg: 'bg-amber-500/90', text: 'text-white' },
  completed: { label: 'Completed', bg: 'bg-gray-500/90', text: 'text-white' },
  abandoned: { label: 'Cancelled', bg: 'bg-red-500/90', text: 'text-white' },
};


interface TripCardProps {
  trip: TripCardData;
  className?: string;
  style?: React.CSSProperties;
}

export function TripCard({ trip, className, style }: TripCardProps) {
  const badge = STATUS_BADGE[trip.status] || STATUS_BADGE.planning;
  const [imgError, setImgError] = useState(false);
  const [showHover, setShowHover] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<'left' | 'right'>('right');
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    if (!confirm(`Delete "${trip.title}"? This cannot be undone.`)) return;
    try {
      await deleteTrip(trip.id);
      try {
        const stored = localStorage.getItem('my-trip-ids');
        if (stored) {
          const ids = JSON.parse(stored).filter((id: string) => id !== trip.id);
          localStorage.setItem('my-trip-ids', JSON.stringify(ids));
        }
      } catch {}
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete trip';
      toast.error(message);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    setShareModalOpen(true);
  };
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
      className={`relative group ${className ?? ''}`}
      style={style}
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
    >
      {/* 3-dot menu — outside Link */}
      <div className="absolute top-2 right-2 z-30">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
        >
          <MoreVertical size={16} className="text-white" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); }} />
            <div className="absolute right-0 top-9 z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[140px] animate-in fade-in-0 zoom-in-95 duration-150">
              <button onClick={handleShare} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Share2 size={14} className="text-gray-400" />
                Share trip
              </button>
              <div className="h-px bg-gray-100 mx-2" />
              <button onClick={handleDelete} className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={14} />
                Delete trip
              </button>
            </div>
          </>
        )}
      </div>
      <Link
        href={`/trip/${trip.id}`}
        className="block h-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
      >
        {/* Full-bleed image */}
        <div className="relative h-full min-h-[220px]">
          {imgError ? (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
              <Plane size={32} className="text-blue-300" />
            </div>
          ) : (
            <Image
              src={trip.image}
              alt={trip.destination}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => setImgError(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />

          {/* Status Badge - Top Left */}
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.text} backdrop-blur-sm z-10`}>
            {badge.label}
          </div>

          {/* Shared Indicator */}
          {trip.visibility !== 'private' && (
            <div className="absolute top-3 left-[85px] p-1.5 rounded-full bg-white/20 backdrop-blur-sm z-10" title="Shared trip">
              <Users2 size={11} className="text-white" />
            </div>
          )}

          {/* Bottom content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {trip.fork_count > 0 && (
              <div className="mb-2"><ForkCountBadge count={trip.fork_count} /></div>
            )}
            <h3 className="text-lg font-sans font-semibold text-white leading-tight mb-1 line-clamp-1 drop-shadow-md">
              {trip.title}
            </h3>
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin size={11} className="text-white/50 shrink-0" />
              <span className="text-[12px] text-white/70">{trip.destination}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-white/60">
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {formatDateRange(trip.start_date, trip.end_date)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={11} />
                {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
              </span>
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
          {/* Arrow pointer */}
          <div
            className={`absolute top-6 w-2 h-2 bg-white border-l border-b border-gray-100 rotate-45 ${
              hoverPosition === 'right' ? '-left-1' : '-right-1'
            }`}
          />
        </div>
      )}

      {/* Share Modal */}
      <TripShareModal
        trip={trip}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}
