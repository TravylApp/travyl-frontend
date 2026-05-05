'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, PieChart, MapPin, Users2, ChevronRight, Share2, Trash2, Plane } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteTrip, formatDateRange, formatCurrency } from '@travyl/shared';
import type { TripCard } from '@travyl/shared';
import { TripShareModal } from './TripShareModal';

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  planning: { label: 'Planning', bg: 'bg-blue-500/90', text: 'text-white' },
  booked: { label: 'Booked', bg: 'bg-emerald-500/90', text: 'text-white' },
  active: { label: 'Active', bg: 'bg-amber-500/90', text: 'text-white' },
  completed: { label: 'Completed', bg: 'bg-gray-500/90', text: 'text-white' },
  abandoned: { label: 'Cancelled', bg: 'bg-red-500/90', text: 'text-white' },
};


interface TripListItemProps {
  trip: TripCard;
}

export function TripListItem({ trip }: TripListItemProps) {
  const badge = STATUS_BADGE[trip.status] || STATUS_BADGE.planning;
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="flex items-center gap-4 rounded-2xl bg-white border border-gray-200 px-4 py-3 cursor-pointer group transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 relative">
        {imgError ? (
          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
            <Plane size={24} className="text-blue-300" />
          </div>
        ) : (
          <Image
            src={trip.image}
            alt={trip.destination}
            width={80}
            height={80}
            className="w-20 h-20 rounded-lg object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + Status Badge */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-sans font-semibold text-gray-900 truncate">{trip.title}</h3>
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
          {trip.visibility !== 'private' && (
            <span className="flex items-center gap-1 text-[#1e3a5f]" title="Shared trip">
              <Users2 size={12} />
              Shared
            </span>
          )}
        </div>
      </div>

      {/* Share + Chevron */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShareModalOpen(true);
          }}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
          title="Share trip"
        >
          <Share2 size={14} className={copied ? 'text-emerald-500' : 'text-gray-400'} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete trip"
        >
          <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
        </button>
        <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>

      {/* Share Modal */}
      <TripShareModal
        trip={trip}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </Link>
  );
}
