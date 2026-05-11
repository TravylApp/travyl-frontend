# Transit Auto-Suggest Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-detect consecutive location pairs from the trip itinerary, query OTP transit routing for each pair on page load, and display results organized by day with one-click saving.

**Architecture:** A `detectRoutePairs()` utility extracts consecutive location pairs (including hotels) from `useItineraryScreen` data. Each pair gets its own React Query that fetches OTP results via the existing API proxy. Results render in new components (`TransitRoutePairCard`, `TransitDaySection`, `TransitBetweenDaysSection`) inside the modified `TransitsModule`. Cached 30 min, concurrency-limited to 4 parallel requests via `p-limit`.

**Tech Stack:** Next.js 16, React 19, TypeScript, React Query, lucide-react, p-limit, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-05-07-transit-auto-suggest-design.md`

---

## Chunk 1: Prerequisites — Add Coordinates to ViewModels

### Task 1: Add lat/lng to ActivityViewModel + buildActivityViewModel

**Files:**
- Modify: `packages/shared/src/viewmodels/itineraryViewModel.ts:73-104` (ActivityViewModel interface)
- Modify: `packages/shared/src/viewmodels/itineraryViewModel.ts:113-139` (buildActivityViewModel)
- Test: N/A (view model types — verify with `npm run typecheck`)

- [ ] **Step 1: Add latitude/longitude to ActivityViewModel interface**

Add after line 101 (the `source` field):
```ts
  /** Latitude of the activity location, or null */
  latitude: number | null;
  /** Longitude of the activity location, or null */
  longitude: number | null;
```

- [ ] **Step 2: Add latitude/longitude to buildActivityViewModel return**

Add before `source:` in the return object (line 136):
```ts
    latitude: activity.latitude ?? null,
    longitude: activity.longitude ?? null,
```

- [ ] **Step 3: Add latitude/longitude to HotelViewModel interface**

Add after `bookingRef` (line 354):
```ts
  /** Latitude of the hotel, or null */
  latitude: number | null;
  /** Longitude of the hotel, or null */
  longitude: number | null;
```

- [ ] **Step 4: Add latitude/longitude to buildHotelViewModel return**

Add before `bookingRef:` in the return object (line 404):
```ts
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors. If errors appear in files referencing `ActivityViewModel` or `HotelViewModel`, fix missing lat/lng fields.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/viewmodels/itineraryViewModel.ts
git commit -m "feat: add latitude/longitude to ActivityViewModel and HotelViewModel"
```

---

### Task 2: Normalize lat/lng in useItineraryScreen trip_context fallback

**Files:**
- Modify: `packages/shared/src/hooks/useItineraryScreen.ts:180-181`

- [ ] **Step 1: Replace lat/lng with latitude/longitude in buildDaysFromContext**

In `buildDaysFromContext`, change:
```ts
      lat: slot.poi?.lat ?? null,
      lng: slot.poi?.lng ?? null,
```
to:
```ts
      latitude: slot.poi?.lat ?? null,
      longitude: slot.poi?.lng ?? null,
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/hooks/useItineraryScreen.ts
git commit -m "fix: normalize lat/lng to latitude/longitude in trip_context fallback"
```

---

## Chunk 2: Route Pair Detection Utility

### Task 3: Create detectRoutePairs utility

**Files:**
- Create: `apps/web/components/trip/transit/detectRoutePairs.ts`

- [ ] **Step 1: Write the detectRoutePairs function**

Create `apps/web/components/trip/transit/detectRoutePairs.ts`:

```ts
import type { ItineraryDayViewModel, HotelViewModel, TransitSegment } from '@travyl/shared';

export interface RoutePair {
  id: string;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  dayIndex: number;
  type: 'within-day' | 'cross-day';
  departureTime: string;
}

const KM_THRESHOLD = 0.1; // 100m in km — used to detect "same location"

function coordsEqual(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): boolean {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aCalc =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
  return R * c < KM_THRESHOLD;
}

