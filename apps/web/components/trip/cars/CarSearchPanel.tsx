"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useCarSearch } from "@travyl/shared";
import type { CarRentalData } from "./types";
import {
  Car,
  Loader2,
  Search,
  Plus,
  Fuel,
  Users,
  ArrowUpDown,
  X,
} from "lucide-react";
import {
  Input,
  FieldLabel,
  PrimaryButton,
  DateInput,
} from "@/components/trip/BookingFormPrimitives";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function futureDate(d: string | undefined, fallbackDays = 3): string {
  if (!d) {
    const dt = new Date();
    dt.setDate(dt.getDate() + fallbackDays);
    return dt.toISOString().slice(0, 10);
  }
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    const dt = new Date();
    dt.setDate(dt.getDate() + fallbackDays);
    return dt.toISOString().slice(0, 10);
  }
  return d;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function mapRateToCarData(
  rate: any,
  pickupLocation: string,
  dropoffLocation: string,
): CarRentalData {
  return {
    vendor: rate.supplier ?? "Unknown",
    vehicle: rate.vehicle ?? null,
    pickup_location: rate.pickup_name ?? pickupLocation,
    dropoff_location: rate.dropoff_name ?? dropoffLocation,
    pickup_at: "",
    dropoff_at: "",
    price: rate.total_amount ? parseFloat(rate.total_amount) : null,
    currency: rate.total_currency ?? null,
    booking_ref: null,
  };
}

function cleanSupplierName(name: string): string {
  return name
    .replace(/ Rent a Car/i, "")
    .replace(/ Rent A Car/i, "")
    .replace(/ Rent-A-Car/i, "")
    .replace(/ Car Rental/i, "")
    .replace(/ Corporation/i, "")
    .trim();
}

function CarRateImage({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-full aspect-[16/10] rounded-t-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <Car size={36} className="text-gray-300" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full aspect-[16/10] object-contain bg-gray-50 p-3"
      onError={() => setFailed(true)}
    />
  );
}

type SortMode = "price-asc" | "price-desc" | "daily-asc" | "daily-desc";

