# Home Currency Conversion — Design Spec

**Date**: 2026-03-27
**Status**: Draft
**Branch**: `wip/exchange-rates`

## Problem

Trip costs (hotels, flights, activities, food) come in various local currencies (THB, EUR, JPY, etc.). Users want to see everything in their home currency so they can budget effectively. Currently the budget page hardcodes `$` (USD) and no conversion happens anywhere.

## Scope

Silent, implicit conversion — every price displays in the user's home currency. No manual conversion tool, no toggles, no "~$49" footnotes. Just the converted amount formatted correctly.

## Design

### 1. Data Layer — Currency Type + Rate Provider

**Currency type** (`settingsStore.ts`):
- `Currency` type changes from a union of 7 codes to `string` (any ISO 4217 3-letter code)
- Validation: check it's a 3-letter uppercase string, default to `'USD'`
- Add a `CURRENCIES` constant (~150 entries: `{ code, name, symbol }[]`) in `packages/shared/src/config/currencies.ts` for the picker UI
- The type is open-ended; the curated list is for the picker, not for restriction

**Rate provider swap** (`apps/web/app/api/exchange-rates/route.ts`):
- Replace Frankfurter API with `open.er-api.com` (free, no API key, 1500+ requests/month, supports 150+ currencies)
- Endpoint: `GET https://open.er-api.com/v6/latest/{base}`
- Response shape: `{ rates: { EUR: 0.92, THB: 35.1, ... } }`
- Keep 24h server-side cache via `CACHE_24H` — no change
- Fallback: if `open.er-api.com` is down, fall back to Frankfurter for supported currencies

**`useExchangeRates` hook**: no structural change. Queries the updated API route. Returns `{ rates, isLoading, error, refetch }`.

### 2. The `useHomeCurrency` Hook

**Location**: `packages/shared/src/hooks/useHomeCurrency.ts`

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
- `convert(amount, sourceCurrency)` — wraps `convertToTripCurrency`, returns original amount if rates aren't loaded or source === home currency
- `format(amount, sourceCurrency?)` — converts then formats with `Intl.NumberFormat` using the home currency. If conversion fails (no rate, API down), falls back to formatting in the source currency with its code visible (e.g. "THB 1,500")

**Usage pattern**: Any component does:
```ts
const { format } = useHomeCurrency()
format(1500, 'THB') // → '$45.32' (or 'THB 1,500' if rates haven't loaded)
```

### 3. Wiring Into Display Components

Conversion is a display concern only. Data in Supabase stays in its original currency. No schema changes.

**Budget page** (`apps/web/app/(trips-app)/trip/[id]/budget/page.tsx`):
- Replace hardcoded `$` + `toLocaleString()` with `useHomeCurrency().format(amount, sourceCurrency)`
- `generateBudgetFromTrip` — costs from `trip_context` come in local currency; conversion happens at display time, not storage time
- Budget amounts stored in original currency, displayed in home currency

**`useItineraryScreen` budget** (`packages/shared/src/hooks/useItineraryScreen.ts`):
- The `budget` memo currently uses `buildBudgetSummary` with `trip.currency`
- Swap to format with home currency via the hook
- Fallback path (computing from `trip_context` hotels) — same treatment

**Activity cards** (`ActivityCardRenderer`, `CalendarView`, etc.):
- Where `estimated_cost` is displayed, swap `formatCurrency(cost, activity.currency)` for `format(cost, activity.currency)` from `useHomeCurrency`

**Hotel cards** (`HotelListView`, `ComparisonAlternatives`):
- `format(hotel.price, hotel.currency)` instead of hardcoded formatting

**Flight cards**:
- `format(flight.price, flight.currency)`

**Trip overview/sidebar** (`TripSidebar`, `TripMagazineHero`):
- Budget display already uses `trip.currency` — swap to home currency formatting

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

**No currency on a cost item**: Activities with `currency: null` default to the trip's currency from `trip_context.quick_facts.currency`, then USD. If all missing, raw number.

**User changes currency mid-session**: React Query caches rates per base currency. On switch, new fetch fires. During load, stale rates still show (stale-while-revalidate). No flash of unconverted prices.

**Frankfurter removal**: Route rewritten for new provider. Frankfurter fully replaced.

## What Does NOT Change

- Supabase schema — no new tables, no column changes
- Data storage — all costs remain in their original currency
- Trip-level `currency` field — kept for informational purposes (e.g. "Local currency: THB")
- No new deployable infrastructure — no cron jobs, no edge functions, no DB caches

## Files Changed (Summary)

| File | Change |
|------|--------|
| `packages/shared/src/stores/settingsStore.ts` | Expand `Currency` type, update validation |
| `packages/shared/src/config/currencies.ts` | New file — `CURRENCIES` constant |
| `apps/web/app/api/exchange-rates/route.ts` | Swap Frankfurter for open.er-api.com |
| `packages/shared/src/hooks/useHomeCurrency.ts` | New file — thin conversion hook |
| `packages/shared/src/hooks/useExchangeRates.ts` | Minor — update if response shape differs |
| `apps/web/app/(trips-app)/trip/[id]/budget/page.tsx` | Wire `useHomeCurrency` |
| `packages/shared/src/hooks/useItineraryScreen.ts` | Wire home currency into budget memo |
| `apps/web/components/itinerary/ActivityCardRenderer.tsx` | Swap `formatCurrency` for `format` |
| `apps/web/components/itinerary/HotelListView.tsx` | Same |
| `apps/web/components/itinerary/CalendarView.tsx` | Same |
| `apps/web/components/trip/TripSidebar.tsx` | Same |
| Settings UI (wherever currency picker lives) | New searchable currency picker component |
| `packages/shared/src/index.ts` | Re-export `useHomeCurrency` |
