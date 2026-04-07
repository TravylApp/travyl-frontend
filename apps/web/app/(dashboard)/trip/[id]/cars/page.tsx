'use client';

import { Car, Plus } from 'lucide-react';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mb-4">
        <Car size={24} className="text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5">No car rentals yet</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs mb-5">
        Add a car rental to manage your ground transportation for the trip.
      </p>
      <button className="flex items-center gap-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
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
