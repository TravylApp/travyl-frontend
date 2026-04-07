# Home Currency Conversion — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all trip cost displays (budget, activities, flights, hotels) to the user's home currency silently.

**Architecture:** Swap the exchange rate provider from Frankfurter (30 currencies) to open.er-api.com (150+). Expand the settings store currency type from 7 codes to any ISO 4217 string. Add a `useHomeCurrency()` hook that combines settings + rates + formatting. Wire it into view models (via raw cost fields) and budget components.

**Tech Stack:** React Query, Zustand, Intl.NumberFormat, Next.js API routes

**Spec:** `docs/superpowers/specs/2026-03-27-home-currency-conversion-design.md`

---

## Chunk 1: Data Layer — Provider Swap + Type Expansion + Hook

### Task 1: Swap exchange rate API from Frankfurter to open.er-api.com

**Files:**
- Modify: `apps/web/app/api/exchange-rates/route.ts`

- [ ] **Step 1: Update the route to use open.er-api.com with Frankfurter fallback**

```typescript
import { NextRequest } from 'next/server'
import { errorResponse, jsonResponse, requireParam, MissingParamError, CACHE_24H } from '@/app/api/lib/response'

const FALLBACK_URL = 'https://api.frankfurter.app'

export async function GET(req: NextRequest) {
  try {
    const base = requireParam(req.nextUrl.searchParams, 'base', 'e.g. USD')
    const primaryUrl = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`

    let res = await fetch(primaryUrl, CACHE_24H)

    // Fallback to Frankfurter if primary is down
    if (!res.ok) {
      res = await fetch(
        `${FALLBACK_URL}/latest?from=${encodeURIComponent(base)}`,
        CACHE_24H,
      )
    }

    if (!res.ok) return errorResponse('Exchange rate fetch failed', 502)
    const data = (await res.json()) as { rates: Record<string, number> }
    return jsonResponse({ rates: data.rates }, 86400)
  } catch (err) {
    if (err instanceof MissingParamError) return errorResponse(err.message, 400)
    return errorResponse('Internal error', 500)
  }
}
```

- [ ] **Step 2: Verify the route works**

Run: `curl -s "http://localhost:3000/api/exchange-rates?base=USD" | head -c 200`
Expected: JSON with `rates` object containing THB, VND, EUR, etc.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/exchange-rates/route.ts
git commit -m "feat: swap exchange rate provider from Frankfurter to open.er-api.com"
```

---

### Task 2: Expand Currency type in settings store

**Files:**
- Modify: `packages/shared/src/stores/settingsStore.ts`
- Create: `packages/shared/src/config/currencies.ts`
- Modify: `packages/shared/src/config/index.ts` (add re-export of CURRENCIES)

- [ ] **Step 1: Create the CURRENCIES constant**

Create `packages/shared/src/config/currencies.ts` with all ~150 ISO 4217 currencies:

```typescript
export interface CurrencyInfo {
  code: string
  name: string
  symbol: string
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: 'CN¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'CO$' },
  { code: 'ARS', name: 'Argentine Peso', symbol: 'AR$' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CL$' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/.' },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U' },
  { code: 'CRC', name: 'Costa Rican Colon', symbol: '₡' },
  { code: 'ISK', name: 'Icelandic Krona', symbol: 'kr' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  // Include all remaining ISO 4217 currencies (complete the list in implementation)
]
```

- [ ] **Step 2: Re-export from config barrel**

Add to `packages/shared/src/config/index.ts`:
```typescript
export { CURRENCIES, type CurrencyInfo } from './currencies'
```

- [ ] **Step 3: Update settingsStore Currency type**

In `packages/shared/src/stores/settingsStore.ts`, replace:

```typescript
// Before (lines 7, 11, 25-27, 50, 84-87, 111-113, 15-16):
export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'MXN';
const VALID_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'MXN'];

function validCurrency(v: unknown): Currency {
  return VALID_CURRENCIES.includes(v as Currency) ? (v as Currency) : DEFAULTS.currency;
}

// After:
export type Currency = string;
const ISO_4217_PATTERN = /^[A-Z]{3}$/;

function validCurrency(v: unknown): Currency {
  return typeof v === 'string' && ISO_4217_PATTERN.test(v) ? v : DEFAULTS.currency;
}
```

