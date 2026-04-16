# Home Currency Conversion — Design Spec

**Date**: 2026-03-27
**Status**: Draft
**Branch**: `wip/exchange-rates`

## Problem

Trip costs (hotels, flights, activities, food) come in various local currencies (THB, EUR, JPY, etc.). Users want to see everything in their home currency so they can budget effectively. Currently the budget page hardcodes `$` (USD) and no conversion happens anywhere.

## Scope

Silent, implicit conversion — every price displays in the user's home currency. No manual conversion tool, no toggles, no "~$49" footnotes. Just the converted amount formatted correctly.

**This iteration is web-only.** Mobile uses a different rate-fetching mechanism (Expo doesn't have Next.js API routes) and is deferred to a future iteration.

## Design

### 1. Data Layer — Currency Type + Rate Provider

**Currency type** (`settingsStore.ts`):
- `Currency` type changes from a union of 7 codes to `string` (any ISO 4217 3-letter code)
- Validation: check it's a 3-letter uppercase string, default to `'USD'`
- No migration needed — the existing 7 codes (USD, EUR, GBP, JPY, CAD, AUD, MXN) are all valid ISO 4217, so existing `profiles.preferences` values remain valid
- Add a `CURRENCIES` constant (~150 entries: `{ code, name, symbol }[]`) in `packages/shared/src/config/currencies.ts` for the picker UI
- The type is open-ended; the curated list is for the picker, not for restriction. The list does not need to be exhaustive — it covers common currencies, and users who need an uncommon one can enter its ISO code directly

**Rate provider swap** (`apps/web/app/api/exchange-rates/route.ts`):
- Replace Frankfurter API with `open.er-api.com` (free, no API key, 1500+ requests/month, supports 150+ currencies)
- Endpoint: `GET https://open.er-api.com/v6/latest/{base}`
- Response shape: `{ rates: { EUR: 0.92, THB: 35.1, ... } }` — same convention as Frankfurter (1 base = X foreign)
- Keep 24h server-side cache via `CACHE_24H` — no change
- Fallback: if `open.er-api.com` is down, fall back to Frankfurter for currencies it supports. For currencies not covered by Frankfurter (e.g. THB, VND), show original currency as described in Section 5

**`useExchangeRates` hook**: no structural change. Queries the updated API route. Returns `{ rates, isLoading, error, refetch }`.

### 2. The `useHomeCurrency` Hook

**Location**: `packages/shared/src/hooks/useHomeCurrency.ts`

> **Note**: This hook depends on `useExchangeRates` which fetches from a Next.js API route. Since this iteration is web-only, the hook is in shared but mobile will need a different rate-fetching strategy when it's wired up. The hook is safe to import from mobile (it won't crash at import time, only at fetch time), so no special guarding is needed now.

```ts
useHomeCurrency() → {
  currency: string          // user's home currency from settings store, e.g. 'USD'
  rates: Record<string, number> | null
  isLoading: boolean
  format: (amount: number, sourceCurrency?: string) => string
  convert: (amount: number, sourceCurrency: string) => number
}
```

**How it works**:
- Reads `currency` from `useSettingsStore`
- Calls `useExchangeRates(currency)` to get rates for that base
- `convert(amount, sourceCurrency)` — wraps the existing `convertToTripCurrency(amount, sourceCurrency, homeCurrency, rates)`. **Critical invariant**: the third argument must always equal the base currency used to fetch rates. Since `useExchangeRates` fetches with `currency` from the settings store, and we pass that same value as the target, the math (`amount / rates[sourceCurrency]`) correctly converts a foreign amount into the home currency
- `format(amount, sourceCurrency?)` — converts then formats with `Intl.NumberFormat` using the home currency. If conversion fails (no rate, API down), falls back to formatting in the source currency with its code visible (e.g. "THB 1,500")

**Usage pattern**: Any component does:
```ts
const { format } = useHomeCurrency()
format(1500, 'THB') // → '$45.32' (or 'THB 1,500' if rates haven't loaded)
```

### 3. Wiring Into Display Components

