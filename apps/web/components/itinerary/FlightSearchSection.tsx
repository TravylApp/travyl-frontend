'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Plane,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  SlidersHorizontal,
  X,
  Plus,
  Minus,
  RotateCcw,
} from 'lucide-react';
import type { PopularAirport } from '@travyl/shared';

/* ── Constants ──────────────────────────────────────────────── */

const POPULAR_AIRPORTS: PopularAirport[] = [
  { code: 'JFK', name: 'John F. Kennedy Intl', city: 'New York' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris' },
  { code: 'EWR', name: 'Newark Liberty Intl', city: 'Newark' },
  { code: 'LGA', name: 'LaGuardia', city: 'New York' },
  { code: 'ORY', name: 'Paris Orly', city: 'Paris' },
  { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino', city: 'Rome' },
  { code: 'LHR', name: 'Heathrow', city: 'London' },
  { code: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles' },
  { code: 'NRT', name: 'Narita Intl', city: 'Tokyo' },
  { code: 'SFO', name: 'San Francisco Intl', city: 'San Francisco' },
];

const CABIN_CLASSES = ['Economy', 'Premium Economy', 'Business', 'First'];

const DEPARTURE_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Red-eye'];
const ARRIVAL_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Late Night'];

const AIRLINES = [
  'American Airlines',
  'Delta Air Lines',
  'United Airlines',
  'Lufthansa',
  'ITA Airways',
  'British Airways',
];

/* ── Sub-components ─────────────────────────────────────────── */

function AirportDropdown({
  value,
  onChange,
  label,
  isOpen,
  onToggle,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onToggle]);

  const filtered = POPULAR_AIRPORTS.filter((a: PopularAirport) => {
    const q = query.toLowerCase();
    return (
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q)
    );
  });

  const selected = POPULAR_AIRPORTS.find((a: PopularAirport) => a.code === value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left hover:border-blue-300 transition-colors min-w-[160px]"
      >
        <div className="flex-1">
          <span className="block text-[10px] uppercase tracking-wide text-gray-400 font-medium">
            {label}
          </span>
          <span className="block text-sm font-semibold text-gray-900">
            {value}
          </span>
          {selected && (
            <span className="block text-[11px] text-gray-500 truncate max-w-[120px]">
              {selected.city}
            </span>
          )}
        </div>
        <ChevronDown size={14} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search airport or city..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                autoFocus
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X size={12} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">No airports found</p>
            )}
            {filtered.map((a: PopularAirport) => (
              <button
                key={a.code}
                onClick={() => {
                  onChange(a.code);
                  setQuery('');
                  onToggle();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors ${
                  a.code === value ? 'bg-blue-50' : ''
                }`}
              >
                <span className="w-10 text-sm font-bold text-blue-600">{a.code}</span>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm text-gray-900 truncate">{a.name}</span>
                  <span className="block text-xs text-gray-500">{a.city}</span>
                </div>
                {a.code === value && (
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PassengerStepper({
  label,
  subtitle,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  subtitle: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        <span className="block text-xs text-gray-500">{subtitle}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="w-5 text-center text-sm font-semibold">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-blue-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function FlightSearchSection() {
  // Section collapse
  const [collapsed, setCollapsed] = useState(false);

  // Airport state
  const [departureAirport, setDepartureAirport] = useState('JFK');
  const [arrivalAirport, setArrivalAirport] = useState('FCO');
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  // Travelers
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [travelersOpen, setTravelersOpen] = useState(false);
  const travelersRef = useRef<HTMLDivElement>(null);

  // Cabin class
  const [cabinClass, setCabinClass] = useState('Economy');
  const [classOpen, setClassOpen] = useState(false);
  const classRef = useRef<HTMLDivElement>(null);

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [stops, setStops] = useState<'any' | 'nonstop'>('any');
  const [maxLayover, setMaxLayover] = useState(8);
  const [maxPrice, setMaxPrice] = useState(2000);
  const [departureSlots, setDepartureSlots] = useState<string[]>([]);
  const [arrivalSlots, setArrivalSlots] = useState<string[]>([]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);

  // Close popovers on outside clicks
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (travelersOpen && travelersRef.current && !travelersRef.current.contains(e.target as Node)) {
        setTravelersOpen(false);
      }
      if (classOpen && classRef.current && !classRef.current.contains(e.target as Node)) {
        setClassOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [travelersOpen, classOpen]);

  // Helpers
  const totalTravelers = adults + children + infants;

  const swapAirports = () => {
    setDepartureAirport(arrivalAirport);
    setArrivalAirport(departureAirport);
  };

  const toggleSlot = (slot: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(slot) ? list.filter((s) => s !== slot) : [...list, slot]);
  };

  const toggleAirline = (airline: string) => {
    setSelectedAirlines((prev) =>
      prev.includes(airline) ? prev.filter((a) => a !== airline) : [...prev, airline]
    );
  };

  const filterCount =
    (stops === 'nonstop' ? 1 : 0) +
    (maxLayover !== 8 ? 1 : 0) +
    (maxPrice !== 2000 ? 1 : 0) +
    departureSlots.length +
    arrivalSlots.length +
    selectedAirlines.length;

  const resetFilters = () => {
    setStops('any');
    setMaxLayover(8);
    setMaxPrice(2000);
    setDepartureSlots([]);
    setArrivalSlots([]);
    setSelectedAirlines([]);
  };

  const summaryText = `${departureAirport} → ${arrivalAirport} · ${totalTravelers} traveler${totalTravelers !== 1 ? 's' : ''} · ${cabinClass}`;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm mb-4">
      {/* ── Collapsible Header ──────────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Plane size={18} className="text-blue-600" />
          </div>
          <div className="text-left">
            <span className="block text-sm font-semibold text-gray-900">Search Flights</span>
            <span className="block text-xs text-gray-500">{summaryText}</span>
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
          {/* Search strip */}
          <div className="flex flex-wrap items-end gap-2 pt-4">
            {/* From */}
            <AirportDropdown
              value={departureAirport}
              onChange={setDepartureAirport}
              label="From"
              isOpen={fromOpen}
              onToggle={() => {
                setFromOpen(!fromOpen);
                setToOpen(false);
              }}
            />

            {/* Swap button */}
            <button
              onClick={swapAirports}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-blue-300 hover:bg-blue-50 transition-colors self-center mb-1"
              title="Swap airports"
            >
              <ArrowLeftRight size={14} className="text-gray-500" />
            </button>

            {/* To */}
            <AirportDropdown
              value={arrivalAirport}
              onChange={setArrivalAirport}
              label="To"
              isOpen={toOpen}
              onToggle={() => {
                setToOpen(!toOpen);
                setFromOpen(false);
              }}
            />

            {/* Travelers */}
            <div className="relative" ref={travelersRef}>
              <button
                onClick={() => {
                  setTravelersOpen(!travelersOpen);
                  setClassOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:border-blue-300 transition-colors min-w-[120px]"
              >
                <div className="flex-1">
                  <span className="block text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                    Travelers
                  </span>
                  <span className="block text-sm font-semibold text-gray-900">
                    {totalTravelers} traveler{totalTravelers !== 1 ? 's' : ''}
                  </span>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {travelersOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-xl p-4">
                  <PassengerStepper
                    label="Adults"
                    subtitle="12+ years"
                    value={adults}
                    min={1}
                    max={9}
                    onChange={setAdults}
                  />
                  <div className="border-t border-gray-100" />
                  <PassengerStepper
                    label="Children"
                    subtitle="2–11 years"
                    value={children}
                    min={0}
                    max={6}
                    onChange={setChildren}
                  />
                  <div className="border-t border-gray-100" />
                  <PassengerStepper
                    label="Infants"
                    subtitle="Under 2"
                    value={infants}
                    min={0}
                    max={2}
                    onChange={setInfants}
                  />
                  <button
                    onClick={() => setTravelersOpen(false)}
                    className="mt-3 w-full rounded-lg bg-blue-600 text-white text-sm font-medium py-2 hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Cabin class */}
            <div className="relative" ref={classRef}>
              <button
                onClick={() => {
                  setClassOpen(!classOpen);
                  setTravelersOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 hover:border-blue-300 transition-colors min-w-[130px]"
              >
                <div className="flex-1">
                  <span className="block text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                    Class
                  </span>
                  <span className="block text-sm font-semibold text-gray-900">{cabinClass}</span>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {classOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 w-52 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                  {CABIN_CLASSES.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => {
                        setCabinClass(cls);
                        setClassOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors ${
                        cls === cabinClass ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search button */}
            <button className="flex items-center gap-2 rounded-xl bg-blue-600 text-white px-5 py-3 text-sm font-semibold hover:bg-blue-700 transition-colors self-end">
              <Search size={16} />
              Search
            </button>
          </div>

          {/* Filters toggle */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                showFilters
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {filterCount > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                  {filterCount}
                </span>
              )}
            </button>
            {filterCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RotateCcw size={12} />
                Reset all
              </button>
            )}
          </div>

          {/* Advanced filters panel */}
          {showFilters && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-5">
              {/* Stops */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Stops
                </h4>
                <div className="flex gap-2">
                  {(['nonstop', 'any'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setStops(opt)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        stops === opt
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {opt === 'nonstop' ? 'Nonstop only' : 'Any number'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max layover + max price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Max Layover
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={24}
                      value={maxLayover}
                      onChange={(e) => setMaxLayover(Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700 w-12 text-right">
                      {maxLayover}h
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Max Price
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={200}
                      max={5000}
                      step={50}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700 w-16 text-right">
                      ${maxPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Time slots */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Departure Time
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {DEPARTURE_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => toggleSlot(slot, departureSlots, setDepartureSlots)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          departureSlots.includes(slot)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Arrival Time
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {ARRIVAL_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => toggleSlot(slot, arrivalSlots, setArrivalSlots)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          arrivalSlots.includes(slot)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Airline preferences */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Airline Preference
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {AIRLINES.map((airline) => (
                    <button
                      key={airline}
                      onClick={() => toggleAirline(airline)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        selectedAirlines.includes(airline)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {airline}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
