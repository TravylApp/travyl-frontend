'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTrips, MOCK_TRIPS } from '@travyl/shared';
import type { MockTripCard } from '@travyl/shared';
import { Calendar, Users, PieChart, Plus, MapPin, Plane } from 'lucide-react';
import { Footer, OceanWave } from '@/components/home';

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

function TripCard({ trip }: { trip: MockTripCard }) {
  const badge = STATUS_BADGE[trip.status] || STATUS_BADGE.planning;

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="group block rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
    >
      {/* Image Header */}
      <div className="relative h-48 overflow-hidden">
        <Image
          src={trip.image}
          alt={trip.destination}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Status Badge */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text} backdrop-blur-sm`}>
          {badge.label}
        </div>

        {/* Destination overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin size={13} className="text-white/80" />
            <span className="text-white/80 text-xs">{trip.destination}</span>
          </div>
          <h2 className="text-white font-bold text-lg leading-tight">{trip.title}</h2>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 py-3 space-y-2">
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
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <PieChart size={13} className="text-gray-400" />
            <span>{formatCurrency(trip.budget, trip.currency)} budget</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="px-4 py-3 space-y-2">
        <div className="h-3 w-3/4 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function MyTripsPage() {
  // Auth commented out for testing
  // const user = useAuthStore((s) => s.user);
  // const loading = useAuthStore((s) => s.loading);
  const { data: trips, isLoading, isError } = useTrips();

  // Use real trips when available, otherwise fallback to mock data
  const displayTrips: MockTripCard[] = (trips?.length && !isError)
    ? trips.map((t) => ({
        ...t,
        image: MOCK_TRIPS.find((m) => m.id === t.id)?.image
          || `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800`,
      }))
    : MOCK_TRIPS;

  if (isLoading && !isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
          >
            <Plus size={16} />
            Plan a Trip
          </button>
        </div>

        {/* Grid */}
        {displayTrips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Plane size={32} className="text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">No trips yet</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">Start planning your next adventure and it will appear here.</p>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }}
            >
              <Plus size={16} />
              Plan a Trip
            </button>
          </div>
        )}
      </div>
      <OceanWave />
      <Footer />
    </div>
  );
}
