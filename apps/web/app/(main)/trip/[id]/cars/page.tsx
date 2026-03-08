'use client';

import { Car, Plus, Users, Settings, Snowflake } from 'lucide-react';

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded bg-gray-200 ${className}`} style={style} />;
}

function SkeletonCarCard() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="h-[130px] bg-gray-100 flex items-center justify-center">
        <Car size={32} className="text-gray-300" />
      </div>
      <div className="p-3.5">
        <Skeleton style={{ width: '60%', height: 16 }} className="mb-1.5" />
        <Skeleton style={{ width: '40%', height: 12 }} className="mb-3" />
        <div className="flex gap-3 mb-3">
          <div className="flex items-center gap-1">
            <Users size={10} className="text-gray-400" />
            <Skeleton style={{ width: 20, height: 10 }} />
          </div>
          <div className="flex items-center gap-1">
            <Settings size={10} className="text-gray-400" />
            <Skeleton style={{ width: 40, height: 10 }} />
          </div>
          <div className="flex items-center gap-1">
            <Snowflake size={10} className="text-gray-400" />
            <Skeleton style={{ width: 20, height: 10 }} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Skeleton style={{ width: 70, height: 20 }} />
          <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: '#475569' }}>
            <Skeleton style={{ width: 60, height: 12 }} className="bg-white/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CarsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <SkeletonCarCard />
      <SkeletonCarCard />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#47556915' }}>
        <Car size={24} style={{ color: '#475569' }} />
      </div>
      <h3 className="text-[17px] font-bold text-gray-900 mb-1.5">No car rentals yet</h3>
      <p className="text-[13px] text-gray-500 text-center leading-5 mb-5">
        Add a car rental to manage your ground transportation for the trip.
      </p>
      <button className="flex items-center gap-2 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: '#475569' }}>
        <Plus size={12} />
        Add Car Rental
      </button>
    </div>
  );
}

export default function CarRental() {
  // No DB table yet — show empty state ready for future API
  return <EmptyState />;
}
