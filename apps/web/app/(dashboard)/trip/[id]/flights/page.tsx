'use client';

import { use, useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
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
  Plane,
} from 'lucide-react';
import { PaperPlane } from '@/components/ui';
import { useItineraryScreen, useFlights, supabase } from '@travyl/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/* ================================================================
   TYPES & HELPERS
   ================================================================ */

const POPULAR_AIRPORTS: { code: string; name: string; city: string }[] = [];

type BookedFlight = {
  id: string; type: 'outbound' | 'return'; flightNumber: string; airline: string;
  airlineLogo: string; aircraft: string; date: string;
  departure: { time: string; code: string; terminal: string; gate: string };
  arrival: { time: string; code: string; terminal: string; gate: string; nextDay: boolean };
  duration: string; stops: string; cabinClass: string; seats: string;
  baggage: string; meal: string; wifi: string; confirmation: string;
  price: { base: number; taxes: number; total: number }; status: string;
};

/** Convert DB flight records into the shape BookedFlightCard expects */
function dbFlightsToBooked(flights: any[], destination?: string): BookedFlight[] {
  return flights.map((f: any, i: number) => {
    const d = f.data ?? {};
    const dep = d.departure_at ? new Date(d.departure_at) : null;
    const arr = d.arrival_at ? new Date(d.arrival_at) : null;
    const depTime = dep ? dep.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
    const arrTime = arr ? arr.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
    const dateStr = dep ? dep.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const nextDay = dep && arr ? arr.getDate() !== dep.getDate() : false;

    let durationStr = '';
    if (dep && arr) {
      const ms = arr.getTime() - dep.getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.round((ms % 3600000) / 60000);
      durationStr = `${h}h ${m}m`;
    }

    const originCode = d.origin_iata || '';
    const destCode = d.dest_iata || '';
    const airlineCode = (d.airline || '??').slice(0, 2).toUpperCase();
    const price = d.price ? Math.round(d.price) : 0;

    return {
      id: f.id,
      type: i === 0 ? 'outbound' as const : 'return' as const,
      flightNumber: d.flight_number || `${airlineCode}${100 + i}`,
      airline: d.airline || 'Airline',
      airlineLogo: airlineCode,
      aircraft: d.aircraft || '',
      date: dateStr,
      departure: { time: depTime, code: originCode, terminal: '', gate: '' },
      arrival: { time: arrTime, code: destCode, terminal: '', gate: '', nextDay },
      duration: durationStr,
      stops: 'Direct',
      cabinClass: d.cabin_class || 'Economy',
      seats: '',
      baggage: '1 checked bag',
      meal: '',
      wifi: '',
      confirmation: d.booking_ref || '',
      price: { base: price, taxes: 0, total: price },
      status: 'Planned',
    };
  });
}

type ComparisonFlight = {
  id: string; airline: string; airlineLogo: string; flightNumber: string;
  departure: { time: string; airport: string };
  arrival: { time: string; airport: string; nextDay: boolean };
  duration: string; stops: number; layover: string | null;
  price: number; fareClass: string;
  amenities: { wifi: boolean; power: boolean; meals: boolean; entertainment: boolean };
  onTime: number; co2: number; badge: string | null; businessAvailable?: boolean;
};

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = match[1] ?? '0';
  const m = match[2] ?? '0';
  return `${h}h ${m}m`;
}


interface FlightSearchParams {
  origin: string;
  destination: string;
  date: string;
  passengers: number;
  cabinClass: string;
  originCity?: string;
  originCountry?: string;
  destCity?: string;
  destCountry?: string;
}

