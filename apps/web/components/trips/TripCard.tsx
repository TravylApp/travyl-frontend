'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Users, MapPin, Coins, MoreHorizontal, Trash2, UserMinus, Share2 } from 'lucide-react';
import { formatDateRange } from '@travyl/shared';
import type { MockTripCard } from '@travyl/shared';
import { TripRouteHover } from './TripRouteHover';

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0, notation: 'compact' }).format(amount);
}

function getTripDuration(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysUntilTrip(start: string): number | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const s = new Date(start + 'T00:00:00');
  const diff = Math.ceil((s.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

function getStatusInfo(status: string, startDate: string): { label: string; color: string } | null {
  const daysUntil = getDaysUntilTrip(startDate);
  if (status === 'active') return { label: 'In progress', color: 'bg-emerald-500/80 text-white' };
  if (status === 'completed') return null;
  if (daysUntil !== null && daysUntil <= 30) return { label: `${daysUntil} days until trip`, color: 'bg-amber-400/90 text-gray-900' };
  if (daysUntil !== null) return { label: `${daysUntil} days until trip`, color: 'bg-white/20 text-white/80' };
  return null;
}

// Duration → row height in px (exported for layout use)
export function getDurationHeight(duration: number): number {
  if (duration <= 1) return 160;    // day trip
  if (duration <= 3) return 200;    // weekend trip
  if (duration <= 5) return 250;    // short trip
  if (duration <= 7) return 300;    // week trip
  if (duration <= 10) return 350;   // extended trip
  return 420;                        // long adventure
}

interface TripCardProps {
  trip: MockTripCard;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function TripCard({ trip, index = 0, className = '', style }: TripCardProps) {
  const [showHover, setShowHover] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<'left' | 'right'>('right');
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showHover && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setHoverPosition(rect.left > window.innerWidth / 2 ? 'left' : 'right');
    }
  }, [showHover]);

  useEffect(() => {
    if (!showMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const members = trip.members ?? [];
  const visibleMembers = members.slice(0, 3);
  const extraCount = members.length - 3;
  const duration = getTripDuration(trip.start_date, trip.end_date);
  const statusInfo = getStatusInfo(trip.status, trip.start_date);

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      style={style}
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
    >
      <Link
        href={`/trip/${trip.id}`}
        className="group block relative h-full rounded-2xl overflow-hidden cursor-pointer"
      >
        {/* Full-bleed image */}
        <Image
          src={trip.image}
          alt={trip.destination}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Gradient — stronger for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25" />

        {/* Top row: duration pill + members + share */}
        <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-white shadow-sm">
              {duration} days
            </span>

            {visibleMembers.length > 0 && (
              <div className="flex -space-x-2">
                {visibleMembers.map((m) => (
                  <div
                    key={m.id}
                    className="w-7 h-7 rounded-full border-2 border-white/50 overflow-hidden bg-[#1e3a5f] flex items-center justify-center shadow-sm"
                    title={`${m.name} (${m.role})`}
                  >
                    {m.avatar ? (
                      <Image src={m.avatar} alt={m.name} width={28} height={28} className="object-cover" />
                    ) : (
                      <span className="text-[10px] font-semibold text-white">
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
                {extraCount > 0 && (
                  <div className="w-7 h-7 rounded-full border-2 border-white/50 bg-black/30 backdrop-blur-sm flex items-center justify-center shadow-sm">
                    <span className="text-[10px] font-medium text-white">+{extraCount}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-all">
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu((v) => !v);
                }}
                className="p-1.5 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/30 transition-all"
                title="More options"
              >
                <MoreHorizontal size={16} className="text-white" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const url = `${window.location.origin}/trip/${trip.id}`;
                      navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Share2 size={15} className={copied ? 'text-emerald-500' : 'text-gray-400'} />
                    {copied ? 'Copied!' : 'Share Trip'}
                  </button>
                  {members.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(false);
                        // TODO: open revoke access modal
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserMinus size={15} className="text-gray-400" />
                      Manage Access
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      // TODO: open delete confirmation modal
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} className="text-red-400" />
                    Delete Trip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          {statusInfo && (
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-2 backdrop-blur-sm shadow-sm ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          )}

          <h2 className="text-lg font-bold text-white leading-snug line-clamp-1" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
            {trip.title}
          </h2>

          <div className="flex items-center gap-1.5 mt-1 mb-2">
            <MapPin size={13} className="text-white/70" />
            <span className="text-sm text-white/90" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{trip.destination}</span>
          </div>

          <div className="flex items-center gap-4 text-[13px] text-white/90" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className="text-white/70" />
              {formatDateRange(trip.start_date, trip.end_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-white/70" />
              {trip.travelers}
            </span>
            {trip.budget && (
              <span className="flex items-center gap-1.5">
                <Coins size={13} className="text-white/70" />
                {formatCurrency(trip.budget, trip.currency)}
              </span>
            )}
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
    </div>
  );
}
