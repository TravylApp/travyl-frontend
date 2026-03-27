'use client';

import { Car, Plus } from 'lucide-react';

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
