'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  X,
  Loader2,
  Plus,
  Plane,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  FieldLabel,
  Input,
  Select,
  DateInput,
  PrimaryButton,
} from '@/components/trip/BookingFormPrimitives'
import { AirportAutocomplete } from './AirportAutocomplete'
import { searchAirports } from './airportSearch'
import { searchFlights, type FlightSearchInput, type SerpFlight } from './flightSearch'
import { FlightResultCard } from './FlightResultCard'

const CABIN_OPTIONS = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
]

type SortMode = 'price-asc' | 'duration-asc' | 'stops-asc' | 'departure-asc'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'duration-asc', label: 'Shortest duration' },
  { value: 'stops-asc', label: 'Fewest stops' },
  { value: 'departure-asc', label: 'Earliest departure' },
]

const PAGE_SIZE = 12
const STOPS_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: '0', label: 'Nonstop' },
  { value: '1', label: 'Up to 1 stop' },
  { value: '2', label: 'Up to 2 stops' },
] as const
const DEPARTURE_WINDOWS = [
  { id: 'any', label: 'Any', start: 0, end: 24 },
  { id: 'early', label: 'Early (5–11 AM)', start: 5, end: 11 },
  { id: 'mid', label: 'Midday (11 AM–5 PM)', start: 11, end: 17 },
  { id: 'eve', label: 'Evening (5–11 PM)', start: 17, end: 23 },
  { id: 'red', label: 'Red-eye (11 PM–5 AM)', start: 23, end: 5 },
] as const

type AirportValue = { iata: string; name: string; city: string } | null

export interface FlightSearchPanelProps {
  trip: { id: string; start_date: string; end_date: string; destination?: string | null }
  defaultFrom?: AirportValue
  savedOfferIds: Set<string>
  busyOfferId: string | null
  onAdd: (flight: SerpFlight) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
  onAddManually?: () => void
}

