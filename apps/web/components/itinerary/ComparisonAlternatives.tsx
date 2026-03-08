'use client';

import { useState } from 'react';
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Wifi,
  Zap,
  Utensils,
  Monitor,
  Luggage,
  Briefcase,
  Leaf,
  Shield,
  Check,
  X,
  Star,
  Info,
} from 'lucide-react';
import { FLIGHT_OPTIONS, ALTERNATIVE_AIRPORTS } from '@travyl/shared';
import type { FlightOption } from '@travyl/shared';

/* ── Helpers ────────────────────────────────────────────────── */

type SortMode = 'price' | 'fastest' | 'best';

function sortFlights(flights: FlightOption[], mode: SortMode): FlightOption[] {
  const sorted = [...flights];
  switch (mode) {
    case 'price':
      return sorted.sort((a, b) => a.price.total - b.price.total);
    case 'fastest':
      return sorted.sort((a, b) => parseDuration(a.duration) - parseDuration(b.duration));
    case 'best':
      return sorted.sort((a, b) => bestScore(b) - bestScore(a));
  }
}

function parseDuration(d: string): number {
  const h = d.match(/(\d+)h/)?.[1] ?? '0';
  const m = d.match(/(\d+)m/)?.[1] ?? '0';
  return parseInt(h) * 60 + parseInt(m);
}

function bestScore(f: FlightOption): number {
  // Lower price, shorter duration, higher on-time all contribute positively
  const priceScore = 1000 / f.price.total;
  const durationScore = 1000 / parseDuration(f.duration);
  const onTimeScore = f.onTime / 100;
  return priceScore + durationScore + onTimeScore;
}

function badgeGradient(badge: string): string {
  switch (badge) {
    case 'Best Overall':
      return 'linear-gradient(135deg, #f59e0b, #f97316)';
    case 'Fastest':
      return 'linear-gradient(135deg, #3b82f6, #6366f1)';
    case 'Lowest Price':
      return 'linear-gradient(135deg, #10b981, #059669)';
    default:
      return 'linear-gradient(135deg, #6b7280, #9ca3af)';
  }
}

/* ── ComparisonFlightCard ───────────────────────────────────── */