function pairId(dayIndex: number, o: { lat: number; lng: number }, d: { lat: number; lng: number }) {
  return `${dayIndex}:${o.lat.toFixed(4)},${o.lng.toFixed(4)}>${d.lat.toFixed(4)},${d.lng.toFixed(4)}`;
}

function isoDateFromDayIndex(startDate: string, dayIndex: number): string {
  const d = new Date(startDate + 'T00:00:00');
  d.setDate(d.getDate() + dayIndex);
  return d.toISOString().split('T')[0];
}

interface LocationItem {
  lat: number;
  lng: number;
  label: string;
}

export function detectRoutePairs(
  tripStartDate: string | undefined,
  days: ItineraryDayViewModel[],
  hotels: HotelViewModel[],
  transitBookings: TransitSegment[],
): RoutePair[] {
  if (!tripStartDate || days.length === 0) return [];

  const seenIds = new Set<string>();
  const pairs: RoutePair[] = [];

  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const day = days[dayIdx];
    const dayDate = isoDateFromDayIndex(tripStartDate, dayIdx);

    // Find hotel for this day
    const hotel = hotels.find((h) => {
      if (!h.latitude || !h.longitude) return false;
      return dayDate >= h.checkIn && dayDate < h.checkOut;
    });

    // Collect all locations for this day: hotel (optional) + activities with coords
    const locations: LocationItem[] = [];

    if (hotel) {
      locations.push({ lat: hotel.latitude, lng: hotel.longitude, label: hotel.name });
    }

    for (const group of day.timeGroups) {
      for (const activity of group.activities) {
        if (activity.latitude != null && activity.longitude != null) {
          locations.push({
            lat: activity.latitude,
            lng: activity.longitude,
            label: activity.locationName ?? activity.name,
          });
        }
      }
    }

    if (hotel && locations.length > 1) {
      // Hotel is already first — make sure it's also last (return to hotel)
      locations.push({ lat: hotel.latitude!, lng: hotel.longitude!, label: hotel.name });
    }

    // Build consecutive pairs within this day
    for (let i = 0; i < locations.length - 1; i++) {
      const o = locations[i];
      const d = locations[i + 1];

      // Skip same-location pairs
      if (coordsEqual(o, d)) continue;

      const id = pairId(dayIdx, o, d);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      pairs.push({
        id,
        origin: { lat: o.lat, lng: o.lng, label: o.label },
        destination: { lat: d.lat, lng: d.lng, label: d.label },
        dayIndex: dayIdx,
        type: 'within-day',
        departureTime: `${dayDate}T12:00:00`,
      });
    }

    // Cross-day: last location of this day → first location of next day
    if (dayIdx < days.length - 1 && locations.length > 0) {
      const lastLoc = locations[locations.length - 1];
      const nextDay = days[dayIdx + 1];
      const nextDayDate = isoDateFromDayIndex(tripStartDate, dayIdx + 1);

      // Find first location of next day (hotel or first activity with coords)
      const nextHotel = hotels.find((h) => {
        if (!h.latitude || !h.longitude) return false;
        return nextDayDate >= h.checkIn && nextDayDate < h.checkOut;
      });

      let firstNextLocation: LocationItem | null = null;

      if (nextHotel) {
        firstNextLocation = { lat: nextHotel.latitude!, lng: nextHotel.longitude!, label: nextHotel.name };
      } else {
        for (const group of nextDay.timeGroups) {
          for (const activity of group.activities) {
            if (activity.latitude != null && activity.longitude != null) {
              firstNextLocation = {
                lat: activity.latitude,
                lng: activity.longitude,
                label: activity.locationName ?? activity.name,
              };
              break;
            }
          }
          if (firstNextLocation) break;
        }
      }

      if (firstNextLocation && !coordsEqual(lastLoc, firstNextLocation)) {
        const id = pairId(dayIdx, lastLoc, firstNextLocation);
        if (!seenIds.has(id)) {
          seenIds.add(id);
          pairs.push({
            id,
            origin: { lat: lastLoc.lat, lng: lastLoc.lng, label: lastLoc.label },
            destination: { lat: firstNextLocation.lat, lng: firstNextLocation.lng, label: firstNextLocation.label },
            dayIndex: dayIdx,
            type: 'cross-day',
            departureTime: `${nextDayDate}T09:00:00`,
          });
        }
      }
    }
  }

  return pairs;
}
```

Note: The "skip already-booked" filter is handled externally — saved pairs are tracked via a `dismissedPairs` state set in `TransitsModule` that filters them from the display. See Task 7.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/trip/transit/detectRoutePairs.ts
git commit -m "feat: create detectRoutePairs utility for transit auto-suggest"
```