export function FlightSearchPanel({
  trip,
  defaultFrom,
  savedOfferIds,
  busyOfferId,
  onAdd,
  formatPrice,
  onAddManually,
}: FlightSearchPanelProps) {
  // Form state
  const [from, setFrom] = useState<AirportValue>(defaultFrom ?? null)
  const [to, setTo] = useState<AirportValue>(null)
  const [date, setDate] = useState(trip.start_date ?? '')
  const [returnDate, setReturnDate] = useState(trip.end_date ?? '')
  const [oneWay, setOneWay] = useState(false)
  const [passengers, setPassengers] = useState('1')
  const [cabin, setCabin] = useState<FlightSearchInput['cabin']>('economy')

  // Result state
  const [results, setResults] = useState<SerpFlight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // UI state
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(true)
  const [errors, setErrors] = useState<{ from?: boolean; to?: boolean; date?: boolean }>({})

  // Filter state
  const [sortMode, setSortMode] = useState<SortMode>('price-asc')
  const [airlineFilter, setAirlineFilter] = useState<string[]>([])
  const [stopsFilter, setStopsFilter] = useState<'any' | '0' | '1' | '2'>('any')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [maxDuration, setMaxDuration] = useState<number | ''>('')
  const [departureWindow, setDepartureWindow] = useState<typeof DEPARTURE_WINDOWS[number]['id']>('any')
  const [page, setPage] = useState(1)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggleSection = (n: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })

  // Sync default origin (resolved from profile.home_airport asynchronously)
  useEffect(() => {
    if (defaultFrom && !from) setFrom(defaultFrom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFrom?.iata])

  // Sync default destination (resolved from trip.destination asynchronously)
  useEffect(() => {
    let cancelled = false
    const query = trip.destination?.trim()
    if (!query || to) return
    void (async () => {
      try {
        const matches = await searchAirports(query)
        if (cancelled) return
        const pick = matches.find((m) => m.type === 'airport') ?? matches[0]
        if (pick) setTo({ iata: pick.iata, name: pick.name, city: pick.city })
      } catch {}
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.destination])

  // Sync trip dates when they land asynchronously
  const prevTripDates = useRef({ start_date: trip.start_date, end_date: trip.end_date })
  useEffect(() => {
    const prev = prevTripDates.current
    if (!prev.start_date && trip.start_date) setDate(trip.start_date)
    if (!prev.end_date && trip.end_date) setReturnDate(trip.end_date)
    prevTripDates.current = { start_date: trip.start_date, end_date: trip.end_date }
  }, [trip.start_date, trip.end_date])

  // Reset to page 1 when filters/sort change
  useEffect(() => {
    setPage(1)
  }, [airlineFilter, stopsFilter, maxPrice, maxDuration, departureWindow, sortMode])

  // Auto-search once we have all required inputs
  const autoSearchedRef = useRef(false)
  useEffect(() => {
    if (autoSearchedRef.current) return
    if (from?.iata && to?.iata && date) {
      autoSearchedRef.current = true
      void runSearch(from, to, date, oneWay ? '' : returnDate, Number(passengers), cabin)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.iata, to?.iata, date])

  const validate = () => {
    const next: typeof errors = {}
    if (!from?.iata) next.from = true
    if (!to?.iata) next.to = true
    if (!date) next.date = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function runSearch(
    f: AirportValue,
    t: AirportValue,
    d: string,
    r: string,
    pax: number,
    c: FlightSearchInput['cabin'],
  ) {
    if (!f?.iata || !t?.iata || !d) return
    setLoading(true)
    setHasSearched(true)
    setError(null)
    setResults([])
    try {
      const res = await searchFlights({
        origin: f.iata,
        destination: t.iata,
        date: d,
        return: r || undefined,
        passengers: pax,
        cabin: c,
      })
      if (res.error) setError(res.error)
      else setResults(res.flights ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSearch = () => {
    if (!validate()) return
    setShowForm(false)
    void runSearch(from, to, date, oneWay ? '' : returnDate, Number(passengers), cabin)
  }

  // Derive filter options from result set
  const allAirlines = useMemo(() => {
    const m = new Map<string, { logo: string; count: number }>()
    for (const f of results) {
      for (const leg of f.legs) {
        const name = leg.airline?.trim()
        if (!name) continue
        const cur = m.get(name)
        if (cur) cur.count++
        else m.set(name, { logo: leg.airlineLogo || f.airlineLogo || '', count: 1 })
      }
    }
    return Array.from(m.entries())
      .map(([name, v]) => ({ name, logo: v.logo, count: v.count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [results])

  const filtered = useMemo(() => {
    let r = [...results]
    if (airlineFilter.length > 0) {
      r = r.filter((f) => f.legs.some((l) => airlineFilter.includes(l.airline)))
    }
    if (stopsFilter !== 'any') {
      const max = Number(stopsFilter)
      r = r.filter((f) => f.stops <= max)
    }
    if (maxPrice !== '') r = r.filter((f) => f.price != null && f.price <= (maxPrice as number))
    if (maxDuration !== '') {
      r = r.filter((f) => f.totalDuration <= (maxDuration as number) * 60)
    }
    if (departureWindow !== 'any') {
      const win = DEPARTURE_WINDOWS.find((w) => w.id === departureWindow)
      if (win) {
        r = r.filter((f) => {
          const t = f.legs[0]?.departure.time
          if (!t) return false
          const m = t.match(/\s(\d{1,2}):(\d{2})$/) || t.match(/T(\d{1,2}):(\d{2})/)
          const hh = m ? Number(m[1]) : NaN
          if (!Number.isFinite(hh)) return false
          // Window can wrap midnight (red-eye 23–5)
          if (win.start <= win.end) return hh >= win.start && hh < win.end
          return hh >= win.start || hh < win.end
        })
      }
    }

    r.sort((a, b) => {
      switch (sortMode) {
        case 'price-asc':
          return (a.price ?? Infinity) - (b.price ?? Infinity)
        case 'duration-asc':
          return a.totalDuration - b.totalDuration
        case 'stops-asc':
          return a.stops - b.stops
        case 'departure-asc':
          return (a.legs[0]?.departure.time ?? '').localeCompare(b.legs[0]?.departure.time ?? '')
      }
    })
    return r
  }, [results, airlineFilter, stopsFilter, maxPrice, maxDuration, departureWindow, sortMode])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  )

  const hasActiveFilters =
    airlineFilter.length > 0 ||
    stopsFilter !== 'any' ||
    maxPrice !== '' ||
    maxDuration !== '' ||
    departureWindow !== 'any'
  const activeFilterCount =
    airlineFilter.length +
    (stopsFilter !== 'any' ? 1 : 0) +
    (maxPrice !== '' ? 1 : 0) +
    (maxDuration !== '' ? 1 : 0) +
    (departureWindow !== 'any' ? 1 : 0)

  const clearFilters = () => {
    setAirlineFilter([])
    setStopsFilter('any')
    setMaxPrice('')
    setMaxDuration('')
    setDepartureWindow('any')
  }

  return (
    <div className="space-y-4">
      {/* Search form */}
      {(showForm || !hasSearched) && (
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">Search flights</p>
            {hasSearched && (
              <button
                onClick={() => setShowForm(false)}
                className="text-[12px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-x-3 gap-y-3">
            <div className="md:col-span-3">
              <AirportAutocomplete label="From" value={from} onChange={setFrom} invalid={errors.from} />
            </div>
            <div className="md:col-span-3">
              <AirportAutocomplete label="To" value={to} onChange={setTo} invalid={errors.to} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Depart</FieldLabel>
              <DateInput value={date} onChange={setDate} invalid={errors.date} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Return</FieldLabel>
              <DateInput value={returnDate} onChange={setReturnDate} disabled={oneWay} />
            </div>
            <div className="md:col-span-1">
              <FieldLabel>Passengers</FieldLabel>
              <Input type="number" value={passengers} onChange={setPassengers} min={1} />
            </div>
            <div className="md:col-span-1">
              <FieldLabel>Cabin</FieldLabel>
              <Select value={cabin} onChange={(v) => setCabin(v as FlightSearchInput['cabin'])} options={CABIN_OPTIONS} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 mt-4">
            <label className="inline-flex items-center gap-2 text-[12px] text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={oneWay}
                onChange={(e) => setOneWay(e.target.checked)}
                className="rounded"
              />
              One-way
            </label>
            <div className="flex items-center gap-3">
              {onAddManually && (
                <button
                  onClick={onAddManually}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-medium border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
                >
                  <Plus size={12} /> Add manually
                </button>
              )}
              <PrimaryButton onClick={handleManualSearch} busy={loading}>
                <span className="inline-flex items-center gap-1.5">
                  <Search size={13} /> Search
                </span>
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400 dark:text-gray-500" />
        </div>
      )}

      {/* Error */}
      {!loading && hasSearched && error && (
        <div className="text-center py-12">
          <Search size={22} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-[13px] text-red-600 dark:text-red-400 font-medium">Search failed</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">{error}</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
          >
            <Search size={13} /> Change search
          </button>
        </div>
      )}

      {/* Empty result set */}
      {!loading && hasSearched && !error && results.length === 0 && (
        <div className="text-center py-12">
          <Plane size={22} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-[13px] text-gray-500 dark:text-gray-400">No flights found for this route and date.</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Try a different date or airport.</p>
        </div>
      )}

      {/* Results layout */}
      {!loading && results.length > 0 && (
        <>
          {/* Single-row toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{results.length}</span> flights
              {filtered.length < results.length && (
                <span className="text-gray-400 dark:text-gray-500">
                  {' '}· <span className="font-medium">{filtered.length}</span> shown
                </span>
              )}
            </p>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`text-[12px] h-8 px-3 rounded-lg border transition ${
                hasActiveFilters
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] dark:bg-blue-600 dark:border-blue-600'
                  : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/[0.15]'
              }`}
            >
              Filters{hasActiveFilters && ` (${activeFilterCount})`}
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                Clear all
              </button>
            )}
            <div className="ml-auto flex items-center gap-3">
              {hasSearched && !showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <Search size={12} />
                  Change search
                </button>
              )}
              <div className="relative">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="appearance-none text-[12px] h-8 pl-2.5 pr-7 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 cursor-pointer hover:border-gray-300 dark:hover:border-white/[0.15] focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-white/20"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ArrowUpDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* Filter sidebar */}
            {showFilters && (
              <aside className="lg:w-56 xl:w-64 shrink-0">
                <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] p-4 space-y-4">
                  {/* Stops */}
                  <FilterSection
                    label="Stops"
                    open={!collapsed.has('stops')}
                    onToggle={() => toggleSection('stops')}
                  >
                    <div className="flex flex-col gap-0.5 mt-2">
                      {STOPS_OPTIONS.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setStopsFilter(s.value)}
                          className={radioRowClass(stopsFilter === s.value)}
                        >
                          <RadioDot active={stopsFilter === s.value} /> {s.label}
                        </button>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Airlines */}
                  {allAirlines.length > 1 && (
                    <FilterSection
                      label="Airlines"
                      open={!collapsed.has('airlines')}
                      onToggle={() => toggleSection('airlines')}
                    >
                      <div className="flex flex-col gap-0.5 mt-2 max-h-56 overflow-y-auto pr-1">
                        {allAirlines.map((a) => {
                          const active = airlineFilter.includes(a.name)
                          return (
                            <button
                              key={a.name}
                              onClick={() =>
                                setAirlineFilter((prev) =>
                                  prev.includes(a.name)
                                    ? prev.filter((x) => x !== a.name)
                                    : [...prev, a.name],
                                )
                              }
                              className={checkboxRowClass(active)}
                            >
                              <Checkbox active={active} />
                              {a.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={a.logo}
                                  alt={a.name}
                                  className="w-4 h-4 object-contain shrink-0"
                                />
                              ) : (
                                <Plane size={11} className="text-gray-400 shrink-0" />
                              )}
                              <span className="truncate">{a.name}</span>
                              <span className="ml-auto text-[11px] text-gray-400">{a.count}</span>
                            </button>
                          )
                        })}
                      </div>
                    </FilterSection>
                  )}

                  {/* Max price */}
                  <FilterSection
                    label="Max price"
                    open={!collapsed.has('price')}
                    onToggle={() => toggleSection('price')}
                  >
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min={0}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 600"
                        className={numberInputClass}
                      />
                      {maxPrice !== '' && (
                        <button
                          onClick={() => setMaxPrice('')}
                          className="text-[11px] px-2 py-1 rounded-full border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-400 hover:text-gray-600 inline-flex items-center gap-1 shrink-0"
                        >
                          <X size={10} /> Clear
                        </button>
                      )}
                    </div>
                  </FilterSection>

                  {/* Max duration */}
                  <FilterSection
                    label="Max duration"
                    open={!collapsed.has('duration')}
                    onToggle={() => toggleSection('duration')}
                  >
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min={1}
                        value={maxDuration}
                        onChange={(e) => setMaxDuration(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 8"
                        className={numberInputClass}
                      />
                      <span className="text-[11px] text-gray-400">hrs</span>
                    </div>
                  </FilterSection>

                  {/* Departure window */}
                  <FilterSection
                    label="Departure"
                    open={!collapsed.has('departure')}
                    onToggle={() => toggleSection('departure')}
                  >
                    <div className="flex flex-col gap-0.5 mt-2">
                      {DEPARTURE_WINDOWS.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => setDepartureWindow(w.id)}
                          className={radioRowClass(departureWindow === w.id)}
                        >
                          <RadioDot active={departureWindow === w.id} /> {w.label}
                        </button>
                      ))}
                    </div>
                  </FilterSection>
                </div>
              </aside>
            )}

            {/* Result list */}
            <div className="flex-1 min-w-0">
              {filtered.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08]">
                  <p className="text-[13px] text-gray-500 dark:text-gray-400">No flights match these filters.</p>
                  <button
                    onClick={clearFilters}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[12px] font-medium border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginated.map((flight) => (
                      <FlightResultCard
                        key={flight.id}
                        flight={flight}
                        alreadySaved={savedOfferIds.has(flight.id)}
                        busy={busyOfferId === flight.id}
                        onAdd={onAdd}
                        formatPrice={formatPrice}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        className="inline-flex items-center gap-1 text-[12px] h-8 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={12} /> Prev
                      </button>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">
                        Page <span className="font-semibold text-gray-900 dark:text-white">{safePage}</span> of {totalPages}
                      </p>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        className="inline-flex items-center gap-1 text-[12px] h-8 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const numberInputClass =
  'w-full text-[12px] h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-white/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

function radioRowClass(active: boolean) {
  return `text-[12px] px-3 py-1.5 rounded-lg text-left flex items-center gap-2.5 transition ${
    active
      ? 'bg-[#1e3a5f] text-white dark:bg-blue-600'
      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
  }`
}
function checkboxRowClass(active: boolean) {
  return `text-[12px] px-3 py-1.5 rounded-lg text-left flex items-center gap-2.5 transition ${
    active
      ? 'bg-[#1e3a5f] text-white dark:bg-blue-600'
      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
  }`
}
function Checkbox({ active }: { active: boolean }) {
  return (
    <span
      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
        active ? 'bg-white/20 border-white/40' : 'border-gray-300 dark:border-white/30 bg-white dark:bg-transparent'
      }`}
    >
      {active && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}
function RadioDot({ active }: { active: boolean }) {
  return (
    <span
      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
        active ? 'border-white/60' : 'border-gray-300 dark:border-white/30'
      }`}
    >
      {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
    </span>
  )
}
function FilterSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button onClick={onToggle} className="flex items-center justify-between w-full text-left">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
        <ChevronDown size={13} className={`text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && children}
    </div>
  )
}
