'use client';

import { use, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plane,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  Settings,
  TrendingUp,
  FileText,
  Clock,
  Wifi,
  Utensils,
  Luggage,
  Briefcase,
  Shield,
  Star,
  Leaf,
  Check,
  X,
  Zap,
  Monitor,
  Info,
  Plus,
} from 'lucide-react';
import { useItineraryScreen, useFlights } from '@travyl/shared';

/* ================================================================
   MOCK DATA — Paris trip: JFK <-> CDG
   ================================================================ */

const POPULAR_AIRPORTS = [
  { code: 'JFK', name: 'John F. Kennedy Intl', city: 'New York' },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris' },
  { code: 'EWR', name: 'Newark Liberty Intl', city: 'Newark' },
  { code: 'LGA', name: 'LaGuardia', city: 'New York' },
  { code: 'ORY', name: 'Paris Orly', city: 'Paris' },
];

const BOOKED_FLIGHTS = [
  {
    id: 'outbound-1',
    type: 'outbound' as const,
    flightNumber: 'AA 100',
    airline: 'American Airlines',
    airlineLogo: 'AA',
    aircraft: 'Boeing 777-300ER',
    date: 'Mar 10, 2026',
    departure: { time: '7:30 PM', code: 'JFK', terminal: 'T8', gate: 'B44' },
    arrival: { time: '9:15 AM', code: 'CDG', terminal: 'T2A', gate: 'K26', nextDay: true },
    duration: '7h 45m',
    stops: 'Direct',
    cabinClass: 'Economy',
    seats: '24A, 24B',
    baggage: '1 carry-on + 1 checked (23 kg)',
    meal: 'Dinner + breakfast',
    wifi: 'Available (complimentary)',
    confirmation: 'XHGT7K',
    price: { base: 412, taxes: 86, total: 498 },
    status: 'Confirmed',
  },
  {
    id: 'return-1',
    type: 'return' as const,
    flightNumber: 'AA 101',
    airline: 'American Airlines',
    airlineLogo: 'AA',
    aircraft: 'Boeing 777-300ER',
    date: 'Mar 16, 2026',
    departure: { time: '11:00 AM', code: 'CDG', terminal: 'T2A', gate: 'K12' },
    arrival: { time: '2:30 PM', code: 'JFK', terminal: 'T8', gate: 'B38', nextDay: false },
    duration: '8h 30m',
    stops: 'Direct',
    cabinClass: 'Economy',
    seats: '26A, 26B',
    baggage: '1 carry-on + 1 checked (23 kg)',
    meal: 'Lunch + snack',
    wifi: 'Available (complimentary)',
    confirmation: 'XHGT7K',
    price: { base: 428, taxes: 91, total: 519 },
    status: 'Confirmed',
  },
];

const COMPARISON_FLIGHTS = [
  {
    id: 'dl-310',
    airline: 'Delta Air Lines',
    airlineLogo: 'DL',
    flightNumber: 'DL 310',
    departure: { time: '6:15 PM', airport: 'JFK' },
    arrival: { time: '8:45 AM', airport: 'CDG', nextDay: true },
    duration: '8h 30m',
    stops: 1,
    layover: 'ATL (1h 40m)',
    price: 520,
    fareClass: 'Main Cabin',
    amenities: { wifi: true, power: true, meals: true, entertainment: true },
    onTime: 84,
    co2: 312,
    badge: null as string | null,
  },
  {
    id: 'ua-57',
    airline: 'United Airlines',
    airlineLogo: 'UA',
    flightNumber: 'UA 57',
    departure: { time: '9:00 PM', airport: 'EWR' },
    arrival: { time: '10:30 AM', airport: 'CDG', nextDay: true },
    duration: '7h 30m',
    stops: 0,
    layover: null,
    price: 485,
    fareClass: 'Economy',
    amenities: { wifi: true, power: true, meals: true, entertainment: true },
    onTime: 81,
    co2: 278,
    badge: 'Lowest Price',
  },
  {
    id: 'lh-401',
    airline: 'Lufthansa',
    airlineLogo: 'LH',
    flightNumber: 'LH 401',
    departure: { time: '5:30 PM', airport: 'JFK' },
    arrival: { time: '7:15 AM', airport: 'CDG', nextDay: true },
    duration: '7h 45m',
    stops: 0,
    layover: null,
    price: 610,
    fareClass: 'Economy',
    amenities: { wifi: true, power: true, meals: true, entertainment: true },
    onTime: 88,
    co2: 265,
    badge: 'Best Overall',
    businessAvailable: true,
  },
];