---

## Chunk 3: New UI Components

### Task 4: Create TransitRoutePairCard component

**Files:**
- Create: `apps/web/components/trip/transit/TransitRoutePairCard.tsx`

- [ ] **Step 1: Write TransitRoutePairCard**

Create `apps/web/components/trip/transit/TransitRoutePairCard.tsx`:

```tsx
'use client';
import React from 'react';
import { Train, Bus, Ship, CableCar, ArrowRight, Loader2 } from 'lucide-react';
import type { TransitDirectionResult } from '@travyl/shared';

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
  train: <Train size={14} />,
  bus: <Bus size={14} />,
  subway: <Train size={14} />,
  tram: <Train size={14} />,
  light_rail: <Train size={14} />,
  ferry: <Ship size={14} />,
  cable_car: <CableCar size={14} />,
  funicular: <CableCar size={14} />,
};

const VEHICLE_COLORS: Record<string, string> = {
  train: '#10B981',
  bus: '#F59E0B',
  subway: '#3B82F6',
  tram: '#8B5CF6',
  light_rail: '#8B5CF6',
  ferry: '#06B6D4',
  cable_car: '#EC4899',
  funicular: '#EC4899',
};

interface TransitRoutePairCardProps {
  originLabel: string;
  destinationLabel: string;
  isLoading: boolean;
  results: TransitDirectionResult[];
  error: string | null;
  onAddResult: (result: TransitDirectionResult) => void;
  onRetry: () => void;
}

export function TransitRoutePairCard({
  originLabel,
  destinationLabel,
  isLoading,
  results,
  error,
  onAddResult,
  onRetry,
}: TransitRoutePairCardProps) {
  // Show best 3 results sorted by duration
  const topResults = [...results].sort((a, b) => a.total_duration_minutes - b.total_duration_minutes).slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      {/* Route label */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-gray-900 dark:text-white mb-3">
        <span className="truncate">{originLabel}</span>
        <ArrowRight size={14} className="shrink-0 text-gray-400" />
        <span className="truncate">{destinationLabel}</span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={14} className="animate-spin text-gray-400" />
          <span className="text-[13px] text-gray-500">Finding routes...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-center justify-between py-1">
          <span className="text-[12px] text-red-500">Could not load routes</span>
          <button
            onClick={onRetry}
            className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* No results */}
      {!isLoading && !error && topResults.length === 0 && results.length === 0 && (
        <p className="text-[13px] text-gray-500 dark:text-gray-400 py-1">No transit routes found</p>
      )}

      {/* Results */}
      {!isLoading && topResults.length > 0 && (
        <div className="space-y-2">
          {topResults.map((result) => {
            const mode = result.steps[0]?.mode ?? 'train';
            const color = VEHICLE_COLORS[mode] ?? '#6B7280';
            const line = result.steps.map(s => s.line).filter(Boolean).join(' → ');
            return (
              <div
                key={result.id}
                className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span style={{ color }}>{VEHICLE_ICONS[mode] ?? <Train size={14} />}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                      {result.total_duration_minutes} min
                    </span>
                    {result.fare && (
                      <span className="text-[12px] text-gray-500">
                        {result.fare.currency} {result.fare.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {line && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{line}</p>
                  )}
                </div>
                <button
                  onClick={() => onAddResult(result)}
                  className="shrink-0 px-2.5 h-7 rounded-lg text-[11px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
                  style={{ backgroundColor: 'var(--trip-base, #003594)' }}
                >
                  Add
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/trip/transit/TransitRoutePairCard.tsx
git commit -m "feat: create TransitRoutePairCard component"
```

