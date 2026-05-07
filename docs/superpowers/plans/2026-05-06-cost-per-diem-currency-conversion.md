# Cost Per Diem Currency Conversion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Cost of Living section on trip overview pages from local currency to user's preferred currency using live exchange rates.

**Architecture:** Single-file change to `CostOfLivingSection` component in `apps/web/app/(dashboard)/trip/[id]/page.tsx`. Uses existing `useHomeCurrency()` hook (from `@travyl/shared`) which reads user currency preference from settingsStore and fetches live rates. When currencies differ, show converted amount as primary with local currency as secondary reference. When same currency, display as-is.

**Tech Stack:** Next.js 16, TypeScript, `@travyl/shared` (`useHomeCurrency`)

---

## Chunk 1: Core Implementation

### Task 1: Modify CostOfLivingSection in page.tsx

**File:** `apps/web/app/(dashboard)/trip/[id]/page.tsx`

**Changes needed:**

1. **Add import** for `useHomeCurrency` from `@travyl/shared`
2. **Rename prop** from `currency` to `localCurrency` on the component
3. **Add hook call** — `const { currency: homeCurrency, format, isLoading } = useHomeCurrency()`
4. **Add `needsConversion` flag** — `const needsConversion = !!(localCurrency && localCurrency !== homeCurrency)`
5. **Update section heading** — show `Cost of Living · in USD` when converting
6. **Update item formatting** — when converting, show converted value primarily + local value as secondary
7. **Update daily budget bands** — same dual-currency display
8. **Update call site** to pass `localCurrency={trip?.trip_context?.country?.currency?.code}` instead of `currency`

- [ ] **Step 1: Read current file to confirm line numbers**

Run: `wc -l apps/web/app/(dashboard)/trip/[id]/page.tsx`
Expected: large file (~900+ lines)

- [ ] **Step 2: Add useHomeCurrency import**

At line 13, add `useHomeCurrency` to the existing import from `@travyl/shared`:

```tsx
// Line 13 — add useHomeCurrency
import { useItineraryScreen, useWeather, useEvents, upscaleGoogleImage, supabase, useHomeCurrency } from '@travyl/shared';
```

- [ ] **Step 3: Update CostOfLivingSection props and add hook**

Replace the function signature and add the hook call and helper:

```tsx
function CostOfLivingSection({
  cost,
  localCurrency,
}: {
  cost: NonNullable<TripContextData['cost_of_living']>;
  localCurrency?: string;
}) {
  const { currency: homeCurrency, format, isLoading } = useHomeCurrency();
  const needsConversion = !!localCurrency && localCurrency !== homeCurrency && !isLoading;

  const fmtConverted = (v: number) => {
    if (needsConversion && localCurrency) {
      return format(v, localCurrency);
    }
    // Fallback: format in local currency directly
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency: localCurrency || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
    } catch { return `${localCurrency || 'USD'} ${v.toFixed(0)}`; }
  };

  const fmtLocal = (v: number) => {
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency: localCurrency || 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
    } catch { return `${localCurrency || 'USD'} ${v.toFixed(0)}`; }
  };
```

- [ ] **Step 4: Update section heading**

Replace:
```tsx
<h3 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white mb-4 font-serif">Cost of Living</h3>
```
With:
```tsx
<h3 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white mb-4 font-serif">
  Cost of Living
  {needsConversion && (
    <span className="text-sm font-normal opacity-50 ml-2">· in {homeCurrency}</span>
  )}
</h3>
```

- [ ] **Step 5: Update individual item cards**

Replace the item rendering block (lines 373-381) to show converted value + local secondary:

```tsx
{items.map(({ icon: Icon, label, value }) => (
  <div key={label} className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm p-3 text-center">
    <Icon size={16} className="mx-auto mb-1.5 text-[color:var(--trip-base)]" />
    <p className="text-[15px] font-bold text-gray-900 dark:text-white">{value}</p>
    {needsConversion && label.includes('meal') && localCurrency && (
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
        ≈{fmtLocal(cost[label.toLowerCase().replace(' ', '_') as keyof typeof cost] as number)}
      </p>
    )}
    <p className="text-[10px] text-gray-600 dark:text-gray-400 opacity-50">{label}</p>
  </div>
))}
```

Wait — the items array uses hardcoded `fmt(cost.meal_cheap)` etc. We need to rework this. The items array should use `fmtConverted` and we need to also store the original value for the local display.

Let me reconsider. The current code:

```tsx
const items = [
  { icon: UtensilsCrossed, label: 'Budget meal', value: fmt(cost.meal_cheap) },
  { icon: UtensilsCrossed, label: 'Mid-range meal', value: fmt(cost.meal_mid) },
  { icon: Coffee, label: 'Coffee', value: fmt(cost.coffee) },
  { icon: Beer, label: 'Beer', value: fmt(cost.beer) },
  { icon: Bus, label: 'Public transport', value: fmt(cost.public_transport) },
  { icon: Droplets, label: 'Water bottle', value: fmt(cost.water_bottle) },
];
```