const BOOKING_DETAILS = {
  confirmationNumber: 'XHGT7K',
  pnr: 'XHGT7K',
  ticketNumbers: ['001-2345678901', '001-2345678902'],
  fareClass: 'Y',
  fareType: 'Economy Flex',
  baggageAllowance: { carryOn: '1 bag (10 kg)', checked: '1 bag (23 kg)', fees: 0 },
  cancellationPolicy: 'Free cancellation within 24 hours of booking. After that, a $200 fee per passenger applies.',
  changePolicy: 'Changes permitted for a $75 fee plus any fare difference. Same-day standby is complimentary for AAdvantage members.',
  refundPolicy: 'Refundable as travel credit within 12 months. Cash refund available for Flex fares.',
  checkInUrl: 'https://www.aa.com/checkin',
  checkInOpens: 'Mar 9, 2026 — 24 hours before departure',
};

/* ================================================================
   ANIMATION VARIANTS
   ================================================================ */

const collapseVariants = {
  hidden: { height: 0, opacity: 0, overflow: 'hidden' },
  visible: { height: 'auto', opacity: 1, overflow: 'hidden', transition: { duration: 0.3 } },
  exit: { height: 0, opacity: 0, overflow: 'hidden', transition: { duration: 0.2 } },
} satisfies Record<string, object>;

/* ================================================================
   FLIGHT SEARCH SECTION
   ================================================================ */

