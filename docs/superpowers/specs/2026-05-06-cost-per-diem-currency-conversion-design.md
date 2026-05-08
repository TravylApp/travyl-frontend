# Cost Per Diem — Currency Conversion Design

## Goal

Show the Cost of Living section on the trip overview page with costs translated from the local currency (e.g., NPR) to the user's preferred currency (from settings), using live exchange rates.

## Background

The trip overview page (`apps/web/app/(dashboard)/trip/[id]/page.tsx`) already has a `CostOfLivingSection` component that displays daily cost estimates and individual prices in the local currency. The app already has:

- `useHomeCurrency()` hook (`packages/shared/src/hooks/useHomeCurrency.ts`) — reads user's currency preference from `useSettingsStore`, fetches live rates via `/api/exchange-rates`, provides `convert()` and `format()` utilities
- `/api/costliving` — returns daily budget estimates (low/mid/high) and item prices per country
- `/api/exchange-rates` — proxied exchange rate API

## Design

### Display: User currency as primary, local currency as secondary

When the user's preferred currency differs from the trip's local currency:

- **Primary**: converted amount in user's preferred currency (e.g., `$58 USD`)
- **Secondary**: original amount in local currency shown smaller and muted underneath (e.g., `≈1,045 NPR`)

When the user's currency matches the local currency, display as-is (no change from current behavior).

### Section heading

Add a small label indicating the conversion: `Cost of Living · in USD` when showing converted amounts. If no conversion is needed (same currency), keep the plain `Cost of Living` heading.

### Daily budget bands

```
┌──────────┬─────────────┬────────────┐
│  Budget   │  Mid-range   │  Luxury    │
│  $58 USD  │  $130 USD    │  $289 USD  │
│  ≈1,045   │  ≈2,352      │  ≈5,226    │
│   NPR     │   NPR        │   NPR      │
└──────────┴─────────────┴────────────┘
```

### Individual items (meals, coffee, etc.)

```
Meal prices shown with converted primary and local secondary:
┌────────────┬──────────────┐
│ Budget meal │ Mid-range    │
│  $11 USD   │  $36 USD     │
│  ≈203 NPR  │  ≈652 NPR    │
└────────────┴──────────────┘
```

## Changes

### Files modified

1. `apps/web/app/(dashboard)/trip/[id]/page.tsx` — single file change to `CostOfLivingSection` component

### CostOfLivingSection changes

The component will be upgraded from accepting `{ cost, currency }` to accepting `{ cost, localCurrency }` and internally using `useHomeCurrency()`:

```tsx
function CostOfLivingSection({
  cost,
  localCurrency,
}: {
  cost: NonNullable<TripContextData['cost_of_living']>;
  localCurrency?: string;
}) {
  const { currency: homeCurrency, format, isLoading } = useHomeCurrency();
  const needsConversion = localCurrency && localCurrency !== homeCurrency;
  // ...
}
```

- **Same currency**: render as before (direct format in local currency)
- **Different currency**: call `format(value, localCurrency)` to get converted + formatted string, then also render original local amount as secondary text

### No new files or dependencies

This is a pure enhancement to an existing component using existing infrastructure.

## Error handling

- If exchange rates haven't loaded yet (`isLoading`), show local currency only with a subtle "loading rates" indicator
- If rate lookup fails, show local currency only (graceful degradation — no broken UI)
- If local currency is unknown (no `currency` prop), no conversion attempted

## Future considerations

- The same conversion approach could be applied to the `CostOfLiving` display on the budget tab if needed
- Rate caching (24h stale time) is already handled by `useExchangeRates`
