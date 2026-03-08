'use client';

import { Plane } from 'lucide-react';
import type { FlightViewModel } from '@travyl/shared';

interface FlightCardProps {
  flight: FlightViewModel;
  variant?: 'outbound' | 'return';
}

export function FlightCard({ flight, variant = 'outbound' }: FlightCardProps) {
  const isReturn = variant === 'return';

  return (
    <div className="rounded-xl bg-white overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow mb-3">
      {/* Header band — sky blue gradient (outbound) or navy gradient (return) */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: isReturn
            ? 'linear-gradient(135deg, #1e3a5f, #2d4a6f)'
            : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
        }}
      >
        <div className="flex items-center gap-2">
          <Plane size={16} className="text-white" style={isReturn ? { transform: 'rotate(180deg)' } : undefined} />
          <div>
            <span className="block text-sm font-medium text-white">
              {isReturn ? 'Return Flight' : 'Outbound Flight'}
            </span>
            <span className="block text-xs text-white/80">
              {flight.airline}{flight.flightNumber ? ` · ${flight.flightNumber}` : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            Confirmed
          </span>
          {flight.priceDisplay && (
            <span className="text-[15px] font-bold text-white">{flight.priceDisplay}</span>
          )}
        </div>
      </div>

      {/* Route section */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Departure */}
          <div className="text-center flex-1">
            <p className="text-xl text-[#1e3a5f] font-semibold">{flight.originIata}</p>
            <p className="text-xs text-gray-500 mt-0.5">Departure</p>
            {flight.departureDisplay && (
              <p className="text-sm font-medium text-gray-800 mt-0.5">{flight.departureDisplay}</p>
            )}
          </div>

          {/* Route connector */}
          <div className="flex-[2] flex flex-col items-center px-2">
            <div className="flex items-center w-full">
              <div className="flex-1 border-t border-dashed border-gray-300" />
              <div className="w-7 h-7 rounded-full bg-[#0ea5e9] flex items-center justify-center mx-1">
                <Plane size={12} className="text-white" />
              </div>
              <div className="flex-1 border-t border-dashed border-gray-300" />
            </div>
            <span className="text-xs text-gray-500 mt-1">Direct</span>
          </div>

          {/* Arrival */}
          <div className="text-center flex-1">
            <p className="text-xl text-[#1e3a5f] font-semibold">{flight.destIata}</p>
            <p className="text-xs text-gray-500 mt-0.5">Arrival</p>
            {flight.arrivalDisplay && (
              <p className="text-sm font-medium text-gray-800 mt-0.5">{flight.arrivalDisplay}</p>
            )}
          </div>
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-gray-100">
          <span className="bg-[#0ea5e9]/10 text-[#0ea5e9] text-[11px] font-medium px-2.5 py-1 rounded-full">
            On Time
          </span>
          {flight.cabinClass && (
            <span className="bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-medium px-2 py-0.5 rounded-full">
              {flight.cabinClass}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
