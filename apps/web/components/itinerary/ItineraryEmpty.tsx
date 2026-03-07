'use client';

import { CalendarDays } from 'lucide-react';

export function ItineraryEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-14 h-14 rounded-full bg-[#1e3a5f]/15 flex items-center justify-center mb-4">
        <CalendarDays size={24} className="text-[#1e3a5f]" />
      </div>
      <h2 className="text-[17px] font-bold text-gray-900 mb-1.5 text-center">No itinerary yet</h2>
      <p className="text-[13px] text-gray-500 text-center max-w-xs leading-5">
        Your AI-generated itinerary will appear here once your trip is planned.
      </p>
    </div>
  );
}
