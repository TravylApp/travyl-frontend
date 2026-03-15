'use client';

import { useState, useRef, useEffect } from 'react';
import { Plane, ChevronDown, Check } from 'lucide-react';
import type { MockFlightDetail } from '@travyl/shared';

interface FlightSectionProps {
  flight: MockFlightDetail;
  collapsed?: boolean;
}

export function FlightSection({ flight, collapsed }: FlightSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((prev) => !prev);

  useEffect(() => {
    if (collapsed !== undefined) {
      setExpanded(!collapsed);
    }
  }, [collapsed]);

  const contentRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setMeasuredHeight(contentRef.current.scrollHeight);
    }
  }, [expanded]);

  const label = flight.type === 'arrival' ? 'Arrival Flight' : 'Return Flight';

  return (
    <section className="mb-3.5 space-y-2">
      {/* Header */}
      <button
        onClick={toggle}
        className="w-full rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-all"
        style={{ backgroundColor: 'var(--trip-base)' }}
      >
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Plane size={18} />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className="text-sm">{label}</p>
                {flight.isBooked && (
                  <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                    Booked
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90">
                Flight {flight.flightNumber} &bull; {flight.departureTime}
              </p>
            </div>
          </div>
          <ChevronDown
            size={20}
            className="transition-transform duration-300"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </div>
      </button>

      {/* Expandable content */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: expanded ? `${measuredHeight + 20}px` : '0px',
          opacity: expanded ? 1 : 0,
          willChange: 'max-height, opacity',
        }}
      >
        <div className="bg-white rounded-lg overflow-hidden border border-blue-200 shadow-sm">
          {/* Flight Route Visualization */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 mb-0.5">Departure</p>
                <p className="text-xl" style={{ color: 'var(--trip-base)' }}>{flight.originIata}</p>
                <p className="text-sm font-medium text-gray-800 mt-1">{flight.departureTime}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{flight.departureTerminal} &middot; Gate {flight.gate}</p>
                <p className="text-[11px] text-gray-400">Boarding: {flight.boardingTime}</p>
              </div>
              <div className="flex-1 flex flex-col items-center px-2">
                <div className="relative w-full">
                  <div className="border-t border-dashed border-gray-300 w-full" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full p-1" style={{ backgroundColor: 'var(--trip-base)' }}>
                    <Plane size={12} className="text-white" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{flight.duration}</p>
                <p className="text-[11px] font-medium text-emerald-600">Direct</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 mb-0.5">Arrival</p>
                <p className="text-xl" style={{ color: 'var(--trip-base)' }}>{flight.destIata}</p>
                <p className="text-sm font-medium text-gray-800 mt-1">{flight.arrivalTime}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{flight.arrivalTerminal}</p>
              </div>
            </div>

            {/* Airline & Status */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-800 font-medium">{flight.airline}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Check-in by: {flight.boardingTime}</span>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.08)', color: 'var(--trip-base)' }}
                >
                  {flight.status}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="pt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Flight</span>
                <span className="text-gray-800 font-medium">{flight.flightNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="text-gray-800 font-medium">{flight.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Aircraft</span>
                <span className="text-gray-800 font-medium">{flight.aircraft}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Class</span>
                <span className="text-gray-800 font-medium">{flight.cabinClass}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Seats</span>
                <span className="text-gray-800 font-medium">{flight.seats}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Baggage</span>
                <span className="text-gray-800 font-medium">{flight.baggage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Meal</span>
                <span className="text-gray-800 font-medium">{flight.meal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Wi-Fi</span>
                <span className="text-gray-800 font-medium">{flight.wifi ? 'Available' : 'N/A'}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-gray-500">Confirmation</span>
                <span className="font-semibold font-mono" style={{ color: 'var(--trip-base)' }}>{flight.confirmation}</span>
              </div>
            </div>

            {/* Booking Section */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-gray-500">Per traveler</p>
                <p className="text-lg" style={{ color: 'var(--trip-base)' }}>${flight.pricePerTraveler}</p>
                <p className="text-[11px] text-gray-400">Total: ${flight.totalPrice}</p>
              </div>
              <button
                className={`px-5 py-2 rounded-lg font-medium text-xs transition-all flex items-center gap-2 ${
                  flight.isBooked
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'text-white hover:bg-trip-base-light'
                }`}
                style={!flight.isBooked ? { backgroundColor: 'var(--trip-base)' } : undefined}
              >
                {flight.isBooked ? (
                  <>
                    <Check size={14} />
                    Flight Booked
                  </>
                ) : (
                  <>
                    <Plane size={14} />
                    Book Flight
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