Also update `setCurrency` to validate input:
```typescript
setCurrency: (v: string) => {
  const validated = ISO_4217_PATTERN.test(v) ? v : DEFAULTS.currency;
  set({ currency: validated });
  persistPreferences({ ...getPrefsSnapshot(get()), currency: validated });
},
```

And `SettingsState` interface:
```typescript
setCurrency: (v: string) => void;
```

Remove the now-unused `VALID_CURRENCIES` array.

- [ ] **Step 4: Verify typecheck passes**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/config/currencies.ts packages/shared/src/config/index.ts packages/shared/src/stores/settingsStore.ts
git commit -m "feat: expand Currency type to any ISO 4217 code, add CURRENCIES constant"
```

---

### Task 3: Create `useHomeCurrency` hook

**Files:**
- Create: `packages/shared/src/hooks/useHomeCurrency.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write the hook**

Create `packages/shared/src/hooks/useHomeCurrency.ts`:

```typescript
import { useCallback } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { useExchangeRates } from './useExchangeRates'
import { convertToTripCurrency } from '../utils/currency'

interface UseHomeCurrencyResult {
  /** User's home currency code (e.g. 'USD') */
  currency: string
  /** Exchange rates keyed by source currency (1 home = X foreign). Null while loading. */
  rates: Record<string, number> | null
  /** True while rates are being fetched */
  isLoading: boolean
  /**
   * Convert an amount from sourceCurrency to the user's home currency.
   * Returns the original amount if rates aren't loaded or source === home.
   */
  convert: (amount: number, sourceCurrency: string) => number
  /**
   * Convert and format an amount in the user's home currency.
   * Falls back to formatting in the source currency if rates aren't available.
   */
  format: (amount: number, sourceCurrency?: string) => string
}

export function useHomeCurrency(): UseHomeCurrencyResult {
  const currency = useSettingsStore((s) => s.currency)
  const { rates, isLoading } = useExchangeRates(currency)

  const convert = useCallback(
    (amount: number, sourceCurrency: string): number => {
      return convertToTripCurrency(amount, sourceCurrency, currency, rates)
    },
    [currency, rates],
  )

  const format = useCallback(
    (amount: number, sourceCurrency?: string): string => {
      if (!sourceCurrency) {
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency', currency, maximumFractionDigits: 0,
          }).format(amount)
        } catch {
          return `${currency} ${amount.toLocaleString()}`
        }
      }

      if (sourceCurrency === currency) {
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency', currency, maximumFractionDigits: 0,
          }).format(amount)
        } catch {
          return `${currency} ${amount.toLocaleString()}`
        }
      }

      const converted = convert(amount, sourceCurrency)

      // If conversion didn't happen (no rate), show original currency per spec Section 5
      if (converted === amount && sourceCurrency !== currency) {
        try {
          return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: sourceCurrency, maximumFractionDigits: 0,
          }).format(amount)
        } catch {
          return `${sourceCurrency} ${amount.toLocaleString()}`
        }
      }

      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency', currency, maximumFractionDigits: 0,
        }).format(converted)
      } catch {
        return `${currency} ${converted.toLocaleString()}`
      }
    },
    [convert, currency],
  )

  return { currency, rates, isLoading, convert, format }
}
```

- [ ] **Step 2: Re-export from shared index and hooks barrel**

Add to `packages/shared/src/index.ts`:
```typescript
export { useHomeCurrency } from './hooks/useHomeCurrency'
```

Also check if `packages/shared/src/hooks/index.ts` exists as a barrel file — if so, add the re-export there too.