Conversion is a display concern only. Data in Supabase stays in its original currency. No schema changes.

There are **two separate budget display paths** that both need updating:

#### 3a. BudgetPanel (itinerary tab)

`apps/web/components/budget/BudgetPanel.tsx` already uses `useTripBudget(tripId, tripCurrency)` which converts per-item via `convertToTripCurrency`. The fix:
- Change `tripCurrency` from `trip?.currency ?? 'USD'` to the user's home currency from `useSettingsStore`
- `useTripBudget` already handles all conversion — just needs the right target currency
- `formatBudgetAmount(amount, tripCurrency)` in the component also needs to use the home currency

#### 3b. Budget page (standalone /budget route)

`apps/web/app/(dashboard)/trip/[id]/budget/page.tsx` uses local state with `generateBudgetFromTrip` and hardcoded `$` formatting. This is a significant change — there are ~15 distinct `$${...}` render locations throughout the 812-line component (lines 365, 381, 394, 463, 509, 533, 554, 558, 609, and more). Every instance must be replaced.

- Replace all `$${amount.toLocaleString()}` patterns with `useHomeCurrency().format(amount, sourceCurrency)`
- `generateBudgetFromTrip` — costs from `trip_context` come in the trip's local currency (from `trip?.currency` or `trip_context.quick_facts.currency`), not USD. The `$` prefix is a pre-existing bug. The source currency for all `generateBudgetFromTrip` amounts is the trip currency, and must be passed to `format()` so conversion is correct
- Description strings that embed `$` (e.g. `"${duration} nights × $${hotel?.price}"`, `"~$${Math.round(dailyFood)}/day"`) — replace `$` with the home currency symbol from `format()`

#### 3c. `useItineraryScreen` budget memo

`packages/shared/src/hooks/useItineraryScreen.ts` calls `buildBudgetSummary` which sums raw amounts without conversion. **Decision: pass `rates` and `homeCurrency` into `buildBudgetSummary`** — this is the smaller change and is consistent with how `useTripBudget` already works.

Fix:
- `buildBudgetSummary` receives `rates` and `homeCurrency` parameters and converts each item before summing (same `convertToTripCurrency` call pattern as `useTripBudget`)
- The fallback path at `useItineraryScreen.ts` lines 213-219 has hardcoded currency symbol logic (`const sym = currency === 'USD' ? '$' : ...`). Replace this with `Intl.NumberFormat` using the home currency, or delegate to `useHomeCurrency().format()`

#### 3d. ViewModels carry raw amounts

**Problem**: View models (`itineraryViewModel.ts`) pre-format costs as strings (`costDisplay: formatCurrency(...)`) — components can't re-convert.

**Fix**: Add raw `cost` and `costCurrency` fields to view model interfaces alongside `costDisplay`:
- `ActivityViewModel` gains `cost: number | null` and `costCurrency: string | null`
- `FlightViewModel` gains `price: number | null` and `priceCurrency: string | null`
- `HotelViewModel` gains `price: number | null` and `priceCurrency: string | null`
- Components that want to use `useHomeCurrency` format use the raw fields; components that don't can still use `costDisplay` (formatted in original currency)

#### 3e. Individual card components

With raw amounts now available in view models:

- **Activity cards** (`ActivityCardRenderer`, `CalendarView`): use `format(activity.cost, activity.costCurrency)` from `useHomeCurrency`
- **Hotel cards** (`HotelListView`, `ComparisonAlternatives`): use `format(hotel.price, hotel.priceCurrency)`
- **Flight cards**: use `format(flight.price, flight.priceCurrency)`
- **Trip overview/sidebar** (`TripSidebar`, `TripMagazineHero`): budget display uses home currency formatting
- **`ComparisonAlternatives`** has hardcoded `$` in multiple places — replace with `format()`
- **`HotelListView`** appears to be dead code (uses empty `HOTEL_SEARCH_RESULTS` array) — still update it for consistency but it's low priority

### 4. Settings UI — Currency Picker

**Where**: Existing settings/profile page