function useFlightSearch(tripId: string, searchParams?: FlightSearchParams) {
  const { trip } = useItineraryScreen(tripId);
  const destParts = (trip?.destination || '').split(',');
  const destination = destParts[0]?.trim();
  const destCountry = destParts.slice(1).join(',').trim() || '';

  const destAirport = searchParams?.destination || undefined;
  const originAirport = searchParams?.origin || '';
  const departDate = searchParams?.date || trip?.start_date || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const passengers = searchParams?.passengers || trip?.travelers || 1;
  const cabinClass = searchParams?.cabinClass || '';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['flights-search', originAirport, destAirport, departDate, passengers, cabinClass],
    queryFn: async (): Promise<ComparisonFlight[]> => {
      if (!originAirport || (!destAirport && !destination)) return [];
      // Backend resolves airports from city names, not IATA codes
      const originCity = searchParams?.originCity || originAirport;
      const destCity = searchParams?.destCity || destAirport || destination || '';
      const originCtry = searchParams?.originCountry || 'US';
      const destCtry = searchParams?.destCountry || destCountry || '';
      const params = new URLSearchParams({
        origin: originCity,
        destination: destCity,
        date: departDate,
        passengers: String(passengers),
      });
      if (originCtry) params.set('origin_country', originCtry);
      if (destCtry) params.set('destination_country', destCtry);
      if (cabinClass) params.set('cabin', cabinClass);

      const res = await fetch(`/api/flights/search?${params}`);
      if (!res.ok) return [];
      const json = await res.json();

      // API returns { flights: [...], priceInsights, total }
      const flights = Array.isArray(json) ? json : (json.flights ?? json.results ?? []);
      return flights.map((f: any, i: number): ComparisonFlight => {
        const legs = f.legs ?? [];
        const firstLeg = legs[0] ?? {};
        const lastLeg = legs[legs.length - 1] ?? {};
        // SerpAPI time format: "2026-05-01 10:28" — extract HH:MM
        const extractTime = (t: string) => { const m = t?.match(/(\d{1,2}:\d{2})/); return m ? m[1] : '?'; };
        const depTime = extractTime(firstLeg.departure?.time ?? '');
        const arrTime = extractTime(lastLeg.arrival?.time ?? '');
        const depDay = firstLeg.departure?.time ? new Date(firstLeg.departure.time.replace(' ', 'T')).getDate() : 0;
        const arrDay = lastLeg.arrival?.time ? new Date(lastLeg.arrival.time.replace(' ', 'T')).getDate() : 0;
        const totalMin = f.totalDuration ?? 0;
        const durationH = Math.floor(totalMin / 60);
        const durationM = totalMin % 60;
        const airline = firstLeg.airline ?? f.airline ?? 'Unknown';
        const extensions = legs.flatMap((l: any) => l.extensions ?? []);
        const hasWifi = extensions.some((e: string) => /wi-?fi/i.test(e));
        const hasPower = extensions.some((e: string) => /power|usb|outlet/i.test(e));
        const hasMeals = extensions.some((e: string) => /meal|food|dining/i.test(e));
        const hasEntertainment = extensions.some((e: string) => /stream|video|entertainment/i.test(e));
        const co2kg = f.carbonEmissions?.this_flight ? Math.round(f.carbonEmissions.this_flight / 1000) : 0;
        const layoverStr = (f.layovers ?? []).map((l: any) => {
          const h = Math.floor(l.duration / 60);
          const m = l.duration % 60;
          return `${h}h${m > 0 ? ` ${m}m` : ''} ${l.id}`;
        }).join(', ');

        return {
          id: f.id ?? firstLeg.flightNumber ?? `flight-${i}`,
          airline,
          airlineLogo: f.airlineLogo ?? firstLeg.airlineLogo ?? '',
          flightNumber: firstLeg.flightNumber ?? '',
          departure: { time: depTime, airport: firstLeg.departure?.id ?? originAirport },
          arrival: { time: arrTime, airport: lastLeg.arrival?.id ?? destAirport ?? '', nextDay: arrDay !== depDay },
          duration: `${durationH}h ${durationM}m`,
          stops: f.stops ?? 0,
          layover: layoverStr || null,
          price: Math.round(f.price ?? 0),
          fareClass: firstLeg.travelClass ?? (cabinClass || 'Economy'),
          amenities: { wifi: hasWifi, power: hasPower, meals: hasMeals, entertainment: hasEntertainment },
          onTime: 0,
          co2: co2kg,
          badge: f.tier === 'best' && i === 0 ? 'Best' : f.stops === 0 ? 'Direct' : null,
        };
      });
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!(destAirport || destination),
  });

  return { flights: data ?? [], isLoading, destAirport, destination, refetch };
}

// Booking details are shown only when real booking data is available from the flight record

/* ================================================================
   ANIMATION VARIANTS
   ================================================================ */

const collapseVariants = {
  hidden: { height: 0, opacity: 0, overflow: 'hidden' },
  visible: { height: 'auto', opacity: 1, overflow: 'hidden', transition: { duration: 0.3 } },
  exit: { height: 0, opacity: 0, overflow: 'hidden', transition: { duration: 0.2 } },
} satisfies Record<string, object>;

/* ================================================================
   AIRPORT AUTOCOMPLETE INPUT
   ================================================================ */

interface AirportInfo { iata: string; city: string; country: string }