---

### Task 5: Create TransitDaySection and TransitBetweenDaysSection

**Files:**
- Create: `apps/web/components/trip/transit/TransitDaySection.tsx`
- Create: `apps/web/components/trip/transit/TransitBetweenDaysSection.tsx`

- [ ] **Step 1: Create TransitDaySection**

Create `apps/web/components/trip/transit/TransitDaySection.tsx`:

```tsx
'use client';
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface TransitDaySectionProps {
  dayLabel: string;
  dateLabel: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function TransitDaySection({ dayLabel, dateLabel, children, defaultOpen = true }: TransitDaySectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-2 group"
      >
        <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{dayLabel}</span>
        <span className="text-[12px] text-gray-500 dark:text-gray-400">{dateLabel}</span>
        <ChevronDown
          size={14}
          className={`ml-auto text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create TransitBetweenDaysSection**

Create `apps/web/components/trip/transit/TransitBetweenDaysSection.tsx`:

```tsx
import React from 'react';

interface TransitBetweenDaysSectionProps {
  children: React.ReactNode;
}

export function TransitBetweenDaysSection({ children }: TransitBetweenDaysSectionProps) {
  const childArray = React.Children.toArray(children);
  if (childArray.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 mb-3">Between Days</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/trip/transit/TransitDaySection.tsx apps/web/components/trip/transit/TransitBetweenDaysSection.tsx
git commit -m "feat: create TransitDaySection and TransitBetweenDaysSection"
```

---

## Chunk 4: Integration

### Task 6: Install p-limit

- [ ] **Step 1: Install p-limit in apps/web**

Run: `npm install --workspace=apps/web p-limit@^5.0.0`
Expected: Added to `apps/web/package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json
git commit -m "chore: add p-limit dependency"
```

---

### Task 7: Integrate auto-suggest into TransitsModule

**Files:**
- Modify: `apps/web/components/trip/transit/TransitsModule.tsx` — accept `days`/`hotels` props, integrate auto-suggest flow, fix empty state, update mutation `onSuccess`

This is the largest task. The module gets new props, runs `detectRoutePairs`, fires OTP queries per pair with concurrency control, and renders the suggestion sections.

- [ ] **Step 1: Update TransitsModule props and imports**

Add imports at the top:
```tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import pLimit from 'p-limit';
import { detectRoutePairs, type RoutePair } from './detectRoutePairs';
import { TransitRoutePairCard } from './TransitRoutePairCard';
import { TransitDaySection } from './TransitDaySection';
import { TransitBetweenDaysSection } from './TransitBetweenDaysSection';
import type { ItineraryDayViewModel, HotelViewModel, TransitDirectionResult } from '@travyl/shared';
```

Update the component props to accept `days` and `hotels`:
```tsx
interface TransitsModuleProps {
  tripId: string;
  defaultCurrency?: string;
  days?: ItineraryDayViewModel[];
  hotels?: HotelViewModel[];
  tripStartDate?: string;
}
```

Update the destructuring:
```tsx
export function TransitsModule({ tripId, defaultCurrency = 'USD', days = [], hotels = [], tripStartDate }: TransitsModuleProps) {
```

Add after the existing `useQuery` calls (after line 40):
```tsx
  // Auto-suggest: detect route pairs and fetch OTP results
  const routePairs = useMemo(
    () => detectRoutePairs(tripStartDate, days, hotels, rawBookings),
    [tripStartDate, days, hotels, rawBookings],
  );
```

- [ ] **Step 2: Add OTP suggestion fetching with p-limit**