- [ ] **Step 3: Verify typecheck passes**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/hooks/useHomeCurrency.ts packages/shared/src/index.ts
git commit -m "feat: add useHomeCurrency hook for implicit currency conversion"
```

---

## Chunk 2: View Models — Raw Cost Fields

### Task 4: Add raw cost/currency fields to view models

**Files:**
- Modify: `packages/shared/src/viewmodels/itineraryViewModel.ts`

- [ ] **Step 1: Add raw fields to ActivityViewModel interface (line 32-46)**

```typescript
export interface ActivityViewModel {
  // ... existing fields (id, name, category, locationName, startTime, endTime, timeDisplay) ...
  costDisplay: string | null;
  cost: number | null;          // NEW
  costCurrency: string | null;  // NEW
  bookingUrl: string | null;
  // ... rest of existing fields ...
}
```

- [ ] **Step 2: Populate raw fields in buildActivityViewModel (line 55-71)**

Add to the return object after `costDisplay`:

```typescript
cost: activity.estimated_cost ?? null,
costCurrency: activity.estimated_cost != null ? activity.currency : null,
```

- [ ] **Step 3: Add raw fields to FlightViewModel interface (line 123-137)**

```typescript
export interface FlightViewModel {
  // ... existing fields ...
  priceDisplay: string | null;
  price: number | null;          // NEW
  priceCurrency: string | null;  // NEW
  cabinClass: string | null;
  bookingRef: string | null;
}
```

- [ ] **Step 4: Populate raw fields in buildFlightViewModel (line 151-168)**

Add to the return object after `priceDisplay`:

```typescript
price: d.price ?? null,
priceCurrency: d.price != null ? d.currency ?? null : null,
```

- [ ] **Step 5: Add raw fields to HotelViewModel interface (line 172-187)**

```typescript
export interface HotelViewModel {
  // ... existing fields ...
  priceDisplay: string | null;
  price: number | null;          // NEW — matches priceDisplay semantics (total_price or price_per_night)
  priceCurrency: string | null;  // NEW
  rating: number | null;
  // ... rest ...
}
```

- [ ] **Step 6: Populate raw fields in buildHotelViewModel (line 194-220)**

`price` matches `priceDisplay` semantics: `total_price` if available, otherwise `price_per_night` (NOT multiplied by nights — consumers that need totals should multiply by `nights` themselves).

Add to the return object after `priceDisplay`:

```typescript
price: d.total_price ?? (d.price_per_night != null ? d.price_per_night : null),
priceCurrency: (d.total_price != null || d.price_per_night != null) ? d.currency ?? null : null,
```

- [ ] **Step 7: Verify typecheck passes**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/viewmodels/itineraryViewModel.ts
git commit -m "feat: add raw cost/currency fields to activity, flight, hotel view models"
```

---

## Chunk 3: Budget Wiring — BudgetPanel + useItineraryScreen + Standalone Page

### Task 5: Wire home currency into BudgetPanel

**Files:**
- Modify: `apps/web/components/budget/BudgetPanel.tsx`

- [ ] **Step 1: Replace trip currency with home currency**

Replace all uses of `tripCurrency` in BudgetPanel:

```typescript
// Before:
import { useTripBudget, useTrip, formatBudgetAmount } from '@travyl/shared'
const { data: trip } = useTrip(tripId)
const tripCurrency = trip?.currency ?? 'USD'
const { ... } = useTripBudget(tripId, tripCurrency)
const formatAmount = useMemo(
  () => (amount: number) => formatBudgetAmount(amount, tripCurrency),
  [tripCurrency],
)

// After:
import { useTripBudget, useHomeCurrency } from '@travyl/shared'
const { currency: homeCurrency, format: formatWithHomeCurrency } = useHomeCurrency()
const { ... } = useTripBudget(tripId, homeCurrency)
const formatAmount = useMemo(
  () => (amount: number) => formatWithHomeCurrency(amount),
  [formatWithHomeCurrency],
)
```

- [ ] **Step 2: Update all other `tripCurrency` references in this file**

Search for every `tripCurrency` occurrence in BudgetPanel.tsx and replace with `homeCurrency`. Key locations:
- `BudgetCategoryList` prop at ~line 115: `tripCurrency={tripCurrency}` → `tripCurrency={homeCurrency}`
- `activeCurrencies` memo at ~line 57 if it references `tripCurrency`
- `CurrencyFooter` component prop: pass `homeCurrency` instead of `tripCurrency`

- [ ] **Step 3: Remove unused `useTrip` import** (only if `trip` is not used elsewhere in this file)

