'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  X,
  Loader2,
  Building2,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react'
import {
  Input,
  FieldLabel,
  PrimaryButton,
  DateInput,
} from '@/components/trip/BookingFormPrimitives'
import { searchHotels, type HotelSearchInput, type SerpHotel } from './hotelSearch'
import { HotelResultCard } from './HotelResultCard'
import { HotelResultDetailModal } from './HotelResultDetailModal'

type SortMode = 'price-asc' | 'price-desc' | 'rating-desc' | 'reviews-desc' | 'stars-desc'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating-desc', label: 'Highest guest rating' },
  { value: 'reviews-desc', label: 'Most reviewed' },
  { value: 'stars-desc', label: 'Highest star class' },
]

const PAGE_SIZE = 12
const PRICE_PRESETS = [100, 200, 300]
const RATING_PRESETS = [4.0, 4.5, 4.8]
const STAR_OPTIONS = [5, 4, 3, 2, 1]

export interface HotelSearchPanelProps {
  trip: { id: string; destination: string; start_date: string; end_date: string }
  savedOfferIds: Set<string>
  busyOfferId: string | null
  onAdd: (hotel: SerpHotel) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
  onSearchInputs: (inputs: { check_in: string; check_out: string; guests: number }) => void
  onAddManually?: () => void
}