Add this after the existing state declarations (after line 52):
```tsx
  const [suggestionResults, setSuggestionResults] = useState<Record<string, TransitDirectionResult[]>>({});
  const [suggestionLoading, setSuggestionLoading] = useState<Record<string, boolean>>({});
  const [suggestionErrors, setSuggestionErrors] = useState<Record<string, string | null>>({});
  const [dismissedPairIds, setDismissedPairIds] = useState<Set<string>>(new Set());
  const routePairsVersionRef = useRef(0);

  // Track routePairs identity changes for re-fetching
  const routePairsKey = routePairs.map(p => p.id).join(',');

  // Fetch OTP results for all route pairs with concurrency limit
  useEffect(() => {
    if (routePairs.length === 0) return;

    const currentVersion = ++routePairsVersionRef.current;

    const limit = pLimit(4);
    const fetchPromises = routePairs.map((pair) =>
      limit(async () => {
        setSuggestionLoading((prev) => ({ ...prev, [pair.id]: true }));
        try {
          const supabase = getSupabaseBrowser();
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token ?? '';

          const response = await fetch(
            `/api/transit/directions?origin_lat=${pair.origin.lat}&origin_lng=${pair.origin.lng}` +
            `&dest_lat=${pair.destination.lat}&dest_lng=${pair.destination.lng}` +
            `&departure_time=${encodeURIComponent(pair.departureTime)}`,
            { headers: { authorization: `Bearer ${token}` } }
          );

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Search failed');
          }

          const results: TransitDirectionResult[] = await response.json();
          // Only apply if this is still the latest fetch (not stale)
          if (currentVersion === routePairsVersionRef.current) {
            setSuggestionResults((prev) => ({ ...prev, [pair.id]: results }));
            setSuggestionErrors((prev) => ({ ...prev, [pair.id]: null }));
          }
        } catch (err: any) {
          if (currentVersion === routePairsVersionRef.current) {
            setSuggestionErrors((prev) => ({ ...prev, [pair.id]: err.message }));
          }
        } finally {
          if (currentVersion === routePairsVersionRef.current) {
            setSuggestionLoading((prev) => ({ ...prev, [pair.id]: false }));
          }
        }
      })
    );

    Promise.all(fetchPromises).catch(() => {});
  }, [routePairsKey]);
```

- [ ] **Step 3: Add handleAddFromSuggestion + update mutation onSuccess**

Update `addMutation` to add the saved pair's ID to `dismissedPairs`:
```tsx
  const addMutation = useMutation({
    mutationFn: (data: TransitData) => addTransit(tripId, { trip_id: tripId, data }),
    onSuccess: () => {
      setAdding(false);
      invalidate();
    },
  });
```

Also update `handleAddFromSuggestion` to dismiss the pair after a successful save:
```tsx
  async function handleAddFromSuggestion(pairId: string, result: TransitDirectionResult) {
    const pair = routePairs.find((p) => p.id === pairId);
    if (!pair) return;

    try {
      await addMutation.mutateAsync({
        vehicleType: result.steps[0]?.mode ?? 'train',
        provider: result.steps[0]?.carrier ?? '',
        routeName: result.steps.map((s) => s.line).filter(Boolean).join(' → ') || 'Transit route',
        originLabel: pair.origin.label,
        destinationLabel: pair.destination.label,
        departureAt: result.departure_at,
        arrivalAt: result.arrival_at,
        price: result.fare?.amount ?? null,
        currency: result.fare?.currency ?? 'USD',
        bookingRef: null,
        confirmationCode: null,
        notes: null,
      });
      // Dismiss the pair so it disappears from suggestions immediately
      setDismissedPairIds(prev => new Set(prev).add(pairId));
    } catch {
      // Error toast is handled by React Query
    }
  }
```

- [ ] **Step 5: Update the empty state conditional**

Replace the existing empty state (lines 157-171) to check both bookings AND route pairs:
```tsx
  if (bookings.length === 0 && !adding && routePairs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[15px] font-medium text-gray-900 dark:text-white">No transit bookings yet</p>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Add a transit leg to your trip</p>
        <button
          onClick={() => setAdding(true)}
          className="mt-4 px-4 h-9 rounded-xl text-[13px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'var(--trip-base)' }}
        >
          Add Transit
        </button>
      </div>
    );
  }
```

- [ ] **Step 6: Add the suggestion sections to the render**

Before the `{bookings.length > 0 && (...)}` section, add:
```tsx
      {/* Auto-suggestions */}
      {routePairs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-4">Suggested Routes</h2>
          {renderSuggestions()}
        </div>
      )}
```