function FlightSearchSection() {
  const [collapsed, setCollapsed] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [from, setFrom] = useState('JFK');
  const [to, setTo] = useState('CDG');
  const [travelers, setTravelers] = useState(2);
  const [cabinClass, setCabinClass] = useState('economy');
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [maxLayover, setMaxLayover] = useState(12);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [depTimes, setDepTimes] = useState<string[]>([]);
  const [arrTimes, setArrTimes] = useState<string[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);

  const cabinLabel: Record<string, string> = { economy: 'Economy', premium: 'Premium', business: 'Business', first: 'First' };

  const swap = () => { setFrom(to); setTo(from); };

  const toggleInArray = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const activeFilterCount = [nonstopOnly, depTimes.length > 0, arrTimes.length > 0, maxPrice < 3000, airlines.length > 0].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
      {/* Header */}
      <button onClick={() => setCollapsed(!collapsed)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#2563eb] flex items-center justify-center">
            <Plane size={14} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800">Search Flights</p>
            <p className="text-[11px] text-gray-400">{from} → {to} · {travelers} traveler{travelers !== 1 ? 's' : ''} · {cabinLabel[cabinClass]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
              className={`text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all ${showFilters ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
            >
              <Settings size={10} />
              Filters
              {activeFilterCount > 0 && !showFilters && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-[#2563eb] text-white text-[9px] flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
          )}
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </div>
      </button>

      {/* Expandable body */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants}>
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              {/* Search strip */}
              <div className="flex flex-col sm:flex-row items-stretch border border-gray-200 rounded-xl overflow-visible bg-white divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                {/* From */}
                <div className="flex-1 min-w-0 px-4 py-2.5 hover:bg-blue-50/30 transition-colors">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400">From</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-[#2563eb]">{from}</span>
                    <span className="text-[10px] text-gray-400 truncate">{POPULAR_AIRPORTS.find(a => a.code === from)?.city}</span>
                  </div>
                </div>

                {/* Swap */}
                <div className="hidden sm:flex items-center -mx-3 z-10">
                  <button onClick={swap} className="w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow hover:border-[#2563eb]/30 transition-all flex items-center justify-center">
                    <ArrowLeftRight size={10} className="text-gray-400" />
                  </button>
                </div>

                {/* To */}
                <div className="flex-1 min-w-0 px-4 py-2.5 hover:bg-blue-50/30 transition-colors">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400">To</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold text-[#2563eb]">{to}</span>
                    <span className="text-[10px] text-gray-400 truncate">{POPULAR_AIRPORTS.find(a => a.code === to)?.city}</span>
                  </div>
                </div>

                {/* Travelers */}
                <div className="shrink-0 px-4 py-2.5 hover:bg-blue-50/30 transition-colors">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400">Travelers</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[#2563eb]">{travelers}</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setTravelers(Math.max(1, travelers - 1))} className="w-5 h-5 rounded-full border border-gray-200 text-[10px] text-gray-500 hover:bg-gray-100 flex items-center justify-center">-</button>
                      <button onClick={() => setTravelers(travelers + 1)} className="w-5 h-5 rounded-full border border-gray-200 text-[10px] text-gray-500 hover:bg-gray-100 flex items-center justify-center">+</button>
                    </div>
                  </div>
                </div>

                {/* Class */}
                <div className="shrink-0 px-4 py-2.5 hover:bg-blue-50/30 transition-colors">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400">Class</p>
                  <select value={cabinClass} onChange={e => setCabinClass(e.target.value)} className="text-sm font-semibold text-[#2563eb] bg-transparent border-none p-0 focus:outline-none cursor-pointer -ml-1">
                    <option value="economy">Economy</option>
                    <option value="premium">Premium Econ</option>
                    <option value="business">Business</option>
                    <option value="first">First Class</option>
                  </select>
                </div>

                {/* Search button */}
                <button className="px-5 py-2.5 text-xs text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors shrink-0 flex items-center gap-1.5 justify-center sm:rounded-r-xl font-medium">
                  <Search size={13} />
                  Search
                </button>
              </div>

              {/* Advanced filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants} className="mt-2.5 bg-gray-50/60 rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-3 sm:p-4 space-y-4">
                      {/* Stops & max layover & max price */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Stops</p>
                          <div className="flex gap-1.5">
                            {[{ label: 'Nonstop', val: true }, { label: 'Any', val: false }].map(opt => (
                              <button key={String(opt.val)} onClick={() => setNonstopOnly(opt.val)}
                                className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg border transition-all ${nonstopOnly === opt.val ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                              >{opt.label}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Max layover</p>
                          <div className="relative">
                            <input type="number" min={1} max={24} value={nonstopOnly ? 0 : maxLayover} disabled={nonstopOnly}
                              onChange={e => setMaxLayover(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
                              className={`w-full text-xs border rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20 ${nonstopOnly ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 text-gray-800'}`} />
                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${nonstopOnly ? 'text-gray-300' : 'text-gray-400'}`}>hours</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Max price</p>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">$</span>
                            <input type="number" min={0} max={10000} step={50} value={maxPrice}
                              onChange={e => setMaxPrice(Math.max(0, Number(e.target.value) || 0))}
                              className="w-full text-xs bg-white border border-gray-200 rounded-lg pl-6 pr-3 py-1.5 focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20 text-gray-800" />
                          </div>
                        </div>
                      </div>

                      {/* Departure & arrival time slots */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[{ label: 'Departure time', state: depTimes, setter: setDepTimes }, { label: 'Arrival time', state: arrTimes, setter: setArrTimes }].map(group => (
                          <div key={group.label}>
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">{group.label}</p>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[{ label: 'Early', sub: '12a-6a', value: 'night' }, { label: 'Morning', sub: '6a-12p', value: 'morning' }, { label: 'Afternoon', sub: '12p-6p', value: 'afternoon' }, { label: 'Evening', sub: '6p-12a', value: 'evening' }].map(t => {
                                const active = group.state.includes(t.value);
                                return (
                                  <button key={t.value} onClick={() => toggleInArray(group.state, t.value, group.setter)}
                                    className={`py-2 rounded-lg text-center border transition-all ${active ? 'border-[#2563eb] bg-[#2563eb]/5 text-[#2563eb]' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
                                    <div className="text-[11px] font-medium">{t.label}</div>
                                    <div className="text-[9px] opacity-60">{t.sub}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Airline chips */}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Airlines</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[{ code: 'AA', name: 'American', color: '#0078D2' }, { code: 'DL', name: 'Delta', color: '#003366' }, { code: 'UA', name: 'United', color: '#002244' }, { code: 'LH', name: 'Lufthansa', color: '#05164D' }, { code: 'AF', name: 'Air France', color: '#002157' }, { code: 'BA', name: 'British Airways', color: '#075AAA' }].map(a => {
                            const active = airlines.includes(a.name);
                            return (
                              <button key={a.code} onClick={() => toggleInArray(airlines, a.name, setAirlines)}
                                className={`text-[11px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${active ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : ''}`} style={!active ? { backgroundColor: a.color } : {}} />
                                {a.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button onClick={() => { setNonstopOnly(false); setMaxLayover(12); setMaxPrice(3000); setDepTimes([]); setArrTimes([]); setAirlines([]); }}
                        className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2">Reset all filters</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   BOOKED FLIGHT CARD
   ================================================================ */

function BookedFlightCard({ flight }: { flight: typeof BOOKED_FLIGHTS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const isOutbound = flight.type === 'outbound';
  const gradient = isOutbound
    ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
    : 'linear-gradient(135deg, #1e3a5f, #2d4a6f)';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3 text-white" style={{ background: gradient }}>
        <div className="flex items-center gap-2">
          <Plane size={14} className={isOutbound ? '' : 'rotate-180'} />
          <span className="text-sm font-semibold">{flight.flightNumber}</span>
          <span className="text-xs text-white/70">{flight.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-emerald-500 px-2 py-0.5 rounded-full font-medium">{flight.status}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Route display */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{flight.departure.time}</p>
            <p className="text-xs text-gray-500 font-medium">{flight.departure.code}</p>
            <p className="text-[10px] text-gray-400">T{flight.departure.terminal} · Gate {flight.departure.gate}</p>
          </div>
          <div className="flex-1 flex flex-col items-center px-4">
            <p className="text-[11px] text-gray-400 mb-1">{flight.duration}</p>
            <div className="flex items-center w-full">
              <div className="flex-1 border-t border-dashed border-gray-300" />
              <div className="w-7 h-7 rounded-full flex items-center justify-center mx-1.5" style={{ backgroundColor: '#2563eb' }}>
                <Plane size={12} className="text-white" />
              </div>
              <div className="flex-1 border-t border-dashed border-gray-300" />
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">{flight.stops}</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">
              {flight.arrival.time}
              {flight.arrival.nextDay && <sup className="text-[10px] text-amber-500 ml-0.5">+1</sup>}
            </p>
            <p className="text-xs text-gray-500 font-medium">{flight.arrival.code}</p>
            <p className="text-[10px] text-gray-400">T{flight.arrival.terminal} · Gate {flight.arrival.gate}</p>
          </div>
        </div>

        {/* Airline + status bar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center shadow-sm">
            <span className="text-white text-[10px] font-bold">{flight.airlineLogo}</span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-800">{flight.airline}</p>
            <p className="text-[10px] text-gray-400">{flight.cabinClass}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-bold text-[#2563eb]">${flight.price.total}</p>
            <p className="text-[10px] text-gray-400">per person</p>
          </div>
        </div>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants}>
            <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white px-4 pb-4 pt-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Aircraft', value: flight.aircraft },
                  { label: 'Class', value: flight.cabinClass },
                  { label: 'Seats', value: flight.seats },
                  { label: 'Baggage', value: flight.baggage },
                  { label: 'Meal', value: flight.meal },
                  { label: 'Wi-Fi', value: flight.wifi },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-lg p-2.5 border border-gray-100 shadow-sm">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="text-[11px] text-gray-700 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              {/* Price breakdown */}
              <div className="mt-2 bg-white rounded-lg p-2.5 border border-gray-100 shadow-sm">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1.5">Price Breakdown</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]"><span className="text-gray-500">Base fare</span><span className="text-gray-700">${flight.price.base}</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-gray-500">Taxes & fees</span><span className="text-gray-700">${flight.price.taxes}</span></div>
                  <div className="flex justify-between text-[11px] font-semibold border-t border-gray-100 pt-1 mt-1"><span className="text-gray-800">Total</span><span className="text-[#2563eb]">${flight.price.total}</span></div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="text-gray-500">Confirmation:</span>
                <span className="font-mono font-bold text-[#2563eb]">{flight.confirmation}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================================================================
   COMPARISON ALTERNATIVES
   ================================================================ */

function ComparisonAlternatives() {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<'price' | 'duration' | 'value'>('value');
  const [altAirports, setAltAirports] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...COMPARISON_FLIGHTS].sort((a, b) => {
    if (sort === 'price') return a.price - b.price;
    if (sort === 'duration') {
      const toMin = (d: string) => { const p = d.match(/(\d+)h\s*(\d+)m/); return p ? Number(p[1]) * 60 + Number(p[2]) : 0; };
      return toMin(a.duration) - toMin(b.duration);
    }
    return (a.price / a.onTime) - (b.price / b.onTime);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-600" />
          <span className="text-sm font-medium text-gray-900">Compare Alternatives</span>
          <span className="text-[10px] text-gray-400">{COMPARISON_FLIGHTS.length} options</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants}>
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
              {/* Sort + alt airports */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {(['price', 'duration', 'value'] as const).map(s => (
                    <button key={s} onClick={() => setSort(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${sort === s ? 'bg-[#2563eb] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s === 'price' ? 'Price' : s === 'duration' ? 'Fastest' : 'Best Value'}
                    </button>
                  ))}
                </div>
                <button onClick={() => setAltAirports(!altAirports)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-all ${altAirports ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  Alt Airports
                </button>
              </div>

              {/* Alt airports chips */}
              <AnimatePresence>
                {altAirports && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="grid grid-cols-3 gap-2">
                      {[{ code: 'EWR', savings: 50 }, { code: 'LGA', savings: 35 }, { code: 'ORY', savings: 75 }].map(ap => (
                        <button key={ap.code} className="text-left p-2 border border-gray-200 rounded-lg hover:border-[#2563eb] hover:bg-blue-50/50 transition-colors">
                          <p className="text-xs font-semibold text-gray-900">{ap.code}</p>
                          <p className="text-xs text-emerald-600 font-medium">-${ap.savings}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Price range info */}
              <div className="flex items-center gap-2 px-1">
                <Info size={11} className="text-gray-400 shrink-0" />
                <p className="text-[10px] text-gray-500">
                  Prices from <span className="font-semibold text-gray-700">${Math.min(...COMPARISON_FLIGHTS.map(f => f.price))}</span> to{' '}
                  <span className="font-semibold text-gray-700">${Math.max(...COMPARISON_FLIGHTS.map(f => f.price))}</span> per person incl. taxes
                </p>
              </div>

              {/* Flight option cards */}
              <div className="space-y-2">
                {sorted.map(flight => (
                  <div key={flight.id} className={`rounded-xl overflow-hidden transition-all ${expandedId === flight.id ? 'shadow-md ring-1 ring-[#2563eb]/20' : 'shadow-sm ring-1 ring-gray-200 hover:ring-gray-300 hover:shadow'}`}>
                    {/* Badge */}
                    {flight.badge && (
                      <div className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] px-3 py-0.5">
                        <span className="text-[9px] text-white/90 font-medium tracking-wide uppercase">{flight.badge}</span>
                      </div>
                    )}

                    {/* Summary row */}
                    <button onClick={() => setExpandedId(expandedId === flight.id ? null : flight.id)} className="w-full text-left bg-white p-3 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-white text-[11px] font-bold">{flight.airlineLogo}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 min-w-0 shrink-0">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{flight.departure.time}</p>
                            <p className="text-[11px] text-gray-400">{flight.departure.airport}</p>
                          </div>
                          <span className="text-gray-300 text-sm px-0.5">→</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {flight.arrival.time}
                              {flight.arrival.nextDay && <sup className="text-[9px] text-amber-500 ml-0.5">+1</sup>}
                            </p>
                            <p className="text-[11px] text-gray-400">{flight.arrival.airport}</p>
                          </div>
                        </div>
                        <div className="flex-1" />
                        <div className="shrink-0 text-right mr-1">
                          <p className="text-[13px] text-gray-700">{flight.duration}</p>
                          {flight.stops === 0
                            ? <p className="text-[11px] text-emerald-600 font-medium">Direct</p>
                            : <p className="text-[11px] text-amber-600 font-medium">{flight.stops} stop</p>}
                        </div>
                        <div className="h-8 w-px bg-gray-200 shrink-0" />
                        <div className="text-right shrink-0 min-w-[56px]">
                          <p className="text-[15px] font-bold text-[#2563eb]">${flight.price}</p>
                          <p className="text-[11px] text-gray-400">{flight.fareClass}</p>
                        </div>
                        <ChevronDown size={16} className={`text-gray-300 shrink-0 transition-transform ${expandedId === flight.id ? 'rotate-180' : ''}`} />
                      </div>
                      {/* Amenity row */}
                      <div className="flex items-center gap-2 mt-2 ml-[52px]">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md">
                          <Wifi size={11} className={flight.amenities.wifi ? 'text-gray-600' : 'text-gray-300'} />
                          <Zap size={11} className={flight.amenities.power ? 'text-gray-600' : 'text-gray-300'} />
                          <Utensils size={11} className={flight.amenities.meals ? 'text-gray-600' : 'text-gray-300'} />
                          <Monitor size={11} className={flight.amenities.entertainment ? 'text-gray-600' : 'text-gray-300'} />
                        </div>
                        <span className="text-[11px] text-gray-400">{flight.airline}</span>
                        {'businessAvailable' in flight && flight.businessAvailable && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">Business avail.</span>
                        )}
                      </div>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {expandedId === flight.id && (
                        <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants}>
                          <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white px-3 pb-3 pt-2">
                            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mb-2 text-[10px] text-gray-400">
                              <span className="text-gray-600 font-medium">{flight.airline}</span>
                              <span>·</span><span>{flight.flightNumber}</span>
                              {flight.layover && (<><span>·</span><span className="text-amber-600">Stop: {flight.layover}</span></>)}
                            </div>
                            {/* Stats bar */}
                            <div className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-gray-100 shadow-sm mb-2">
                              <div className="flex items-center gap-1 text-[10px]">
                                <div className={`w-1.5 h-1.5 rounded-full ${flight.onTime >= 85 ? 'bg-green-500' : flight.onTime >= 78 ? 'bg-amber-400' : 'bg-red-400'}`} />
                                <span className="text-gray-600">{flight.onTime}% on-time</span>
                              </div>
                              <div className="h-3 w-px bg-gray-200" />
                              <div className="flex items-center gap-0.5 text-[10px]">
                                <Leaf size={10} className={flight.co2 <= 280 ? 'text-green-600' : 'text-gray-400'} />
                                <span className="text-gray-600">{flight.co2}kg CO2</span>
                              </div>
                            </div>
                            <button className="w-full py-2 bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white text-xs font-medium rounded-lg hover:from-[#1d4ed8] hover:to-[#2563eb] transition-all shadow-sm">
                              Select This Flight
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   BOOKING DETAILS SECTION
   ================================================================ */

function BookingDetailsSection() {
  const [open, setOpen] = useState(false);
  const d = BOOKING_DETAILS;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${open ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}>
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#2563eb]" />
          <span className="text-sm font-medium text-gray-900">Booking Details</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants}>
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2.5">
              {/* Booking reference */}
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-gray-800 mb-2">Booking Reference</p>
                <div className="space-y-1.5">
                  {[{ label: 'Confirmation Number', value: d.confirmationNumber, bold: true }, { label: 'PNR Code', value: d.pnr, mono: true }, { label: 'Fare Class', value: `${d.fareClass} - ${d.fareType}` }].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{row.label}</span>
                      <span className={`text-xs ${row.bold ? 'font-bold text-[#2563eb]' : row.mono ? 'font-medium font-mono text-gray-800' : 'font-medium text-gray-800'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Baggage */}
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-gray-800 mb-2">Baggage Allowance</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Carry-on</span><span className="text-xs text-gray-800">{d.baggageAllowance.carryOn}</span></div>
                  <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Checked</span><span className="text-xs text-gray-800">{d.baggageAllowance.checked}</span></div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-gray-200">
                    <span className="text-xs text-gray-500">Baggage Fees</span>
                    <span className="text-xs font-semibold text-emerald-600">{d.baggageAllowance.fees === 0 ? 'Included' : `$${d.baggageAllowance.fees}/person`}</span>
                  </div>
                </div>
              </div>

              {/* Ticket numbers */}
              <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-gray-800 mb-2">Ticket Numbers</p>
                <div className="space-y-1">
                  {d.ticketNumbers.map((t, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Passenger {i + 1}</span>
                      <span className="text-xs font-mono text-gray-800">{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policies */}
              {[{ title: 'Cancellation Policy', text: d.cancellationPolicy }, { title: 'Change Policy', text: d.changePolicy }, { title: 'Refund Policy', text: d.refundPolicy }].map(p => (
                <div key={p.title} className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs font-semibold text-gray-800 mb-1">{p.title}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{p.text}</p>
                </div>
              ))}

              {/* Check-in CTA */}
              <div className="rounded-lg px-3 py-3" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                <p className="text-xs font-semibold text-white mb-1.5">Check-in Information</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/70">Check-in Opens</span>
                  <span className="text-xs font-medium text-white">{d.checkInOpens}</span>
                </div>
                <a href={d.checkInUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-white text-[#2563eb] rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                  Check-in Online →
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */

export default function Flights({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { flights: flightVMs, isLoading } = useItineraryScreen(id);

  const outbound = BOOKED_FLIGHTS.filter(f => f.type === 'outbound');
  const returnFlights = BOOKED_FLIGHTS.filter(f => f.type === 'return');

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1].map(i => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="h-11 rounded-t-2xl" style={{ background: i === 0 ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }} />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-12 w-16 rounded bg-gray-200" />
                <div className="flex-1 mx-4 h-px bg-gray-200" />
                <div className="h-12 w-16 rounded bg-gray-200" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded-full bg-gray-200" />
                <div className="h-6 w-24 rounded-full bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Flight Search Section */}
      <FlightSearchSection />

      {/* 2. Booked Flight Cards — 2-column on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {outbound.map(f => <BookedFlightCard key={f.id} flight={f} />)}
        {returnFlights.map(f => <BookedFlightCard key={f.id} flight={f} />)}
      </div>

      {/* Add flight button */}
      <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#2563eb]/40 hover:text-[#2563eb] transition-colors">
        <Plus size={16} />
        <span className="text-[13px] font-medium">Add Flight</span>
      </button>

      {/* 3. Comparison Alternatives */}
      <ComparisonAlternatives />

      {/* 4. Booking Details */}
      <BookingDetailsSection />
    </div>
  );
}