export function CarSearchPanel({
  tripDestination,
  tripStartDate,
  tripEndDate,
  onAdd,
  onAddManually,
}: {
  tripDestination?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  onAdd: (data: CarRentalData) => Promise<void>;
  onAddManually?: () => void;
}) {
  const [pickupLocation, setPickupLocation] = useState(tripDestination ?? "");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupDate, setPickupDate] = useState(futureDate(tripStartDate));
  const [dropoffDate, setDropoffDate] = useState(futureDate(tripEndDate, 5));
  const [addingId, setAddingId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("price-asc");
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [minYear, setMinYear] = useState<number | ''>('');
  const [minMpg, setMinMpg] = useState<number | ''>('');
  const [page, setPage] = useState(1);
  const [mpgData, setMpgData] = useState<
    Record<string, { mpg: number | null; label: string | null; year: number | null }>
  >({});
  const [mpgLoading, setMpgLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const PAGE_SIZE = 12;

  // Reset to page 1 when filters or sort change
  useEffect(() => {
    setPage(1);
  }, [supplierFilter, categoryFilter, sortMode, minYear, minMpg]);

  // Sync props → state when trip data loads asynchronously
  const prevProps = useRef({ tripDestination, tripStartDate, tripEndDate });
  useEffect(() => {
    const prev = prevProps.current;
    if (!prev.tripDestination && tripDestination) {
      setPickupLocation(tripDestination);
    }
    if (!prev.tripStartDate && tripStartDate) {
      setPickupDate(futureDate(tripStartDate));
    }
    if (!prev.tripEndDate && tripEndDate) {
      setDropoffDate(futureDate(tripEndDate, 5));
    }
    prevProps.current = { tripDestination, tripStartDate, tripEndDate };
  }, [tripDestination, tripStartDate, tripEndDate]);

  // Auto-correct dropoff when pickup moves past it
  const handlePickupDateChange = (v: string) => {
    setPickupDate(v);
    if (dropoffDate && v >= dropoffDate) {
      const nextDay = addDays(v, 1);
      if (!tripEndDate || nextDay <= tripEndDate) setDropoffDate(nextDay);
    }
  };

  // Date constraints: bounded by trip start/end dates
  const pickupMin = tripStartDate ?? todayString();
  const pickupMax = tripEndDate;
  const dropoffMin = pickupDate || tripStartDate || todayString();
  const dropoffMax = tripEndDate;

  const searchEnabled = !!pickupLocation && !!pickupDate && !!dropoffDate;
  const { data, isLoading } = useCarSearch({
    pickupLocation: pickupLocation || undefined,
    dropoffLocation: dropoffLocation || undefined,
    pickupDate: pickupDate || undefined,
    dropoffDate: dropoffDate || undefined,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRates: any[] = (data as any)?.rates ?? [];
  const apiError: string | undefined = (data as any)?.error;
  const hasResults = allRates.length > 0;

  // Extract unique suppliers and categories
  const suppliers = useMemo(() => {
    const set = new Set<string>();
    allRates.forEach((r: any) => {
      if (r.supplier) set.add(r.supplier);
    });
    return Array.from(set).sort();
  }, [allRates]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    allRates.forEach((r: any) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort();
  }, [allRates]);

  // Filter and sort rates
  const rates = useMemo(() => {
    let filtered = [...allRates];

    if (supplierFilter.length > 0) {
      filtered = filtered.filter((r: any) =>
        supplierFilter.includes(r.supplier),
      );
    }
    if (categoryFilter.length > 0) {
      filtered = filtered.filter((r: any) =>
        categoryFilter.includes(r.category),
      );
    }

    // Year filter (min year)
    if (minYear !== '') {
      filtered = filtered.filter((r: any) => {
        const mpg = getMpg(r);
        return (mpg?.year ?? 0) >= (minYear as number);
      });
    }
    // MPG filter (min MPG)
    if (minMpg !== '') {
      filtered = filtered.filter((r: any) => {
        const mpg = getMpg(r);
        return (mpg?.mpg ?? 0) >= (minMpg as number);
      });
    }

    filtered.sort((a: any, b: any) => {
      const aPrice = parseFloat(a.total_amount) || 0;
      const bPrice = parseFloat(b.total_amount) || 0;
      const aDaily = parseFloat(a.daily_amount) || 0;
      const bDaily = parseFloat(b.daily_amount) || 0;

      switch (sortMode) {
        case "price-asc":
          return aPrice - bPrice;
        case "price-desc":
          return bPrice - aPrice;
        case "daily-asc":
          return aDaily - bDaily;
        case "daily-desc":
          return bDaily - aDaily;
        default:
          return aPrice - bPrice;
      }
    });

    return filtered;
  }, [allRates, supplierFilter, categoryFilter, sortMode, minYear, minMpg, mpgData]);

  // Fetch real MPG from fueleconomy.gov when rates change
  useEffect(() => {
    const vehicles = rates
      .map((r: any) => r.vehicle)
      .filter(Boolean) as string[];
    const unique = [...new Set(vehicles)];
    if (unique.length === 0) return;
    const uncached = unique.filter((v) => !(v in mpgData));
    if (uncached.length === 0) return;
    setMpgLoading(true);
    fetch("/api/cars/mpg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicles: uncached }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.mpg) setMpgData((prev) => ({ ...prev, ...data.mpg }));
      })
      .catch(() => {})
      .finally(() => setMpgLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(rates.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRates = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rates.slice(start, start + PAGE_SIZE);
  }, [rates, safePage]);

  // MPG: prefer real data from fueleconomy.gov, fallback to estimates
  const getMpg = (rate: any): { mpg: number; label: string; year?: number | null } | null => {
    const vehicle = rate.vehicle as string | undefined;
    if (vehicle) {
      const real = mpgData[vehicle];
      if (real?.mpg != null && real.label)
        return { mpg: real.mpg, label: real.label, year: real.year };
    }

    // Fallback estimates by category + fuel type
    const fuel = (rate.fuel ?? "").toLowerCase();
    const cat = (rate.category ?? "").toLowerCase();

    if (fuel.includes("electric") || fuel === "ev")
      return { mpg: 120, label: "120 MPGe" };
    if (fuel.includes("hybrid")) return { mpg: 45, label: "45 MPG" };

    if (fuel.includes("diesel")) {
      if (cat.includes("compact")) return { mpg: 38, label: "38 MPG" };
      if (cat.includes("economy")) return { mpg: 40, label: "40 MPG" };
      if (cat.includes("mid")) return { mpg: 35, label: "35 MPG" };
      if (cat.includes("standard")) return { mpg: 32, label: "32 MPG" };
      if (cat.includes("full") || cat.includes("large"))
        return { mpg: 30, label: "30 MPG" };
      if (cat.includes("suv")) return { mpg: 28, label: "28 MPG" };
      if (cat.includes("minivan") || cat.includes("van"))
        return { mpg: 25, label: "25 MPG" };
      if (cat.includes("luxury") || cat.includes("premium"))
        return { mpg: 28, label: "28 MPG" };
      if (cat.includes("convertible") || cat.includes("sports"))
        return { mpg: 30, label: "30 MPG" };
      return { mpg: 32, label: "32 MPG" };
    }

    if (cat.includes("economy") || cat.includes("mini"))
      return { mpg: 35, label: "35 MPG" };
    if (cat.includes("compact")) return { mpg: 32, label: "32 MPG" };
    if (cat.includes("mid") || cat.includes("intermediate"))
      return { mpg: 28, label: "28 MPG" };
    if (cat.includes("standard")) return { mpg: 26, label: "26 MPG" };
    if (cat.includes("full") || cat.includes("large"))
      return { mpg: 24, label: "24 MPG" };
    if (cat.includes("premium")) return { mpg: 22, label: "22 MPG" };
    if (cat.includes("luxury")) return { mpg: 20, label: "20 MPG" };
    if (cat.includes("suv")) return { mpg: 22, label: "22 MPG" };
    if (cat.includes("minivan") || cat.includes("van"))
      return { mpg: 22, label: "22 MPG" };
    if (cat.includes("convertible")) return { mpg: 24, label: "24 MPG" };
    if (cat.includes("sports") || cat.includes("exotic"))
      return { mpg: 18, label: "18 MPG" };
    if (cat.includes("pickup") || cat.includes("truck"))
      return { mpg: 18, label: "18 MPG" };

    if (fuel.includes("diesel")) return { mpg: 30, label: "30 MPG" };
    if (
      !fuel ||
      fuel.includes("petrol") ||
      fuel.includes("gas") ||
      fuel.includes("gasoline")
    )
      return { mpg: 28, label: "28 MPG" };
    return null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAdd = async (rate: any) => {
    setAddingId(rate.id);
    try {
      const carData = mapRateToCarData(
        rate,
        pickupLocation,
        dropoffLocation || pickupLocation,
      );
      carData.pickup_at = new Date(
        `${pickupDate}T${rate.pickup_time || "10:00"}`,
      ).toISOString();
      carData.dropoff_at = new Date(
        `${dropoffDate}T${rate.dropoff_time || "10:00"}`,
      ).toISOString();
      await onAdd(carData);
    } finally {
      setAddingId(null);
    }
  };

  const toggleSupplier = (s: string) => {
    setSupplierFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };
  const toggleCategory = (c: string) => {
    setCategoryFilter((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const mileageLabel = (mileage: any) => {
    if (!mileage) return null;
    if (mileage.type === "unlimited") return "Unlimited mileage";
    if (mileage.type === "limited")
      return `${mileage.limit} ${mileage.unit === "kilometres" ? "km" : "mi"}`;
    return null;
  };

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "daily-asc", label: "Daily Rate: Low to High" },
    { value: "daily-desc", label: "Daily Rate: High to Low" },
  ];

  const hasActiveFilters =
    supplierFilter.length > 0 || categoryFilter.length > 0 || minYear !== '' || minMpg !== '';

  return (
    <div className="space-y-4">
      {/* Search form (collapsed by default) */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-gray-700">Search options</p>
            <button
              onClick={() => setShowForm(false)}
              className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-3">
            <div className="md:col-span-2">
              <FieldLabel>Pickup location</FieldLabel>
              <Input
                value={pickupLocation}
                onChange={setPickupLocation}
                placeholder="City or airport"
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Dropoff location</FieldLabel>
              <Input
                value={dropoffLocation}
                onChange={setDropoffLocation}
                placeholder="Same as pickup if blank"
              />
            </div>
            <div>
              <FieldLabel>Pickup date</FieldLabel>
              <DateInput
                value={pickupDate}
                onChange={handlePickupDateChange}
                min={pickupMin}
                max={pickupMax}
              />
            </div>
            <div>
              <FieldLabel>Dropoff date</FieldLabel>
              <DateInput
                value={dropoffDate}
                onChange={setDropoffDate}
                min={dropoffMin}
                max={dropoffMax}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit search toggle */}
      {!showForm && hasResults && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="group inline-flex items-center gap-1 text-[12px] font-medium text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Search size={12} />
            Change search
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {/* No results / error */}
      {!isLoading && !hasResults && searchEnabled && (
        <div className="text-center py-12">
          <Search size={22} className="mx-auto text-gray-300 mb-3" />
          {apiError ? (
            <>
              <p className="text-[13px] text-red-600 font-medium">
                Search failed
              </p>
              <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                {apiError}
              </p>
            </>
          ) : (
            <>
              <p className="text-[13px] text-gray-500">
                No car rentals found for this location and dates.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Try a different location or adjust your dates.
              </p>
            </>
          )}
          {onAddManually && (
            <button
              onClick={onAddManually}
              className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition"
            >
              <Plus size={13} /> Add manually
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition"
          >
            <Search size={13} /> Change search
          </button>
        </div>
      )}

      {/* Empty (no search yet) */}
      {!isLoading && !hasResults && !searchEnabled && (
        <div className="text-center py-12">
          <Car size={22} className="mx-auto text-gray-300 mb-3" />
          <p className="text-[13px] text-gray-500">
            Search car rentals for your trip
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            Set your pickup location and dates to find available cars.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition"
          >
            <Search size={13} /> Set search
          </button>
          {onAddManually && (
            <button
              onClick={onAddManually}
              className="mt-2 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition"
            >
              <Plus size={13} /> Add manually
            </button>
          )}
        </div>
      )}

      {/* Results toolbar + list */}
      {hasResults && (
        <>
          {/* Toolbar: count + sort + filter toggle */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-gray-500">
              <span className="font-semibold text-gray-900">
                {allRates.length}
              </span>{" "}
              cars available
              {rates.length < allRates.length && (
                <span className="text-gray-400">
                  {" "}
                  · <span className="font-medium">{rates.length}</span> shown
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="relative">
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="appearance-none text-[12px] h-8 pl-2.5 pr-7 rounded-lg border border-gray-200 bg-white text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ArrowUpDown
                  size={12}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`text-[12px] h-8 px-3 rounded-lg border transition ${
                  hasActiveFilters
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                Filters
                {hasActiveFilters &&
                  ` (${supplierFilter.length + categoryFilter.length + (minYear !== '' ? 1 : 0) + (minMpg !== '' ? 1 : 0)})`}
              </button>
            </div>
          </div>

          {/* Filter panels */}
          {showFilters && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
              {/* Supplier filter */}
              {suppliers.length > 1 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Supplier
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {suppliers.map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleSupplier(s)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                          supplierFilter.includes(s)
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                    {supplierFilter.length > 0 && (
                      <button
                        onClick={() => setSupplierFilter([])}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                      >
                        <X size={10} /> Clear
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Category filter */}
              {categories.length > 1 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Category
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => toggleCategory(c)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                          categoryFilter.includes(c)
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {c.replace(/([a-z])([A-Z])/g, "$1 $2")}
                      </button>
                    ))}
                    {categoryFilter.length > 0 && (
                      <button
                        onClick={() => setCategoryFilter([])}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                      >
                        <X size={10} /> Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Year filter */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Min Year
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1900}
                    max={2030}
                    value={minYear}
                    onChange={(e) => setMinYear(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 2020"
                    className="w-28 text-[12px] h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  {minYear !== '' && (
                    <button
                      onClick={() => setMinYear('')}
                      className="text-[11px] px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                    >
                      <X size={10} /> Clear
                    </button>
                  )}
                </div>
              </div>

              {/* MPG filter */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Min MPG
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={minMpg}
                      onChange={(e) => setMinMpg(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 30"
                      className="w-28 text-[12px] h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    {minMpg !== '' && (
                      <button
                        onClick={() => setMinMpg('')}
                        className="text-[11px] px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
                      >
                        <X size={10} /> Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[20, 30, 40].map((val) => (
                      <button
                        key={val}
                        onClick={() => setMinMpg(minMpg === val ? '' : val)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                          minMpg === val
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {val}+ MPG
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rate grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {paginatedRates.map((rate: any) => {
              const dailyPrice = parseFloat(rate.daily_amount) || 0;
              const totalPrice = parseFloat(rate.total_amount) || 0;
              const mpg = getMpg(rate);
              return (
                <div
                  key={rate.id}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  {/* Image */}
                  <div className="relative">
                    <CarRateImage
                      src={rate.images?.[0]}
                      alt={rate.vehicle || rate.supplier}
                    />
                    {/* Brand logo overlay */}
                    {rate.supplier_logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rate.supplier_logo}
                        alt={rate.supplier}
                        className="absolute top-2 left-2 h-5 w-auto max-w-[60px] object-contain bg-white/80 rounded px-1 py-0.5"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3.5">
                    {/* Supplier */}
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">
                      {cleanSupplierName(rate.supplier)}
                    </p>

                    {/* Vehicle name */}
                    <h3 className="text-[14px] font-semibold text-gray-900 truncate leading-tight">
                      {mpg?.year ? `${mpg.year} ` : ""}
                      {rate.vehicle || rate.category || "Vehicle"}
                    </h3>

                    {/* Category + location */}
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                      {rate.category?.replace(/([a-z])([A-Z])/g, "$1 $2")}
                      {rate.category && rate.pickup_name ? " · " : ""}
                      {rate.pickup_name && rate.pickup_name !== pickupLocation
                        ? rate.pickup_name
                        : ""}
                    </p>

                    {/* Specs tags */}
                    <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                      {rate.passengers && (
                        <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                          <Users size={9} /> {rate.passengers}
                        </span>
                      )}
                      {rate.transmission && (
                        <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {rate.transmission === "Automatic"
                            ? "Auto"
                            : rate.transmission}
                        </span>
                      )}
                      {rate.fuel && (
                        <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                          <Fuel size={9} />{" "}
                          {rate.fuel.replace(/^(\w)/, (m: string) =>
                            m.toUpperCase(),
                          )}
                        </span>
                      )}
                      {mpg && (
                        <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {mpg.label}
                        </span>
                      )}
                      {mileageLabel(rate.mileage)
                        ?.toString()
                        .includes("Unlimited") && (
                        <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          Unlimited mi
                        </span>
                      )}
                      {rate.baggage && (
                        <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {rate.baggage} bags
                        </span>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100 my-3" />

                    {/* Price + CTA row */}
                    <div className="flex items-center justify-between">
                      <div>
                        {dailyPrice > 0 && (
                          <p className="text-[11px] text-gray-400 leading-none">
                            ${dailyPrice}
                            <span className="text-[9px]">/day</span>
                          </p>
                        )}
                        <p className="text-[17px] font-bold text-gray-900 tabular-nums leading-none mt-0.5">
                          {rate.total_currency === "USD"
                            ? "$"
                            : rate.total_currency + " "}
                          {totalPrice.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                      <PrimaryButton
                        onClick={() => handleAdd(rate)}
                        busy={addingId === rate.id}
                      >
                        {addingId === rate.id ? "" : "Add"}
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
              <button
                onClick={() => setPage(Math.max(1, safePage - 1))}
                disabled={safePage <= 1}
                className="text-[12px] h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 disabled:opacity-30 disabled:cursor-default transition"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (safePage <= 4) {
                  pageNum = i + 1;
                } else if (safePage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = safePage - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`text-[12px] h-8 min-w-[32px] px-2 rounded-lg border transition ${
                      safePage === pageNum
                        ? "bg-gray-900 text-white border-gray-900 font-medium"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage >= totalPages}
                className="text-[12px] h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 disabled:opacity-30 disabled:cursor-default transition"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