**What**: Searchable dropdown for home currency selection

**How**:
- `CURRENCIES` constant provides the full list (~150 entries with code, name, symbol)
- Searchable picker — type "Thai" or "THB", get filtered results
- On select, calls `setCurrency(code)` which updates store + persists to Supabase (already implemented)
- `useHomeCurrency` reactively picks up the change; all prices re-render in new currency

**Default**: USD (already the case in settingsStore). No auto-detection from locale.

### 5. Error Handling + Edge Cases

**Rate API down**: `format()` falls back to showing original currency code + amount (e.g. "THB 1,500"). No broken UI, no loading spinners on every price.

**Currency pair not available**: Same fallback. `convert()` returns unconverted amount, `format()` renders with source currency code.

**No currency on a cost item**: Activities with missing or empty `currency` (runtime possibility even though the type is `string`) default to the trip's currency from `trip_context.quick_facts.currency`, then USD. If all missing, raw number.

**User changes currency mid-session**: React Query caches rates per base currency. On switch, new fetch fires. During load, stale rates still show (stale-while-revalidate). No flash of unconverted prices.

**Frankfurter fallback gaps**: When `open.er-api.com` is down and Frankfurter doesn't support the currency pair, `format()` shows the original currency (same as API-down behavior).

### 6. Testing

- Update existing `packages/shared/src/utils/currency.test.ts` for the renamed/updated conversion function
- Add unit tests for `useHomeCurrency` conversion logic (pure function tests for the `convert` and `format` logic, extracted as testable utilities)
- Validate the `currencies.ts` constant — every entry has a 3-letter uppercase code, a name, and a symbol

## What Does NOT Change

- Supabase schema — no new tables, no column changes
- Data storage — all costs remain in their original currency
- Trip-level `currency` field — kept for informational purposes (e.g. "Local currency: THB")
- No new deployable infrastructure — no cron jobs, no edge functions, no DB caches
- Mobile app — deferred to a future iteration (Expo can't use Next.js API routes)

## Files Changed (Summary)

| File | Change |
|------|--------|
| `packages/shared/src/stores/settingsStore.ts` | Expand `Currency` type to `string`, update validation |
| `packages/shared/src/config/currencies.ts` | New file — `CURRENCIES` constant (~150 entries) |
| `apps/web/app/api/exchange-rates/route.ts` | Swap Frankfurter for open.er-api.com |
| `packages/shared/src/hooks/useHomeCurrency.ts` | New file — thin conversion hook |
| `packages/shared/src/hooks/useExchangeRates.ts` | Minor — update if response shape differs |
| `apps/web/app/(dashboard)/trip/[id]/budget/page.tsx` | Wire `useHomeCurrency`, fix `$` in description strings |
| `apps/web/components/budget/BudgetPanel.tsx` | Pass home currency to `useTripBudget` instead of trip currency |
| `packages/shared/src/hooks/useTripBudget.ts` | Accept home currency param (already converts per-item) |
| `packages/shared/src/hooks/useItineraryScreen.ts` | Wire home currency into budget memo, convert in `buildBudgetSummary` |
| `packages/shared/src/viewmodels/itineraryViewModel.ts` | Add raw `cost`/`costCurrency` fields to view models |
| `apps/web/components/itinerary/ActivityCardRenderer.tsx` | Use `format(cost, currency)` from `useHomeCurrency` |
| `apps/web/components/itinerary/HotelListView.tsx` | Same (low priority — may be dead code) |
| `apps/web/components/itinerary/ComparisonAlternatives.tsx` | Replace hardcoded `$` with `format()` |
| `apps/web/components/itinerary/CalendarView.tsx` | Use `format(cost, currency)` |
| `apps/web/components/trip/TripSidebar.tsx` | Same |
| `apps/web/components/trip/TripMagazineHero.tsx` | Same |
| Settings UI (wherever currency picker lives) | New searchable currency picker component |
| `packages/shared/src/index.ts` | Re-export `useHomeCurrency` |
| `packages/shared/src/utils/currency.test.ts` | Update tests |