And add the `renderSuggestions` helper function inside the component:
```tsx
  function renderSuggestions() {
    // Filter out dismissed (saved) pairs
    const visiblePairs = routePairs.filter(p => !dismissedPairIds.has(p.id));

    if (visiblePairs.length === 0) return null;

    const byDay: Record<number, RoutePair[]> = {};
    const crossDay: RoutePair[] = [];

    for (const pair of visiblePairs) {
      if (pair.type === 'cross-day') {
        crossDay.push(pair);
      } else {
        if (!byDay[pair.dayIndex]) byDay[pair.dayIndex] = [];
        byDay[pair.dayIndex].push(pair);
      }
    }

    return (
      <>
        {days.map((day, idx) => {
          const dayPairs = byDay[idx];
          if (!dayPairs || dayPairs.length === 0) return null;
          return (
            <TransitDaySection key={idx} dayLabel={day.dayLabel} dateLabel={day.dateLabel}>
              {dayPairs.map((pair) => (
                <TransitRoutePairCard
                  key={pair.id}
                  originLabel={pair.origin.label}
                  destinationLabel={pair.destination.label}
                  isLoading={!!suggestionLoading[pair.id]}
                  results={suggestionResults[pair.id] ?? []}
                  error={suggestionErrors[pair.id] ?? null}
                  onAddResult={(result) => handleAddFromSuggestion(pair.id, result)}
                  onRetry={() => {
                    setSuggestionErrors((prev) => ({ ...prev, [pair.id]: null }));
                    // Re-fetch this specific pair by clearing its error + result
                    setSuggestionResults((prev) => {
                      const next = { ...prev };
                      delete next[pair.id];
                      return next;
                    });
                    // Re-trigger the fetch effect for this pair
                    routePairsVersionRef.current++;
                  }}
                />
              ))}
            </TransitDaySection>
          );
        })}
        {crossDay.length > 0 && (
          <TransitBetweenDaysSection>
            {crossDay.map((pair) => (
              <TransitRoutePairCard
                key={pair.id}
                originLabel={pair.origin.label}
                destinationLabel={pair.destination.label}
                isLoading={!!suggestionLoading[pair.id]}
                results={suggestionResults[pair.id] ?? []}
                error={suggestionErrors[pair.id] ?? null}
                onAddResult={(result) => handleAddFromSuggestion(pair.id, result)}
                onRetry={() => {
                  setSuggestionErrors((prev) => ({ ...prev, [pair.id]: null }));
                  setSuggestionResults((prev) => {
                    const next = { ...prev };
                    delete next[pair.id];
                    return next;
                  });
                  routePairsVersionRef.current++;
                }}
              />
            ))}
          </TransitBetweenDaysSection>
        )}
      </>
    );
  }
```

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/trip/transit/TransitsModule.tsx
git commit -m "feat: integrate transit auto-suggest into TransitsModule"
```

---

### Task 8: Update transit page to pass days/hotels

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/transit/page.tsx`

- [ ] **Step 1: Pass days and hotels to TransitsModule**

Update the page to extract `days` and `hotels` from `useItineraryScreen` and pass them to `TransitsModule`:

```tsx
export default function TransitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading, trip, days, hotels } = useItineraryScreen(id);
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD';
  const tripStartDate = (trip as any)?.start_date as string | undefined;

  // ... (loading state unchanged) ...

  return (
    // ... (header unchanged) ...
      <TransitsModule
        tripId={id}
        defaultCurrency={tripCurrency}
        days={days}
        hotels={hotels}
        tripStartDate={tripStartDate}
      />
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/trip/\[id\]/transit/page.tsx
git commit -m "feat: pass days and hotels to TransitsModule from transit page"
```

---

## Verification

### Task 9: Verify the build

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: Pass with no errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: No lint errors in changed files.

- [ ] **Step 3: Dev server smoke test**

Run: `npm run web`
Expected: App starts, transit page loads, no console errors. If a trip has itinerary activities with coordinates, suggestion cards appear with loading → OTP results.