We need to modify this to include the raw number and use converted formatting:

- [ ] **Step 6: Remove old fmt function and update items array**

Remove the old `fmt` helper (it becomes dead code once replaced) and define items array with raw values:

```tsx
// Remove this line (old fmt):
// const fmt = (v: number) => { ... }

// Replace with (already defined in step 3):
// const fmtConverted = ...
// const fmtLocal = ...
```

Replace the items array with one that includes raw values for local display:

```tsx
const items = [
  { icon: UtensilsCrossed, label: 'Budget meal', value: fmtConverted(cost.meal_cheap), raw: cost.meal_cheap },
  { icon: UtensilsCrossed, label: 'Mid-range meal', value: fmtConverted(cost.meal_mid), raw: cost.meal_mid },
  { icon: Coffee, label: 'Coffee', value: fmtConverted(cost.coffee), raw: cost.coffee },
  { icon: Beer, label: 'Beer', value: fmtConverted(cost.beer), raw: cost.beer },
  { icon: Bus, label: 'Public transport', value: fmtConverted(cost.public_transport), raw: cost.public_transport },
  { icon: Droplets, label: 'Water bottle', value: fmtConverted(cost.water_bottle), raw: cost.water_bottle },
];
```

And in the render, add the local secondary when converting:

```tsx
{items.map(({ icon: Icon, label, value, raw }) => (
  <div key={label} className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm p-3 text-center">
    <Icon size={16} className="mx-auto mb-1.5 text-[color:var(--trip-base)]" />
    <p className="text-[15px] font-bold text-gray-900 dark:text-white">{value}</p>
    {needsConversion && (
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">≈{fmtLocal(raw)}</p>
    )}
    <p className="text-[10px] text-gray-600 dark:text-gray-400 opacity-50">{label}</p>
  </div>
))}
```

- [ ] **Step 7: Update daily budget bands**

Replace the daily budget band rendering (lines 382-393) with dual-currency version:

```tsx
<div className="flex gap-2 mt-3 rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm">
  {[
    { label: 'Budget', range: fmtConverted(cost.daily_budget_low), raw: cost.daily_budget_low },
    { label: 'Mid-range', range: fmtConverted(cost.daily_budget_mid), raw: cost.daily_budget_mid },
    { label: 'Luxury', range: fmtConverted(cost.daily_budget_high), raw: cost.daily_budget_high },
  ].map(({ label, range, raw }, i) => (
    <div key={label} className="flex-1 py-3 text-center" style={i < 2 ? { borderRight: '1px solid rgba(0,0,0,0.08)' } : undefined}>
      <p className="text-[10px] uppercase tracking-wider font-semibold mb-1 text-gray-900 dark:text-white opacity-40">{label}</p>
      <p className="text-[16px] font-bold text-[color:var(--trip-base)]">{range}<span className="text-[11px] font-normal opacity-60">/day</span></p>
      {needsConversion && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">≈{fmtLocal(raw)}</p>
      )}
    </div>
  ))}
</div>
```

- [ ] **Step 8: Update the call site to pass localCurrency**

Replace line 869:
```tsx
<CostOfLivingSection cost={costData} currency={trip?.trip_context?.country?.currency?.code} />
```
With:
```tsx
<CostOfLivingSection cost={costData} localCurrency={trip?.trip_context?.country?.currency?.code} />
```

- [ ] **Step 9: Add loading indicator while rates fetch**

When `isLoading` is true and conversion is needed (currencies differ), show a subtle indicator in the heading:

```tsx
<h3 className="text-xl font-normal tracking-wide text-gray-900 dark:text-white mb-4 font-serif">
  Cost of Living
  {needsConversion && !isLoading && (
    <span className="text-sm font-normal opacity-50 ml-2">· in {homeCurrency}</span>
  )}
  {isLoading && localCurrency && localCurrency !== homeCurrency && (
    <span className="text-sm font-normal opacity-40 ml-2">· loading rates...</span>
  )}
</h3>
```

Note: Only the heading changes during loading — the prices continue showing in local currency (no flicker).

- [ ] **Step 10: Run typecheck**

Run: `npm run typecheck`
Expected: no type errors

- [ ] **Step 11: Run lint**

Run: `npm run lint`
Expected: no lint errors

- [ ] **Step 12: Commit**

```bash
git add apps/web/app/\(dashboard\)/trip/\[id\]/page.tsx
git commit -m "feat: convert cost of living to user's preferred currency on trip overview"
```