function AirportInput({ label, value, onChange, onSelect }: { label: string; value: string; onChange: (code: string) => void; onSelect?: (info: AirportInfo) => void }) {
  const [query, setQuery] = useState(value || '');
  const [editing, setEditing] = useState(false);
  const [results, setResults] = useState<{ iata: string; name: string; city: string; country: string }[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const selectingRef = useRef(false);
  const prevValueRef = useRef(value);

  // Sync external value changes (e.g. async geolocation result) — only when not editing
  useEffect(() => {
    if (!editing && value !== prevValueRef.current) {
      setQuery(value || '');
      prevValueRef.current = value;
    }
  }, [value, editing]);

  useEffect(() => {
    if (!editing || query.length < 2) { setResults([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/airports?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(data.length > 0);
        }
      } catch {}
    }, 250);
  }, [query, editing]);

  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Reset highlight when results change
  useEffect(() => { setHighlightIdx(results.length > 0 ? 0 : -1); }, [results]);

  // Position dropdown relative to viewport (escapes overflow:hidden parents)
  useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 300) });
    }
  }, [open]);

  const selectResult = (r: { iata: string; city?: string; country?: string }) => {
    onChange(r.iata);
    setQuery(r.iata);
    setOpen(false);
    setEditing(false);
    selectingRef.current = false;
    prevValueRef.current = r.iata;
    if (onSelect && r.city) onSelect({ iata: r.iata, city: r.city, country: r.country || '' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      // Enter with no dropdown → treat typed text as IATA code directly
      if (e.key === 'Enter' && query.trim()) {
        onChange(query.trim().toUpperCase());
        setEditing(false);
        setOpen(false);
        (e.target as HTMLInputElement).blur();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = highlightIdx >= 0 ? highlightIdx : 0;
      selectResult(results[idx]);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setEditing(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 px-4 py-2.5 hover:bg-blue-50/30 dark:hover:bg-white/[0.04] transition-colors relative">
      <p className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</p>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setEditing(true); }}
        onFocus={() => { setEditing(true); setQuery(query || ''); }}
        onBlur={() => {
          if (selectingRef.current) return;
          setOpen(false);
          setEditing(false);
          if (!query.trim()) setQuery(value || '');
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search airport..."
        className="text-sm font-semibold text-[#2563eb] bg-transparent border-none p-0 w-full focus:outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
      />
      {open && results.length > 0 && dropdownPos && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.08] rounded-lg shadow-xl max-h-48 overflow-auto"
          style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}>
          {results.map((r, i) => (
            <button
              key={`${r.iata}-${i}`}
              onMouseDown={(e) => { e.preventDefault(); selectingRef.current = true; }}
              onClick={() => selectResult(r)}
              className={`w-full text-left px-3 py-2 transition-colors flex items-center gap-2 ${i === highlightIdx ? 'bg-blue-50 dark:bg-white/[0.08]' : 'hover:bg-blue-50 dark:hover:bg-white/[0.06]'}`}
            >
              <span className="text-xs font-bold text-[#2563eb] w-8">{r.iata}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{r.name}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto shrink-0">{r.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


/* ================================================================
   FLIGHT SEARCH SECTION
   ================================================================ */

function FlightSearchSection({ defaultFrom, defaultTo, defaultTravelers, onSearch, defaultOpen }: {
  defaultFrom?: string; defaultTo?: string; defaultTravelers?: number;
  onSearch?: (params: { origin: string; destination: string; passengers: number; cabinClass: string; originCity?: string; originCountry?: string; destCity?: string; destCountry?: string }) => void;
  defaultOpen?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  const [showFilters, setShowFilters] = useState(false);
  const [from, setFrom] = useState(defaultFrom || '');
  const [to, setTo] = useState(defaultTo || '');
  const [fromInfo, setFromInfo] = useState<AirportInfo | null>(null);
  const [toInfo, setToInfo] = useState<AirportInfo | null>(null);
  const [travelers, setTravelers] = useState(defaultTravelers || 2);
  const [cabinClass, setCabinClass] = useState('economy');

  // Sync when async airport lookups resolve
  useEffect(() => { if (defaultTo) setTo(defaultTo); }, [defaultTo]);
  useEffect(() => { if (defaultFrom && !from) setFrom(defaultFrom); }, [defaultFrom]);
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
    <div className="bg-white dark:bg-white/[0.03] rounded-xl shadow-sm border border-gray-200 dark:border-white/[0.08] overflow-hidden mb-4">
      {/* Header */}
      <div role="button" tabIndex={0} onClick={() => setCollapsed(!collapsed)} onKeyDown={(e) => { if (e.key === 'Enter') setCollapsed(!collapsed); }} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#2563eb] flex items-center justify-center">
            <PaperPlane size={14} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-800 dark:text-white">Search Flights</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{from} → {to} · {travelers} traveler{travelers !== 1 ? 's' : ''} · {cabinLabel[cabinClass]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
              className={`text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all ${showFilters ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/[0.1] hover:border-gray-300 dark:hover:border-white/[0.2]'}`}
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
      </div>

      {/* Expandable body */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants}>
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-white/[0.06] pt-3">
              {/* Search strip */}
              <div className="flex flex-col sm:flex-row items-stretch border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-visible bg-white dark:bg-white/[0.03] divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-white/[0.08]">
                {/* From */}
                <AirportInput label="From" value={from} onChange={setFrom} onSelect={setFromInfo} />

                {/* Swap */}
                <div className="hidden sm:flex items-center -mx-3 z-10">
                  <button onClick={swap} className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/[0.1] shadow-sm hover:shadow hover:border-[#2563eb]/30 transition-all flex items-center justify-center">
                    <ArrowLeftRight size={10} className="text-gray-400" />
                  </button>
                </div>

                {/* To */}
                <AirportInput label="To" value={to} onChange={setTo} onSelect={setToInfo} />

                {/* Travelers */}
                <div className="shrink-0 px-4 py-2.5 hover:bg-blue-50/30 dark:hover:bg-white/[0.04] transition-colors">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500">Travelers</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[#2563eb]">{travelers}</span>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setTravelers(Math.max(1, travelers - 1))} className="w-5 h-5 rounded-full border border-gray-200 dark:border-white/[0.1] text-[10px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center justify-center">-</button>
                      <button onClick={() => setTravelers(travelers + 1)} className="w-5 h-5 rounded-full border border-gray-200 dark:border-white/[0.1] text-[10px] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center justify-center">+</button>
                    </div>
                  </div>
                </div>

                {/* Class */}
                <div className="shrink-0 px-4 py-2.5 hover:bg-blue-50/30 dark:hover:bg-white/[0.04] transition-colors">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500">Class</p>
                  <select value={cabinClass} onChange={e => setCabinClass(e.target.value)} className="text-sm font-semibold text-[#2563eb] bg-transparent border-none p-0 focus:outline-none cursor-pointer -ml-1 dark:[&>option]:bg-gray-900 dark:[&>option]:text-white">
                    <option value="economy">Economy</option>
                    <option value="premium">Premium Econ</option>
                    <option value="business">Business</option>
                    <option value="first">First Class</option>
                  </select>
                </div>

                {/* Search button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onSearch?.({ origin: from, destination: to, passengers: travelers, cabinClass, originCity: fromInfo?.city, originCountry: fromInfo?.country, destCity: toInfo?.city, destCountry: toInfo?.country }); }}
                  className="px-5 py-2.5 text-xs text-white bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors shrink-0 flex items-center gap-1.5 justify-center sm:rounded-r-xl font-medium"
                >
                  <Search size={13} />
                  Search
                </button>
              </div>

              {/* Advanced filters */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants} className="mt-2.5 bg-gray-50/60 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
                    <div className="p-3 sm:p-4 space-y-4">
                      {/* Stops & max layover & max price */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Stops</p>
                          <div className="flex gap-1.5">
                            {[{ label: 'Nonstop', val: true }, { label: 'Any', val: false }].map(opt => (
                              <button key={String(opt.val)} onClick={() => setNonstopOnly(opt.val)}
                                className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg border transition-all ${nonstopOnly === opt.val ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white dark:bg-white/[0.05] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/[0.1] hover:border-gray-300 dark:hover:border-white/[0.2]'}`}
                              >{opt.label}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Max layover</p>
                          <div className="relative">
                            <input type="number" min={1} max={24} value={nonstopOnly ? 0 : maxLayover} disabled={nonstopOnly}
                              onChange={e => setMaxLayover(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
                              className={`w-full text-xs border rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20 ${nonstopOnly ? 'bg-gray-100 dark:bg-white/[0.02] border-gray-200 dark:border-white/[0.06] text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'bg-white dark:bg-white/[0.05] border-gray-200 dark:border-white/[0.1] text-gray-800 dark:text-white'}`} />
                            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] ${nonstopOnly ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>hours</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Max price</p>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 dark:text-gray-500">$</span>
                            <input type="number" min={0} max={10000} step={50} value={maxPrice}
                              onChange={e => setMaxPrice(Math.max(0, Number(e.target.value) || 0))}
                              className="w-full text-xs bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-lg pl-6 pr-3 py-1.5 focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20 text-gray-800 dark:text-white" />
                          </div>
                        </div>
                      </div>

                      {/* Departure & arrival time slots */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[{ label: 'Departure time', state: depTimes, setter: setDepTimes }, { label: 'Arrival time', state: arrTimes, setter: setArrTimes }].map(group => (
                          <div key={group.label}>
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{group.label}</p>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[{ label: 'Early', sub: '12a-6a', value: 'night' }, { label: 'Morning', sub: '6a-12p', value: 'morning' }, { label: 'Afternoon', sub: '12p-6p', value: 'afternoon' }, { label: 'Evening', sub: '6p-12a', value: 'evening' }].map(t => {
                                const active = group.state.includes(t.value);
                                return (
                                  <button key={t.value} onClick={() => toggleInArray(group.state, t.value, group.setter)}
                                    className={`py-2 rounded-lg text-center border transition-all ${active ? 'border-[#2563eb] bg-[#2563eb]/5 dark:bg-[#2563eb]/10 text-[#2563eb]' : 'border-gray-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/[0.2]'}`}>
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
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Airlines</p>
                        <div className="flex flex-wrap gap-1.5">
                          {[{ code: 'AA', name: 'American', color: '#0078D2' }, { code: 'DL', name: 'Delta', color: '#003366' }, { code: 'UA', name: 'United', color: '#002244' }, { code: 'LH', name: 'Lufthansa', color: '#05164D' }, { code: 'AF', name: 'Air France', color: '#002157' }, { code: 'BA', name: 'British Airways', color: '#075AAA' }].map(a => {
                            const active = airlines.includes(a.name);
                            return (
                              <button key={a.code} onClick={() => toggleInArray(airlines, a.name, setAirlines)}
                                className={`text-[11px] px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all ${active ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white dark:bg-white/[0.05] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/[0.1] hover:border-gray-300 dark:hover:border-white/[0.2]'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : ''}`} style={!active ? { backgroundColor: a.color } : {}} />
                                {a.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button onClick={() => { setNonstopOnly(false); setMaxLayover(12); setMaxPrice(3000); setDepTimes([]); setArrTimes([]); setAirlines([]); }}
                        className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline underline-offset-2">Reset all filters</button>
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

function BookedFlightCard({ flight }: { flight: BookedFlight }) {
  const [expanded, setExpanded] = useState(false);
  const isOutbound = flight.type === 'outbound';
  const gradient = isOutbound
    ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
    : 'linear-gradient(135deg, #1e3a5f, #2d4a6f)';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden shadow-sm">
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-4 py-3 text-white" style={{ background: gradient }}>
        <div className="flex items-center gap-2">
          <PaperPlane size={14} className={isOutbound ? '' : 'rotate-180'} />
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
            <p className="text-xl font-bold text-gray-900 dark:text-white">{flight.departure.time}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{flight.departure.code}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">T{flight.departure.terminal} · Gate {flight.departure.gate}</p>
          </div>
          <div className="flex-1 flex flex-col items-center px-4">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">{flight.duration}</p>
            <div className="flex items-center w-full">
              <div className="flex-1 border-t border-dashed border-gray-300 dark:border-white/[0.15]" />
              <div className="w-7 h-7 rounded-full flex items-center justify-center mx-1.5" style={{ backgroundColor: '#2563eb' }}>
                <PaperPlane size={12} className="text-white" />
              </div>
              <div className="flex-1 border-t border-dashed border-gray-300 dark:border-white/[0.15]" />
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">{flight.stops}</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {flight.arrival.time}
              {flight.arrival.nextDay && <sup className="text-[10px] text-amber-500 ml-0.5">+1</sup>}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{flight.arrival.code}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">T{flight.arrival.terminal} · Gate {flight.arrival.gate}</p>
          </div>
        </div>

        {/* Airline + status bar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center shadow-sm">
            <span className="text-white text-[10px] font-bold">{flight.airlineLogo}</span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-800 dark:text-white">{flight.airline}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{flight.cabinClass}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-bold text-[#2563eb]">${flight.price.total}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">per person</p>
          </div>
        </div>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants}>
            <div className="border-t border-gray-100 dark:border-white/[0.06] bg-gradient-to-b from-gray-50/80 dark:from-white/[0.02] to-white dark:to-transparent px-4 pb-4 pt-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Aircraft', value: flight.aircraft },
                  { label: 'Class', value: flight.cabinClass },
                  { label: 'Seats', value: flight.seats },
                  { label: 'Baggage', value: flight.baggage },
                  { label: 'Meal', value: flight.meal },
                  { label: 'Wi-Fi', value: flight.wifi },
                ].map(item => (
                  <div key={item.label} className="bg-white dark:bg-white/[0.03] rounded-lg p-2.5 border border-gray-100 dark:border-white/[0.06] shadow-sm">
                    <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              {/* Price breakdown */}
              <div className="mt-2 bg-white dark:bg-white/[0.03] rounded-lg p-2.5 border border-gray-100 dark:border-white/[0.06] shadow-sm">
                <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Price Breakdown</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]"><span className="text-gray-500 dark:text-gray-400">Base fare</span><span className="text-gray-700 dark:text-gray-300">${flight.price.base}</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-gray-500 dark:text-gray-400">Taxes & fees</span><span className="text-gray-700 dark:text-gray-300">${flight.price.taxes}</span></div>
                  <div className="flex justify-between text-[11px] font-semibold border-t border-gray-100 dark:border-white/[0.06] pt-1 mt-1"><span className="text-gray-800 dark:text-white">Total</span><span className="text-[#2563eb]">${flight.price.total}</span></div>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="text-gray-500 dark:text-gray-400">Confirmation:</span>
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

function ComparisonAlternatives({ comparisonFlights, onSelect, savingId }: { comparisonFlights: ComparisonFlight[]; onSelect: (f: ComparisonFlight) => void; savingId: string | null }) {
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState<'price' | 'duration' | 'value'>('value');
  const [altAirports, setAltAirports] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sorted = [...comparisonFlights].sort((a, b) => {
    if (sort === 'price') return a.price - b.price;
    if (sort === 'duration') {
      const toMin = (d: string) => { const p = d.match(/(\d+)h\s*(\d+)m/); return p ? Number(p[1]) * 60 + Number(p[2]) : 0; };
      return toMin(a.duration) - toMin(b.duration);
    }
    return a.price - b.price;
  });

  return (
    <div className="bg-white dark:bg-white/[0.03] rounded-xl shadow-sm border border-gray-200 dark:border-white/[0.08] overflow-hidden mb-4">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.04] transition-colors">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">Compare Alternatives</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{comparisonFlights.length} options</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants}>
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-white/[0.06] pt-3 space-y-3">
              {/* Sort + alt airports */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {(['price', 'duration', 'value'] as const).map(s => (
                    <button key={s} onClick={() => setSort(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${sort === s ? 'bg-[#2563eb] text-white' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]'}`}>
                      {s === 'price' ? 'Price' : s === 'duration' ? 'Fastest' : 'Best Value'}
                    </button>
                  ))}
                </div>
                <button onClick={() => setAltAirports(!altAirports)}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-all ${altAirports ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.1]'}`}>
                  Alt Airports
                </button>
              </div>

              {/* Alt airports chips */}
              <AnimatePresence>
                {altAirports && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="grid grid-cols-3 gap-2">
                      {[{ code: 'EWR', savings: 50 }, { code: 'LGA', savings: 35 }, { code: 'ORY', savings: 75 }].map(ap => (
                        <button key={ap.code} className="text-left p-2 border border-gray-200 dark:border-white/[0.08] rounded-lg hover:border-[#2563eb] hover:bg-blue-50/50 dark:hover:bg-white/[0.04] transition-colors">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{ap.code}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">-${ap.savings}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Price range info */}
              <div className="flex items-center gap-2 px-1">
                <Info size={11} className="text-gray-400 shrink-0" />
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Prices from <span className="font-semibold text-gray-700 dark:text-gray-300">${Math.min(...comparisonFlights.map(f => f.price))}</span> to{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">${Math.max(...comparisonFlights.map(f => f.price))}</span> per person incl. taxes
                </p>
              </div>

              {/* Flight option cards */}
              <div className="space-y-2">
                {sorted.map(flight => (
                  <div key={flight.id} className={`rounded-xl overflow-hidden transition-all ${expandedId === flight.id ? 'shadow-md ring-1 ring-[#2563eb]/20' : 'shadow-sm ring-1 ring-gray-200 dark:ring-white/[0.08] hover:ring-gray-300 dark:hover:ring-white/[0.15] hover:shadow'}`}>
                    {/* Badge */}
                    {flight.badge && (
                      <div className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] px-3 py-0.5">
                        <span className="text-[9px] text-white/90 font-medium tracking-wide uppercase">{flight.badge}</span>
                      </div>
                    )}

                    {/* Summary row */}
                    <button onClick={() => setExpandedId(expandedId === flight.id ? null : flight.id)} className="w-full text-left bg-white dark:bg-white/[0.03] p-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.05] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-[#2d4a6f] flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-white text-[11px] font-bold">{flight.airlineLogo}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 min-w-0 shrink-0">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{flight.departure.time}</p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">{flight.departure.airport}</p>
                          </div>
                          <span className="text-gray-300 dark:text-gray-600 text-sm px-0.5">→</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {flight.arrival.time}
                              {flight.arrival.nextDay && <sup className="text-[9px] text-amber-500 ml-0.5">+1</sup>}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">{flight.arrival.airport}</p>
                          </div>
                        </div>
                        <div className="flex-1" />
                        <div className="shrink-0 text-right mr-1">
                          <p className="text-[13px] text-gray-700 dark:text-gray-300">{flight.duration}</p>
                          {flight.stops === 0
                            ? <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Direct</p>
                            : <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">{flight.stops} stop</p>}
                        </div>
                        <div className="h-8 w-px bg-gray-200 dark:bg-white/[0.08] shrink-0" />
                        <div className="text-right shrink-0 min-w-[56px]">
                          <p className="text-[15px] font-bold text-[#2563eb]">${flight.price}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">{flight.fareClass}</p>
                        </div>
                        <ChevronDown size={16} className={`text-gray-300 dark:text-gray-600 shrink-0 transition-transform ${expandedId === flight.id ? 'rotate-180' : ''}`} />
                      </div>
                      {/* Amenity row */}
                      <div className="flex items-center gap-2 mt-2 ml-[52px]">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-white/[0.04] rounded-md">
                          <Wifi size={11} className={flight.amenities.wifi ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'} />
                          <Zap size={11} className={flight.amenities.power ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'} />
                          <Utensils size={11} className={flight.amenities.meals ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'} />
                          <Monitor size={11} className={flight.amenities.entertainment ? 'text-gray-600 dark:text-gray-400' : 'text-gray-300 dark:text-gray-600'} />
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">{flight.airline}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-gray-500">via Google Flights</span>
                        {'businessAvailable' in flight && flight.businessAvailable && (
                          <span className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/30 px-1.5 py-0.5 rounded-full">Business avail.</span>
                        )}
                      </div>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {expandedId === flight.id && (
                        <motion.div initial="hidden" animate="visible" exit="exit" variants={collapseVariants}>
                          <div className="border-t border-gray-100 dark:border-white/[0.06] bg-gradient-to-b from-gray-50/80 dark:from-white/[0.02] to-white dark:to-transparent px-3 pb-3 pt-2">
                            <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mb-2 text-[10px] text-gray-400 dark:text-gray-500">
                              <span className="text-gray-600 dark:text-gray-300 font-medium">{flight.airline}</span>
                              <span>·</span><span>{flight.flightNumber}</span>
                              {flight.layover && (<><span>·</span><span className="text-amber-600 dark:text-amber-400">Stop: {flight.layover}</span></>)}
                            </div>
                            {/* Stats bar — only show when data is available */}
                            {(flight.onTime > 0 || flight.co2 > 0) && (
                            <div className="flex items-center justify-between bg-white dark:bg-white/[0.03] rounded-lg p-2.5 border border-gray-100 dark:border-white/[0.06] shadow-sm mb-2">
                              {flight.onTime > 0 && <div className="flex items-center gap-1 text-[10px]">
                                <div className={`w-1.5 h-1.5 rounded-full ${flight.onTime >= 85 ? 'bg-green-500' : flight.onTime >= 78 ? 'bg-amber-400' : 'bg-red-400'}`} />
                                <span className="text-gray-600 dark:text-gray-400">{flight.onTime}% on-time</span>
                              </div>}
                              {flight.onTime > 0 && flight.co2 > 0 && <div className="h-3 w-px bg-gray-200 dark:bg-white/[0.08]" />}
                              {flight.co2 > 0 && <div className="flex items-center gap-0.5 text-[10px]">
                                <Leaf size={10} className={flight.co2 <= 280 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'} />
                                <span className="text-gray-600 dark:text-gray-400">{flight.co2}kg CO2</span>
                              </div>}
                            </div>
                            )}
                            <button
                              onClick={() => onSelect(flight)}
                              disabled={savingId !== null}
                              className="w-full py-2 bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white text-xs font-medium rounded-lg hover:from-[#1d4ed8] hover:to-[#2563eb] transition-all shadow-sm disabled:opacity-60"
                            >
                              {savingId === flight.id ? 'Adding…' : 'Add to Trip'}
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
   MAIN PAGE
   ================================================================ */

export default function Flights({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, isLoading } = useItineraryScreen(id);
  const { data: dbFlights = [], isLoading: loadingDbFlights } = useFlights(id);
  const [searchParams, setSearchParams] = useState<FlightSearchParams | undefined>(undefined);
  const { flights: searchedFlights, isLoading: searchingFlights } = useFlightSearch(id, searchParams);

  const destParts = (trip?.destination || '').split(',');
  const destination = destParts[0]?.trim();
  const tripDestCountry = destParts.slice(1).join(',').trim() || '';
  const [defaultTo, setDefaultTo] = useState<string | undefined>(undefined);
  const [defaultFrom, setDefaultFrom] = useState<string>('');
  const defaultTravelers = trip?.travelers || 1;

  // Dynamically look up the destination airport IATA code from the city name
  useEffect(() => {
    if (!destination) return;
    let cancelled = false;
    fetch(`/api/airports?q=${encodeURIComponent(destination)}`)
      .then(res => res.ok ? res.json() : [])
      .then((data: { iata: string }[]) => {
        if (!cancelled && data.length > 0) {
          setDefaultTo(data[0].iata);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [destination]);

  // Auto-detect origin airport from user's geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        fetch(`/api/airports/nearest?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
          .then(res => res.ok ? res.json() : null)
          .then((data: { iata: string; name: string } | null) => {
            if (!cancelled && data?.iata) {
              setDefaultFrom(data.iata);
            }
          })
          .catch(() => {});
      },
      () => {}, // silently ignore denial
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
    return () => { cancelled = true; };
  }, []);

  const handleSearch = (params: { origin: string; destination: string; passengers: number; cabinClass: string; originCity?: string; originCountry?: string; destCity?: string; destCountry?: string }) => {
    setSearchParams({
      origin: params.origin,
      destination: params.destination,
      date: trip?.start_date || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      passengers: params.passengers,
      cabinClass: params.cabinClass,
      originCity: params.originCity,
      originCountry: params.originCountry,
      destCity: params.destCity || destination,
      destCountry: params.destCountry || tripDestCountry,
    });
  };

  // Auto-trigger a flight search once we have both origin (geolocated) and
  // destination (looked up from trip city) and the user hasn't already kicked
  // off a search. Skips if there are already booked flights from trip_context
  // or the activity table — only shows when the tab would otherwise be empty.
  useEffect(() => {
    if (searchParams) return;
    if (!defaultFrom || !defaultTo) return;
    const ctxFlights = (trip?.trip_context as any)?.flights as any[] | undefined;
    if (dbFlights.length > 0 || (ctxFlights?.length ?? 0) > 0) return;
    setSearchParams({
      origin: defaultFrom,
      destination: defaultTo,
      date: trip?.start_date || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      passengers: trip?.travelers || 1,
      cabinClass: 'economy',
      originCountry: 'US',
      destCity: destination,
      destCountry: tripDestCountry,
    });
  }, [defaultFrom, defaultTo, dbFlights.length, trip, searchParams, destination, tripDestCountry]);

  // Convert DB flights OR trip_context flights into BookedFlightCard format
  const contextFlights = (trip?.trip_context as any)?.flights as any[] | undefined;
  const bookedFlights = useMemo(() => {
    if (dbFlights.length > 0) return dbFlightsToBooked(dbFlights, destination);
    if (!contextFlights?.length) return [];
    // Convert trip_context flights (from planner) into BookedFlight shape
    return contextFlights.map((f: any, i: number): BookedFlight => {
      const dep = f.departure_time ? new Date(f.departure_time) : null;
      const arr = f.arrival_time ? new Date(f.arrival_time) : null;
      const depTime = dep ? dep.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
      const arrTime = arr ? arr.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
      const dateStr = dep ? dep.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
      const nextDay = dep && arr ? arr.getDate() !== dep.getDate() : false;
      let durationStr = '';
      if (f.duration) {
        const mins = typeof f.duration === 'number' ? f.duration : parseInt(f.duration, 10);
        if (!isNaN(mins)) durationStr = `${Math.floor(mins / 60)}h ${mins % 60}m`;
      } else if (dep && arr) {
        const ms = arr.getTime() - dep.getTime();
        durationStr = `${Math.floor(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
      }
      const originCode = f.origin ?? '';
      const destCode = f.dest_iata ?? f.destination ?? '';
      const airlineCode = (f.airline || '??').slice(0, 2).toUpperCase();
      return {
        id: `ctx-flight-${i}`,
        type: i === 0 ? 'outbound' : 'return',
        flightNumber: `${airlineCode}${100 + i}`,
        airline: f.airline || 'Airline',
        airlineLogo: airlineCode,
        aircraft: '',
        date: dateStr,
        departure: { time: depTime, code: originCode, terminal: '', gate: '' },
        arrival: { time: arrTime, code: destCode, terminal: '', gate: '', nextDay },
        duration: durationStr,
        stops: f.stops ? `${f.stops} stop${f.stops > 1 ? 's' : ''}` : 'Direct',
        cabinClass: 'Economy',
        seats: '',
        baggage: '1 checked bag',
        meal: '',
        wifi: '',
        confirmation: '',
        price: { base: Math.round(f.price ?? 0), taxes: 0, total: Math.round(f.price ?? 0) },
        status: 'Planned',
      };
    });
  }, [dbFlights, contextFlights, destination]);
  const outbound = bookedFlights.filter(f => f.type === 'outbound');
  const returnFlights = bookedFlights.filter(f => f.type === 'return');

  // Persist a search-result flight into trip_context.flights[0]. The budget
  // tab reads from trip_context.flights[] so this is what makes the flight
  // price show up in Budget after the user picks one.
  const queryClient = useQueryClient();
  const [savingFlightId, setSavingFlightId] = useState<string | null>(null);
  const handleSelectFlight = async (f: ComparisonFlight) => {
    if (!id) return;
    setSavingFlightId(f.id);
    try {
      // Reconstruct ISO datetimes from "HH:MM" + searchParams.date so the
      // BookedFlightCard renderer (and trip itinerary) get usable times.
      const baseDate = searchParams?.date || trip?.start_date || new Date().toISOString().slice(0, 10);
      const isoFor = (clock: string) => {
        const m = clock.match(/(\d{1,2}):(\d{2})/);
        if (!m) return null;
        const hh = m[1].padStart(2, '0');
        return `${baseDate}T${hh}:${m[2]}:00`;
      };
      const ctxFlight = {
        airline: f.airline,
        airlineLogo: f.airlineLogo,
        flight_number: f.flightNumber,
        origin: f.departure.airport,
        origin_iata: f.departure.airport,
        destination: f.arrival.airport,
        dest_iata: f.arrival.airport,
        departure_time: isoFor(f.departure.time),
        arrival_time: isoFor(f.arrival.time),
        duration: (() => {
          const m = f.duration.match(/(\d+)h\s*(\d+)?m?/);
          return m ? Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0) : 0;
        })(),
        stops: f.stops,
        price: f.price,
        depart_date: baseDate,
      };
      const { data: row } = await supabase.from('trips').select('trip_context').eq('id', id).single();
      const ctx = (row?.trip_context || {}) as Record<string, unknown>;
      const existing = Array.isArray((ctx as any).flights) ? ((ctx as any).flights as any[]) : [];
      (ctx as any).flights = existing.length > 0 ? [ctxFlight, ...existing.slice(1)] : [ctxFlight];
      const { error } = await supabase.from('trips').update({ trip_context: ctx }).eq('id', id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['trip', id] });
    } catch (e) {
      console.error('Failed to add flight to trip', e);
    } finally {
      setSavingFlightId(null);
    }
  };

  if (isLoading || loadingDbFlights) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1].map(i => (
          <div key={i} className="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden">
            <div className="h-11 rounded-t-2xl" style={{ background: i === 0 ? 'linear-gradient(135deg, #2563eb, #3b82f6)' : 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' }} />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-12 w-16 rounded bg-gray-200 dark:bg-white/[0.06]" />
                <div className="flex-1 mx-4 h-px bg-gray-200 dark:bg-white/[0.06]" />
                <div className="h-12 w-16 rounded bg-gray-200 dark:bg-white/[0.06]" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-white/[0.06]" />
                <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-white/[0.06]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasBookedFlights = bookedFlights.length > 0;

  return (
    <div className="space-y-4">
      {/* 1. Your Flights — from trip generation / database */}
      {hasBookedFlights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {outbound.map(f => <BookedFlightCard key={f.id} flight={f} />)}
          {returnFlights.map(f => <BookedFlightCard key={f.id} flight={f} />)}
        </div>
      )}

      {/* 2. Flight Search Section — open by default when no flights yet */}
      <FlightSearchSection
        defaultFrom={defaultFrom}
        defaultTo={defaultTo}
        defaultTravelers={defaultTravelers}
        onSearch={handleSearch}
        defaultOpen={!hasBookedFlights}
      />

      {/* 3. Comparison Alternatives */}
      {searchingFlights ? (
        <div className="bg-white dark:bg-white/[0.03] rounded-xl shadow-sm border border-gray-200 dark:border-white/[0.08] p-6 text-center">
          <div className="w-6 h-6 border-2 border-gray-300 dark:border-white/[0.15] border-t-[#2563eb] rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Searching flights...</p>
        </div>
      ) : searchedFlights.length > 0 ? (
        <ComparisonAlternatives comparisonFlights={searchedFlights} onSelect={handleSelectFlight} savingId={savingFlightId} />
      ) : !hasBookedFlights ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mb-3">
            <Plane size={24} className="text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Search for flights to compare options</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use the search above to find the best deals</p>
        </div>
      ) : null}

      {/* Booking details will show when real booking data is available */}
    </div>
  );
}