- [ ] **Step 4: Verify typecheck passes**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/budget/BudgetPanel.tsx
git commit -m "feat: wire home currency into BudgetPanel"
```

---

### Task 6: Wire home currency into useItineraryScreen budget memo

**Files:**
- Modify: `packages/shared/src/viewmodels/budgetViewModel.ts`
- Modify: `packages/shared/src/hooks/useItineraryScreen.ts`

- [ ] **Step 1: Update buildBudgetSummary to accept rates and convert**

In `budgetViewModel.ts`, update the function signature:

```typescript
// Before:
export function buildBudgetSummary(
  days: ItineraryDayWithActivities[],
  flights: Flight[],
  hotels: Hotel[],
  currency = 'USD',
): BudgetSummary

// After:
export function buildBudgetSummary(
  days: ItineraryDayWithActivities[],
  flights: Flight[],
  hotels: Hotel[],
  currency = 'USD',
  rates: Record<string, number> | null = null,
): BudgetSummary
```

Inside the function, convert each amount before summing:
```typescript
import { convertToTripCurrency } from '../utils/currency';

// When summing activity costs:
const convertedCost = convertToTripCurrency(
  activity.estimated_cost, activity.currency, currency, rates
);

// When summing flight costs:
const convertedFlightPrice = convertToTripCurrency(
  d.price, d.currency ?? currency, currency, rates
);

// When summing hotel costs:
const convertedHotelPrice = convertToTripCurrency(
  d.total_price ?? 0, d.currency ?? currency, currency, rates
);
```

- [ ] **Step 2: Update useItineraryScreen to pass rates**

```typescript
// Add imports at top of file:
import { useSettingsStore } from '../stores/settingsStore'
import { useExchangeRates } from './useExchangeRates'

// Inside the hook body, read home currency and rates:
const homeCurrency = useSettingsStore((s) => s.currency)
const { rates } = useExchangeRates(homeCurrency)

// Update the budget memo — replace existing memo:
const budget = useMemo(() => {
  const dbBudget = buildBudgetSummary(
    daysQuery.data ?? [],
    flightsQuery.data ?? [],
    hotelsQuery.data ?? [],
    homeCurrency,
    rates,
  );
  // ... rest of memo stays the same
}, [daysQuery.data, flightsQuery.data, hotelsQuery.data, homeCurrency, rates, tripQuery.data?.trip_context]);
```

- [ ] **Step 3: Fix the hardcoded currency symbol fallback**

In `useItineraryScreen.ts` around lines 213-219, replace:

```typescript
// Before:
const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `;

// After:
const formattedAmount = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: homeCurrency,
  maximumFractionDigits: 0,
}).format(convertedAmount);
```

- [ ] **Step 4: Verify typecheck passes**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/viewmodels/budgetViewModel.ts packages/shared/src/hooks/useItineraryScreen.ts
git commit -m "feat: wire home currency conversion into buildBudgetSummary and useItineraryScreen"
```

---

### Task 7: Wire home currency into standalone budget page

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/budget/page.tsx`

- [ ] **Step 1: Add useHomeCurrency to the component**

```typescript
import { useHomeCurrency } from '@travyl/shared';

// Inside the Budget component (around line 181):
const { format: formatHome, currency: homeCurrency } = useHomeCurrency();
const tripCurrency = trip?.currency ?? trip?.trip_context?.quick_facts?.currency ?? 'USD';
```

- [ ] **Step 2: Replace all `$${...}` patterns with formatHome calls**

Search for every `$` in template literals (grep for `\$`) and replace. This is a bulk find-and-replace across ~15 locations. Every instance of `$${amount.toLocaleString()}` becomes `formatHome(amount, tripCurrency)`:

- `${totalBudgeted.toLocaleString()}` → `formatHome(totalBudgeted, tripCurrency)`
- `${totalActual.toLocaleString()}` → `formatHome(totalActual, tripCurrency)`
- `${Math.abs(remaining).toLocaleString()}` → `formatHome(Math.abs(remaining), tripCurrency)`
- `${item.actual.toLocaleString()}` → `formatHome(item.actual, tripCurrency)`
- `${item.budgeted.toLocaleString()}` → `formatHome(item.budgeted, tripCurrency)`
- `${itemDiff.toLocaleString()}` → `formatHome(itemDiff, tripCurrency)`
- `${Math.abs(itemDiff).toLocaleString()}` → `formatHome(Math.abs(itemDiff), tripCurrency)`
- `${expense.amount.toLocaleString()}` → `formatHome(expense.amount, tripCurrency)`