function ComparisonFlightCard({
  flight,
  onSelect,
}: {
  flight: FlightOption;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const co2Diff = flight.co2 - flight.co2Avg;
  const co2Label = co2Diff <= 0 ? `${Math.abs(co2Diff)}kg below avg` : `${co2Diff}kg above avg`;
  const co2Color = co2Diff <= 0 ? 'text-emerald-600' : 'text-amber-600';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
      {/* Badge strip */}
      {flight.badge && (
        <div
          className="px-4 py-1.5 text-white text-xs font-bold flex items-center gap-1.5"
          style={{ background: badgeGradient(flight.badge) }}
        >
          <Star size={12} />
          {flight.badge}
        </div>
      )}

      {/* Main card body */}
      <div className="p-4">
        {/* Top row: Airline + Price */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Airline logo placeholder */}
            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-600">{flight.airlineLogo}</span>
            </div>
            <div>
              <span className="block text-sm font-semibold text-gray-900">{flight.airline}</span>
              <span className="block text-xs text-gray-500">
                {flight.flightNumber} · {flight.aircraft}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-lg font-bold text-gray-900">
              ${flight.price.total.toLocaleString()}
            </span>
            <span className="block text-[11px] text-gray-500">/person</span>
          </div>
        </div>

        {/* Route row */}
        <div className="flex items-center gap-3 mb-3">
          {/* Departure */}
          <div className="text-center">
            <span className="block text-lg font-bold text-gray-900">{flight.departure.time}</span>
            <span className="block text-xs font-medium text-gray-600">{flight.departure.airport}</span>
            <span className="block text-[10px] text-gray-400">T{flight.departure.terminal}</span>
          </div>

          {/* Route line */}
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[11px] text-gray-500 mb-1">{flight.duration}</span>
            <div className="flex items-center w-full">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="flex-1 border-t border-dashed border-gray-300 mx-1 relative">
                {flight.stops > 0 && flight.layover && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-amber-600 font-medium whitespace-nowrap bg-amber-50 px-1.5 py-0.5 rounded">
                    {flight.layover.airport} · {flight.layover.duration}
                  </span>
                )}
              </div>
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <span className="text-[10px] text-gray-400 mt-1">
              {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop`}
            </span>
          </div>

          {/* Arrival */}
          <div className="text-center">
            <span className="block text-lg font-bold text-gray-900">
              {flight.arrival.time}
              {flight.arrival.nextDay && (
                <span className="text-[10px] text-amber-600 font-medium ml-0.5">+1</span>
              )}
            </span>
            <span className="block text-xs font-medium text-gray-600">{flight.arrival.airport}</span>
            <span className="block text-[10px] text-gray-400">T{flight.arrival.terminal}</span>
          </div>
        </div>

        {/* Quick amenities row */}
        <div className="flex items-center gap-2 mb-3">
          <AmenityPill icon={<Wifi size={11} />} active={flight.amenities.wifi} label="Wi-Fi" />
          <AmenityPill icon={<Zap size={11} />} active={flight.amenities.power} label="Power" />
          <AmenityPill icon={<Utensils size={11} />} active={flight.amenities.meals} label="Meals" />
          <AmenityPill icon={<Monitor size={11} />} active={flight.amenities.entertainment} label="IFE" />
          <span className="ml-auto text-xs text-gray-500">
            {flight.fareClass}
          </span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-blue-600 font-medium py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {expanded ? 'Hide details' : 'Show details'}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-4">
            {/* Price breakdown */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Price Breakdown
              </h5>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base fare</span>
                  <span className="text-gray-900 font-medium">${flight.price.base}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Taxes &amp; fees</span>
                  <span className="text-gray-900 font-medium">${flight.price.taxes}</span>
                </div>
                <div className="flex justify-between text-sm pt-1.5 border-t border-gray-200">
                  <span className="text-gray-900 font-semibold">Total</span>
                  <span className="text-gray-900 font-bold">${flight.price.total}</span>
                </div>
              </div>
            </div>

            {/* Baggage */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Baggage
              </h5>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Briefcase size={14} className="text-gray-400" />
                  Carry-on: {flight.baggage.carryOn ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <X size={14} className="text-red-400" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Luggage size={14} className="text-gray-400" />
                  Checked: {flight.baggage.checked}
                  {flight.baggage.checkedFee > 0 && (
                    <span className="text-amber-600 text-xs">(+${flight.baggage.checkedFee})</span>
                  )}
                </div>
              </div>
            </div>

            {/* Seat info */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Seat &amp; Comfort
              </h5>
              <div className="flex gap-4 text-sm text-gray-700">
                <span>Pitch: {flight.seatPitch}</span>
                <span>Width: {flight.seatWidth}</span>
              </div>
            </div>

            {/* Flexibility */}
            <div>
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Flexibility
              </h5>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <Shield size={14} className={flight.cancellation.refundable ? 'text-emerald-500' : 'text-gray-400'} />
                  <span className="text-gray-700">
                    {flight.cancellation.refundable ? 'Refundable' : 'Non-refundable'}
                  </span>
                </div>
                {flight.cancellation.changeFee > 0 && (
                  <span className="text-xs text-gray-500 ml-6">
                    Change fee: ${flight.cancellation.changeFee}
                  </span>
                )}
                <p className="text-xs text-gray-500 ml-6">{flight.cancellation.policy}</p>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-4 py-2.5 px-3 rounded-lg bg-gray-50 text-xs">
              <div className="flex items-center gap-1.5">
                <Info size={12} className="text-blue-500" />
                <span className="text-gray-600">On-time:</span>
                <span className="font-semibold text-gray-900">{flight.onTime}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Leaf size={12} className={co2Diff <= 0 ? 'text-emerald-500' : 'text-amber-500'} />
                <span className={`font-medium ${co2Color}`}>{co2Label}</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <Star size={12} className="text-amber-500" />
                <span className="text-gray-600">{flight.milesEarned.toLocaleString()} miles</span>
              </div>
            </div>

            {/* Select button */}
            <button
              onClick={() => onSelect(flight.id)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Select This Flight
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Amenity pill ────────────────────────────────────────────── */

function AmenityPill({
  icon,
  active,
  label,
}: {
  icon: React.ReactNode;
  active: boolean;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${
        active
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-gray-100 text-gray-400 border border-gray-200 line-through'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function ComparisonAlternatives() {
  const [collapsed, setCollapsed] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('best');
  const [showAltAirports, setShowAltAirports] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);

  const sorted = sortFlights(FLIGHT_OPTIONS, sortMode);

  const handleSelect = (id: string) => {
    setSelectedFlight(id);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm mb-4">
      {/* ── Collapsible Header ──────────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <TrendingUp size={18} className="text-indigo-600" />
          </div>
          <div className="text-left">
            <span className="block text-sm font-semibold text-gray-900">Compare Flights</span>
            <span className="block text-xs text-gray-500">
              {FLIGHT_OPTIONS.length} options · From ${Math.min(...FLIGHT_OPTIONS.map((f) => f.price.total)).toLocaleString()}
            </span>
          </div>
        </div>
        {collapsed ? (
          <ChevronDown size={18} className="text-gray-400" />
        ) : (
          <ChevronUp size={18} className="text-gray-400" />
        )}
      </button>

      {/* ── Body ────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {/* Sort + Alt airports controls */}
          <div className="flex items-center justify-between pt-4 pb-3">
            {/* Sort buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 mr-1">Sort:</span>
              {(['price', 'fastest', 'best'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sortMode === mode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'price' ? 'Price' : mode === 'fastest' ? 'Fastest' : 'Best Value'}
                </button>
              ))}
            </div>

            {/* Alt airports toggle */}
            <button
              onClick={() => setShowAltAirports(!showAltAirports)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showAltAirports
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Alt Airports
              {showAltAirports ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Alternative airports panel */}
          {showAltAirports && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <h5 className="text-xs font-semibold text-emerald-800 mb-2">
                Nearby Airport Alternatives
              </h5>
              <div className="flex gap-2">
                {ALTERNATIVE_AIRPORTS.map((alt) => (
                  <div
                    key={alt.code}
                    className="flex-1 rounded-lg bg-white border border-emerald-200 p-2.5 text-center"
                  >
                    <span className="block text-sm font-bold text-gray-900">{alt.code}</span>
                    <span className="block text-[11px] text-gray-500 mb-1">{alt.name}</span>
                    <span className="inline-block bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      Save ${alt.savings}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flight cards */}
          <div className="space-y-3">
            {sorted.map((flight) => (
              <ComparisonFlightCard
                key={flight.id}
                flight={flight}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Selected flight confirmation */}
          {selectedFlight && (
            <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center justify-between">
              <span className="text-sm text-blue-800 font-medium">
                Selected: {FLIGHT_OPTIONS.find((f) => f.id === selectedFlight)?.flightNumber ?? selectedFlight}
              </span>
              <button
                onClick={() => setSelectedFlight(null)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