export function HotelSearchPanel({
  trip,
  savedOfferIds,
  busyOfferId,
  onAdd,
  formatPrice,
  onSearchInputs,
  onAddManually,
}: HotelSearchPanelProps) {
  const [destination, setDestination] = useState(trip.destination ?? '')
  const [checkIn, setCheckIn] = useState(trip.start_date ?? '')
  const [checkOut, setCheckOut] = useState(trip.end_date ?? '')
  const [guests, setGuests] = useState('2')

  const [results, setResults] = useState<SerpHotel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(true)

  const [sortMode, setSortMode] = useState<SortMode>('price-asc')
  const [starFilter, setStarFilter] = useState<number[]>([])
  const [minRating, setMinRating] = useState<number | ''>('')
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [amenityFilter, setAmenityFilter] = useState<string[]>([])
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string[]>([])
  const [page, setPage] = useState(1)

  const [openHotelId, setOpenHotelId] = useState<string | null>(null)

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const toggleSection = (n: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  // Sync trip data → form when it lands asynchronously
  const prevTrip = useRef({
    destination: trip.destination,
    start_date: trip.start_date,
    end_date: trip.end_date,
  })
  useEffect(() => {
    const prev = prevTrip.current
    if (!prev.destination && trip.destination) setDestination(trip.destination)
    if (!prev.start_date && trip.start_date) setCheckIn(trip.start_date)
    if (!prev.end_date && trip.end_date) setCheckOut(trip.end_date)
    prevTrip.current = {
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
    }
  }, [trip.destination, trip.start_date, trip.end_date])

  // Reset to page 1 when filters/sort change
  useEffect(() => {
    setPage(1)
  }, [starFilter, minRating, minPrice, maxPrice, amenityFilter, propertyTypeFilter, sortMode])

  // Auto-search the first time we have all 3 inputs
  const autoSearchedRef = useRef(false)
  useEffect(() => {
    if (autoSearchedRef.current) return
    if (destination && checkIn && checkOut) {
      autoSearchedRef.current = true
      runSearch(destination, checkIn, checkOut, Number(guests))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, checkIn, checkOut])

  async function runSearch(dest: string, ci: string, co: string, g: number) {
    if (!dest.trim() || !ci || !co) return
    setLoading(true)
    setHasSearched(true)
    setError(null)
    setResults([])
    onSearchInputs({ check_in: ci, check_out: co, guests: g })
    try {
      const input: HotelSearchInput = {
        destination: dest.trim(),
        check_in: ci,
        check_out: co,
        guests: g,
        sort: '3',
      }
      const res = await searchHotels(input)
      if (res.error) {
        setError(res.error)
      } else {
        setResults(res.hotels)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleManualSearch = () => {
    setShowForm(false)
    runSearch(destination, checkIn, checkOut, Number(guests))
  }

  // Aggregate filter options from result set
  const allAmenities = useMemo(() => {
    const counts = new Map<string, number>()
    for (const h of results) {
      for (const a of h.amenities) {
        counts.set(a, (counts.get(a) ?? 0) + 1)
      }
    }
    // Top 12 amenities by frequency
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name]) => name)
  }, [results])

  const allPropertyTypes = useMemo(() => {
    const set = new Set<string>()
    for (const h of results) {
      if (h.propertyType) set.add(h.propertyType)
    }
    return Array.from(set).sort()
  }, [results])

  const filteredResults = useMemo(() => {
    let r = [...results]
    if (starFilter.length > 0) r = r.filter((h) => starFilter.includes(h.stars))
    if (minRating !== '') r = r.filter((h) => h.rating >= (minRating as number))
    if (minPrice !== '') r = r.filter((h) => h.price != null && h.price >= (minPrice as number))
    if (maxPrice !== '') r = r.filter((h) => h.price != null && h.price <= (maxPrice as number))
    if (amenityFilter.length > 0) {
      r = r.filter((h) => amenityFilter.every((a) => h.amenities.includes(a)))
    }
    if (propertyTypeFilter.length > 0) {
      r = r.filter((h) => h.propertyType && propertyTypeFilter.includes(h.propertyType))
    }

    r.sort((a, b) => {
      switch (sortMode) {
        case 'price-asc':
          return (a.price ?? Infinity) - (b.price ?? Infinity)
        case 'price-desc':
          return (b.price ?? -Infinity) - (a.price ?? -Infinity)
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0)
        case 'reviews-desc':
          return (b.reviews || 0) - (a.reviews || 0)
        case 'stars-desc':
          return (b.stars || 0) - (a.stars || 0)
      }
    })
    return r
  }, [results, starFilter, minRating, minPrice, maxPrice, amenityFilter, propertyTypeFilter, sortMode])

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => filteredResults.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredResults, safePage],
  )

  const hasActiveFilters =
    starFilter.length > 0 ||
    minRating !== '' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    amenityFilter.length > 0 ||
    propertyTypeFilter.length > 0

  const activeFilterCount =
    starFilter.length +
    (minRating !== '' ? 1 : 0) +
    (minPrice !== '' ? 1 : 0) +
    (maxPrice !== '' ? 1 : 0) +
    amenityFilter.length +
    propertyTypeFilter.length

  const clearAll = () => {
    setStarFilter([])
    setMinRating('')
    setMinPrice('')
    setMaxPrice('')
    setAmenityFilter([])
    setPropertyTypeFilter([])
  }

  return (
    <div className="space-y-4">
      {/* Search form (collapsed once we have results) */}
      {(showForm || !hasSearched) && (
        <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Search hotels</p>
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
            <div className="md:col-span-6">
              <FieldLabel>Destination</FieldLabel>
              <Input value={destination} onChange={setDestination} placeholder="City, country" />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Check-in</FieldLabel>
              <DateInput value={checkIn} onChange={setCheckIn} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Check-out</FieldLabel>
              <DateInput value={checkOut} onChange={setCheckOut} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Guests</FieldLabel>
              <Input type="number" value={guests} onChange={setGuests} min={1} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-4">
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
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400 dark:text-gray-500" />
        </div>
      )}

      {/* Error / empty */}
      {!loading && hasSearched && error && (
        <div className="text-center py-12">
          <Search size={22} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">Search failed</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            {error === 'unavailable' ? 'Hotel search is temporarily unavailable.' : error}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-sm font-medium border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
          >
            <Search size={13} /> Change search
          </button>
        </div>
      )}

      {!loading && hasSearched && !error && results.length === 0 && (
        <div className="text-center py-12">
          <Building2 size={22} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No hotels found for these dates.</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Try a different city or adjust your dates.</p>
        </div>
      )}

      {/* Results toolbar + filter sidebar + grid */}
      {!loading && results.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{results.length}</span> hotels
              {filteredResults.length < results.length && (
                <span className="text-gray-400 dark:text-gray-500">
                  {' '}· <span className="font-medium">{filteredResults.length}</span> shown
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
                onClick={clearAll}
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
            {showFilters && (
              <aside className="lg:w-56 xl:w-64 shrink-0">
                <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] p-4 space-y-4">
                  {/* Price range */}
                  <FilterSection
                    name="price"
                    label="Price / night"
                    open={!collapsedSections.has('price')}
                    onToggle={() => toggleSection('price')}
                  >
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min={0}
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Min"
                        className={numberInputClass}
                      />
                      <span className="text-[11px] text-gray-400">–</span>
                      <input
                        type="number"
                        min={0}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Max"
                        className={numberInputClass}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {PRICE_PRESETS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setMaxPrice(maxPrice === p ? '' : p)}
                          className={chipClass(maxPrice === p)}
                        >
                          ≤ ${p}
                        </button>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Star class */}
                  <FilterSection
                    name="stars"
                    label="Star class"
                    open={!collapsedSections.has('stars')}
                    onToggle={() => toggleSection('stars')}
                  >
                    <div className="flex flex-col gap-0.5 mt-2">
                      {STAR_OPTIONS.map((s) => {
                        const active = starFilter.includes(s)
                        const count = results.filter((h) => h.stars === s).length
                        if (count === 0) return null
                        return (
                          <button
                            key={s}
                            onClick={() =>
                              setStarFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
                            }
                            className={checkboxRowClass(active)}
                          >
                            <Checkbox active={active} />
                            <span className="flex items-center gap-0.5">
                              {Array.from({ length: s }).map((_, i) => (
                                <span key={i} className="text-amber-400">★</span>
                              ))}
                            </span>
                            <span className="ml-auto text-[11px] text-gray-400">{count}</span>
                          </button>
                        )
                      })}
                    </div>
                  </FilterSection>

                  {/* Guest rating */}
                  <FilterSection
                    name="rating"
                    label="Guest rating"
                    open={!collapsedSections.has('rating')}
                    onToggle={() => toggleSection('rating')}
                  >
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {RATING_PRESETS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setMinRating(minRating === r ? '' : r)}
                          className={chipClass(minRating === r)}
                        >
                          {r}+
                        </button>
                      ))}
                    </div>
                  </FilterSection>

                  {/* Property type */}
                  {allPropertyTypes.length > 1 && (
                    <FilterSection
                      name="type"
                      label="Property type"
                      open={!collapsedSections.has('type')}
                      onToggle={() => toggleSection('type')}
                    >
                      <div className="flex flex-col gap-0.5 mt-2">
                        {allPropertyTypes.map((t) => {
                          const active = propertyTypeFilter.includes(t)
                          return (
                            <button
                              key={t}
                              onClick={() =>
                                setPropertyTypeFilter((prev) =>
                                  prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                                )
                              }
                              className={checkboxRowClass(active)}
                            >
                              <Checkbox active={active} /> {t}
                            </button>
                          )
                        })}
                      </div>
                    </FilterSection>
                  )}

                  {/* Amenities */}
                  {allAmenities.length > 0 && (
                    <FilterSection
                      name="amenities"
                      label="Amenities"
                      open={!collapsedSections.has('amenities')}
                      onToggle={() => toggleSection('amenities')}
                    >
                      <div className="flex flex-col gap-0.5 mt-2">
                        {allAmenities.map((a) => {
                          const active = amenityFilter.includes(a)
                          return (
                            <button
                              key={a}
                              onClick={() =>
                                setAmenityFilter((prev) =>
                                  prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
                                )
                              }
                              className={checkboxRowClass(active)}
                            >
                              <Checkbox active={active} />
                              <span className="truncate">{a}</span>
                            </button>
                          )
                        })}
                      </div>
                    </FilterSection>
                  )}
                </div>
              </aside>
            )}

            {/* Result grid */}
            <div className="flex-1 min-w-0">
              {filteredResults.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-dashed border-gray-200 dark:border-white/[0.08]">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No hotels match these filters.</p>
                  <button
                    onClick={clearAll}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[12px] font-medium border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {paginated.map((hotel) => (
                      <HotelResultCard
                        key={hotel.id}
                        hotel={hotel}
                        alreadySaved={savedOfferIds.has(hotel.id)}
                        busy={busyOfferId === hotel.id}
                        onAdd={onAdd}
                        formatPrice={formatPrice}
                        onOpen={() => setOpenHotelId(hotel.id)}
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

      {/* Detail modal — opened from a search result card. Portals to body. */}
      {openHotelId && (() => {
        const open = results.find((h) => h.id === openHotelId)
        if (!open) return null
        return (
          <HotelResultDetailModal
            hotel={open}
            alreadySaved={savedOfferIds.has(open.id)}
            busy={busyOfferId === open.id}
            onClose={() => setOpenHotelId(null)}
            onAdd={async (h) => {
              await onAdd(h)
              setOpenHotelId(null)
            }}
            formatPrice={formatPrice}
          />
        )
      })()}
    </div>
  )
}

const numberInputClass =
  'w-full text-[12px] h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-white/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

function chipClass(active: boolean) {
  return `text-[11px] px-2.5 py-1 rounded-full border transition ${
    active
      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] dark:bg-blue-600 dark:border-blue-600'
      : 'bg-white dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/[0.10] hover:border-gray-300 dark:hover:border-white/[0.15]'
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

function FilterSection({
  label,
  open,
  onToggle,
  children,
}: {
  name: string
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