Note: Line numbers are approximate — search for all `$` patterns in template literals.

- [ ] **Step 3: Fix description strings in generateBudgetFromTrip**

The function (lines 144-177) embeds `$` in descriptions. Add a `formatAmount` parameter:

```typescript
// Before:
function generateBudgetFromTrip(trip: any): BudgetItem[]

// After:
function generateBudgetFromTrip(trip: any, formatAmount: (n: number, cur?: string) => string): BudgetItem[]
```

Also update both call sites (lines ~184 and ~188):
```typescript
// Before:
setBudgetData(generateBudgetFromTrip(null));
setBudgetData(generateBudgetFromTrip(trip));

// After:
setBudgetData(generateBudgetFromTrip(null, formatHome));
setBudgetData(generateBudgetFromTrip(trip, formatHome));
```

Inside the function, replace all `$${...}` in descriptions:
```typescript
{ id: 'h1', description: `${hotel?.name || 'Hotel'} (${duration} nights × ${formatAmount(hotel?.price ?? 0, tripCurrency)})`, amount: hotelPrice },
{ id: 'fd1', description: `~${formatAmount(Math.round(dailyFood), tripCurrency)}/day`, amount: 0 },
{ id: 't1', description: `~${formatAmount(Math.round(transport), tripCurrency)}/day`, amount: 0 },
```

- [ ] **Step 4: Verify typecheck passes**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/trip/[id]/budget/page.tsx
git commit -m "feat: wire home currency into standalone budget page"
```

---

## Chunk 4: Display Components — Activity, Hotel, Flight Cards

### Task 8: Wire home currency into card components

**Files:**
- Modify: `apps/web/components/itinerary/ActivityCardRenderer.tsx`
- Modify: `apps/web/components/itinerary/CalendarView.tsx` (if it renders costs)
- Modify: `apps/web/components/trip/TripSidebar.tsx` (if it renders budget)

For each component, search for where `costDisplay` or `priceDisplay` is rendered:

- [ ] **Step 1: Add useHomeCurrency import and hook call**

```typescript
import { useHomeCurrency } from '@travyl/shared'

// Inside the component:
const { format: formatHome } = useHomeCurrency()
```

- [ ] **Step 2: Replace costDisplay with formatHome using raw fields**

```typescript
// Replace:
<span>{activity.costDisplay}</span>
// With:
<span>{activity.cost != null ? formatHome(activity.cost, activity.costCurrency ?? undefined) : null}</span>
```

For missing `costCurrency` (null), `formatHome` will format without conversion (just formats the number in home currency).

- [ ] **Step 3: Verify typecheck passes**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit (one commit per component for easy rollback)**

```bash
git add apps/web/components/itinerary/ActivityCardRenderer.tsx
git commit -m "feat: wire home currency into activity cards"
# Then repeat for CalendarView.tsx and TripSidebar.tsx
```

---

### Task 9: Fix ComparisonAlternatives hardcoded `$`

**Files:**
- Modify: `apps/web/components/itinerary/ComparisonAlternatives.tsx`

> **Note:** This component uses `FlightOption` type (not `FlightViewModel`). Prices are nested: `flight.price.total`, `flight.price.base`, `flight.price.taxes`, `flight.baggage.checkedFee`, `flight.cancellation.changeFee`. All data is mock/empty arrays — low priority.

- [ ] **Step 1: Add useHomeCurrency and replace all `$` instances**

```typescript
import { useHomeCurrency } from '@travyl/shared'

const { format: formatHome } = useHomeCurrency()

// Replace patterns like:
<span>${flight.price.total}</span>
// With:
<span>{formatHome(flight.price.total)}</span>

// Same for: flight.price.base, flight.price.taxes, flight.baggage.checkedFee, flight.cancellation.changeFee
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/itinerary/ComparisonAlternatives.tsx
git commit -m "feat: replace hardcoded $ in ComparisonAlternatives with home currency"
```

---

## Chunk 5: Settings UI — Currency Picker

### Task 10: Create searchable currency picker component

**Files:**
- Create: `apps/web/components/settings/CurrencyPicker.tsx`
- Modify: `apps/web/app/(main)/profile/settings/page.tsx` (has `SettingsRow` with `TODO: Open currency picker` at ~line 103)

- [ ] **Step 1: Create the CurrencyPicker component**

```typescript
'use client'

import { useState, useMemo } from 'react'
import { useSettingsStore, CURRENCIES } from '@travyl/shared'

export function CurrencyPicker() {
  const currency = useSettingsStore((s) => s.currency)
  const setCurrency = useSettingsStore((s) => s.setCurrency)
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      CURRENCIES.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  )

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search currencies..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
      />
      <select
        value={currency}
        onChange={(e) => {
          setCurrency(e.target.value)
          setSearch('')
        }}
        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        size={10}
      >
        {filtered.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.code} — {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
```

Note: Style to match existing settings UI conventions. Check if the settings page uses a sheet/modal library and match that pattern.

- [ ] **Step 2: Wire into settings page at `apps/web/app/(main)/profile/settings/page.tsx`**

Find the `SettingsRow` for currency (~line 103, has `TODO: Open currency picker`). Add state and wire it:

```typescript
const [showCurrencyPicker, setShowCurrencyPicker] = useState(false)

// Replace the TODO SettingsRow:
<SettingsRow
  label="Home Currency"
  value={currency}
  onClick={() => setShowCurrencyPicker(true)}
/>

// Add the picker modal/sheet:
{showCurrencyPicker && (
  <CurrencyPickerModal onClose={() => setShowCurrencyPicker(false)} />
)}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/settings/CurrencyPicker.tsx apps/web/app/(main)/profile/settings/page.tsx
git commit -m "feat: add searchable currency picker for home currency setting"
```

---

## Chunk 6: Tests + Final Verification

### Task 11: Update currency utility tests

**Files:**
- Modify: `packages/shared/src/utils/currency.test.ts`

- [ ] **Step 1: Add tests for expanded currency support**

```typescript
import { describe, it, expect } from 'vitest'
import { convertToTripCurrency, formatBudgetAmount } from './currency'

describe('convertToTripCurrency', () => {
  it('returns amount unchanged when currencies match', () => {
    expect(convertToTripCurrency(100, 'USD', 'USD', { EUR: 0.92 })).toBe(100)
  })

  it('converts EUR to USD using rate', () => {
    expect(convertToTripCurrency(100, 'EUR', 'USD', { EUR: 0.92 })).toBeCloseTo(108.7, 1)
  })

  it('converts THB to USD using rate', () => {
    expect(convertToTripCurrency(1500, 'THB', 'USD', { THB: 35.1 })).toBeCloseTo(42.74, 1)
  })

  it('returns amount when rate is missing', () => {
    expect(convertToTripCurrency(100, 'XYZ', 'USD', { EUR: 0.92 })).toBe(100)
  })

  it('returns amount when rates are null', () => {
    expect(convertToTripCurrency(100, 'EUR', 'USD', null)).toBe(100)
  })
})

describe('formatBudgetAmount', () => {
  it('formats USD with symbol', () => {
    expect(formatBudgetAmount(42.74, 'USD')).toBe('$43')
  })

  it('formats EUR with symbol', () => {
    expect(formatBudgetAmount(100, 'EUR')).toBe('€100')
  })

  it('formats THB without throwing', () => {
    expect(() => formatBudgetAmount(1500, 'THB')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `cd packages/shared && npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/utils/currency.test.ts
git commit -m "test: update currency tests for expanded ISO 4217 support"
```

---

### Task 12: Full typecheck and manual smoke test

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: No errors across all workspaces

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new errors

- [ ] **Step 3: Manual smoke test**

1. Start the dev server: `npm run web`
2. Open a trip with activity/hotel/flight costs
3. Verify costs display in USD (default home currency)
4. Go to settings, change home currency to EUR
5. Return to the trip — verify all costs now show in EUR
6. Check the budget tab — verify totals are converted
7. Change home currency to THB — verify conversion works for a non-western currency
8. Disconnect network / block the exchange rate API — verify costs show in original currency with currency code

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```
